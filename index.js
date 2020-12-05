'use strict'
const fs = require('fs')
const path = require('path')
const https = require('https')
const express = require('express')
const session = require('express-session')
const MongoSessionStore = require('connect-mongodb-session')(session)
const cookieParser = require('cookie-parser')
const cors = require('cors')
const { MongoClient } = require('mongodb')
const ActivitypubExpress = require('activitypub-express')
const socketio = require('socket.io')
const request = require('request-promise-native')
const nunjucks = require('nunjucks')
const passport = require('passport')
const auth = require('./src/auth')

const {
  port,
  domain,
  hub,
  homepage,
  name,
  dbName,
  keyPath,
  certPath,
  caPath,
  monetizationPointer,
  theme
} = require('./config.json')
const { sessionSecret } = require('./secrets.json')
const app = express()
const routes = {
  actor: '/u/:actor',
  object: '/o/:id',
  activity: '/s/:id',
  inbox: '/inbox/:actor',
  outbox: '/outbox/:actor',
  followers: '/followers/:actor',
  following: '/following/:actor',
  liked: '/liked/:actor'
}
const apex = ActivitypubExpress({
  domain,
  actorParam: 'actor',
  objectParam: 'id',
  activityParam: 'id',
  routes,
  context: ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1']
  // context: ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1", `https://${domain}/ns`]
})
const client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true, useNewUrlParser: true })

nunjucks.configure({
  autoescape: true,
  express: app,
  watch: app.get('env') === 'development'
})

// parsers
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ type: ['application/json'].concat(apex.consts.jsonldTypes) }))
const sessionStore = new MongoSessionStore({
  uri: 'mongodb://localhost:27017',
  databaseName: dbName,
  collection: 'sessions',
  maxAge: 365 * 24 * 60 * 60 * 1000
})
app.use(session({
  secret: sessionSecret,
  resave: true,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    secure: true
  }
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(apex)
// cannot check authorized origins in preflight, so open to all
app.options('*', cors())

/// auth related routes
app.get('/auth/login', (req, res) => {
  const data = { name, domain, monetizationPointer, ...theme }
  res.render('dist/login.html', data)
})
// local users - send login email; remote users - find redirect url
app.post('/auth/login', auth.homeImmer, passport.authenticate('easy'), (req, res) => {
  return res.json({ emailed: true })
})
app.get('/auth/logintoken', passport.authenticate('easy', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/auth/login?tokenfail'
}))
// TODO:
// app.get('/auth/logout', routes.site.logout)
app.post('/auth/client', auth.registerClient)

async function registerActor (req, res, next) {
  const preferredUsername = req.body.username
  const name = req.body.name
  try {
    const actor = await apex.createActor(preferredUsername, name, 'immers profile')
    await apex.store.saveObject(actor)
    next()
  } catch (err) { next(err) }
}
app.post('/auth/user', auth.validateNewUser, auth.logout, registerActor, auth.registration)
app.get('/auth/authorize', auth.authorization)
app.post('/auth/decision', auth.decision)
// get actor from token
app.get('/auth/me', auth.priv, auth.userToActor, apex.net.actor.get)

// AP routes
app.route(routes.inbox)
  .get(auth.publ, apex.net.inbox.get)
  .post(auth.publ, apex.net.inbox.post)
app.route(routes.outbox)
  .get(auth.publ, apex.net.outbox.get)
  .post(auth.priv, apex.net.outbox.post)
app.route(routes.actor)
  .get(auth.publ, apex.net.actor.get)

app.get(routes.object, auth.publ, apex.net.object.get)
app.get(routes.activity, auth.publ, apex.net.activityStream.get)
app.get('/.well-known/webfinger', apex.net.webfinger.get)
/*
// schema extensions
const immersSchema = JSON.parse(fs.readFileSync("server/context.json"));
immersSchema["@context"].immers = `https://${domain}/ns#`;
app.get("/ns", function(req, res) {
  res.json(immersSchema);
});
console.log("setting custom loader");
// override fetching of some contexts
const nodeDocumentLoader = jsonld.documentLoaders.node();
const customLoader = async (url, options) => {
  console.log("custom loader");
  if (url.startsWith(`https://${domain}/ns`)) {
    console.log("cached context");
    return {
      contextUrl: null, // this is for a context via a link header
      document: immersSchema, // this is the actual document that was loaded
      documentUrl: url // this is the actual context URL after redirects
    };
  }
  // call the default documentLoader
  return nodeDocumentLoader(url);
};
jsonld.documentLoader = customLoader;
*/

// auto-accept follows
app.on('apex-inbox', async msg => {
  if (msg.activity.type !== 'Follow') return
  console.log(`${msg.actor} followed ${msg.recipient.id}`)
  const accept = await apex.buildActivity('Accept', msg.recipient.id, msg.actor, { object: msg.activity.id })
  const publishUpdatedFollowers = await apex.acceptFollow(msg.recipient, msg.activity)
  await apex.addToOutbox(msg.recipient, accept)
  return publishUpdatedFollowers()
})

// custom c2s apis
async function friendsLocations (req, res, next) {
  const locals = res.locals.apex
  const friends = await apex.store.db.collection('streams').aggregate([
    { $match: { '_meta.collection': locals.target.inbox[0], type: { $in: ['Arrive', 'Leave', 'Accept'] } } },
    { $sort: { _id: -1 } },
    { $group: { _id: '$actor', loc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$loc' } },
    { $lookup: { from: 'objects', localField: 'actor', foreignField: 'id', as: 'actor' } },
    { $project: { _id: 0, 'actor.publicKey': 0 } }
  ]).toArray()
  locals.result = {
    id: `https://${domain}${req.originalUrl}`,
    type: 'OrderedCollection',
    totalItems: friends.length,
    orderedItems: friends
  }
  next()
}
app.get('/u/:actor/friends', [
  auth.priv,
  apex.net.validators.jsonld,
  apex.net.validators.targetActor,
  friendsLocations,
  apex.net.responders.result
])

app.use('/static', express.static('static'))
app.use('/dist', express.static('dist'))
app.get('/', (req, res) => res.redirect(`${req.protocol}://${homepage || hub}`))
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, keyPath)),
  cert: fs.readFileSync(path.join(__dirname, certPath)),
  ca: caPath ? fs.readFileSync(path.join(__dirname, caPath)) : undefined
}
const server = https.createServer(sslOptions, app)

// streaming updates
const profilesSockets = new Map()
const io = socketio(server, {
  // currently has blanket approval for CORS on all requests
  // due to api limitation, future version (engine.io v4) will allow more CORS configuration
  origins: '*:*',
  // required to support authorization header over CORS
  handlePreflightRequest: (req, res) => {
    const headers = {
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      // preflight cors has to be wide open
      'Access-Control-Allow-Origin': req.headers.origin,
      'Access-Control-Allow-Credentials': true
    }
    res.writeHead(200, headers)
    res.end()
  }
})
io.use(function (socket, next) {
  passport.authenticate('bearer', function (err, user, info) {
    if (err) { return next(err) }
    if (!user) { return next(new Error('Not authorized')) }
    socket.authorizedUserId = apex.utils.usernameToIRI(user.username)
    profilesSockets.set(socket.authorizedUserId, socket)
    // for future use with fine-grained CORS origins
    socket.hub = info.origin
    next()
  })(socket.request, {}, next)
})
io.on('connection', socket => {
  socket.immers = {}
  socket.on('disconnect', async () => {
    if (socket.authorizedUserId) {
      profilesSockets.delete(socket.authorizedUserId)
    }
    if (socket.immers.outbox && socket.immers.leave) {
      request({
        method: 'POST',
        url: socket.immers.outbox,
        headers: {
          'Content-Type': apex.consts.jsonldOutgoingType,
          Authorization: socket.immers.authorization
        },
        json: true,
        simple: false,
        body: await apex.toJSONLD(socket.immers.leave)
      }).catch(err => console.log(err.message))
      delete socket.immers.leave
    }
  })
  socket.on('entered', msg => {
    socket.immers.outbox = msg.outbox
    socket.immers.leave = msg.leave
    socket.immers.authorization = msg.authorization
  })
})

function onInboxFriendUpdate (msg) {
  const type = msg.activity.type
  if (type === 'Arrive' || type === 'Leave' || type === 'Accept') {
    const liveSocket = profilesSockets.get(msg.recipient.id)
    if (liveSocket) {
      liveSocket.emit('friends-update')
    }
  }
}
app.on('apex-inbox', onInboxFriendUpdate)

client
  .connect({ useNewUrlParser: true })
  .then(() => {
    apex.store.db = client.db(dbName)
    // Place object representing this node
    const immer = {
      id: `https://${domain}/o/immer`,
      type: 'Place',
      name,
      url: `https://${hub}`
    }
    return apex.fromJSONLD(immer)
  })
  .then(immer => {
    return apex.store.setup(immer)
  })
  .then(() => {
    return auth.authdb.setup(apex.store.db)
  })
  .then(() => {
    return server.listen(port, () => console.log(`apex app listening on port ${port}`))
  })
