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
const socketio = require('socket.io')
const request = require('request-promise-native')
const nunjucks = require('nunjucks')
const passport = require('passport')
const auth = require('./src/auth')
const AutoEncrypt = require('@small-tech/auto-encrypt')
const { onShutdown } = require('node-graceful-shutdown')
const { debugOutput, parseHandle } = require('./src/utils')
const { apex, createImmersActor, routes, onInbox, onOutbox } = require('./src/apex')

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
app.route('/auth/login')
  .get((req, res) => {
    const data = { name, domain, monetizationPointer, ...theme }
    if (req.session && req.session.handle) {
      Object.assign(data, parseHandle(req.session.handle))
      delete req.session.handle
    }
    res.render('dist/login/login.html', data)
  })
  .post(passport.authenticate('local', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/auth/login?passwordfail'
  }))
// find username & home from handle; if user is remote, get remote authorization url
app.get('/auth/home', auth.checkImmer)
// TODO:
// app.get('/auth/logout', routes.site.logout)
app.post('/auth/client', auth.registerClient)

app.post('/auth/forgot', passport.authenticate('easy'), (req, res) => {
  return res.json({ emailed: true })
})
app.route('/auth/reset')
  .get(passport.authenticate('easy'), (req, res) => {
    const data = { name, domain, monetizationPointer, ...theme }
    res.render('dist/reset/reset.html', data)
  })
  .post(auth.changePasswordAndReturn)

async function registerActor (req, res, next) {
  const preferredUsername = req.body.username
  const name = req.body.name
  try {
    const actor = await createImmersActor(preferredUsername, name)
    await apex.store.saveObject(actor)
    next()
  } catch (err) { next(err) }
}
app.post('/auth/user', auth.validateNewUser, auth.logout, registerActor, auth.registration)
// users are sent here from Hub to get access token, but it may interrupt with redirect
// to login and further redirect to login at their home immer if they are remote
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
app.get(routes.followers, auth.publ, apex.net.followers.get)
app.get(routes.following, auth.publ, apex.net.following.get)
app.get(routes.liked, auth.publ, apex.net.liked.get)
app.get(routes.collections, auth.publ, apex.net.collections.get)
app.get(routes.shares, auth.publ, apex.net.shares.get)
app.get(routes.likes, auth.publ, apex.net.likes.get)
app.get(routes.blocked, auth.priv, apex.net.blocked.get)
app.get(routes.rejections, auth.priv, apex.net.rejections.get)
app.get(routes.rejected, auth.priv, apex.net.rejected.get)
app.get('/.well-known/webfinger', apex.net.webfinger.get)

/// Custom side effects
app.on('apex-inbox', onInbox)
app.on('apex-outbox', onOutbox)

// custom c2s apis
async function friendsLocations (req, res, next) {
  const locals = res.locals.apex
  const actor = locals.target
  const inbox = actor.inbox[0]
  const followers = actor.followers[0]
  const rejected = apex.utils.nameToRejectedIRI(actor.preferredUsername)
  const friends = await apex.store.db.collection('streams').aggregate([
    {
      $match: {
        $and: [
          { '_meta.collection': inbox },
          // filter only pending follow requests
          { '_meta.collection': { $nin: [followers, rejected] } }
        ],
        type: { $in: ['Arrive', 'Leave', 'Accept', 'Follow'] }
      }
    },
    // most recent activity per actor
    { $sort: { _id: -1 } },
    { $group: { _id: '$actor', loc: { $first: '$$ROOT' } } },
    // sort actors by most recent activity
    { $sort: { _id: -1 } },
    { $replaceRoot: { newRoot: '$loc' } },
    { $sort: { _id: -1 } },
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
  apex.net.security.verifyAuthorization,
  apex.net.security.requireAuthorizedOrPublic,
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
const server = process.env.NODE_ENV === 'production'
  ? AutoEncrypt.https.createServer({ domains: [domain] }, app)
  : https.createServer(sslOptions, app)

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

// live stream of feed updates to client inbox-update goes to chat & friends-update to people list
const friendUpdateTypes = ['Arrive', 'Leave', 'Accept', 'Follow']
async function onInboxFriendUpdate (msg) {
  const liveSocket = profilesSockets.get(msg.recipient.id)
  msg.activity.actor = [msg.actor]
  msg.activity.object = [msg.object]
  // convert to same format as inbox endpoint and strip any private properties
  liveSocket?.emit('inbox-update', apex.stringifyPublicJSONLD(await apex.toJSONLD(msg.activity)))
  if (friendUpdateTypes.includes(msg.activity.type)) {
    liveSocket?.emit('friends-update')
  }
}
app.on('apex-inbox', onInboxFriendUpdate)

if (process.env.NODE_ENV !== 'production') {
  debugOutput(app)
}

client
  .connect({ useNewUrlParser: true })
  .then(() => {
    apex.store.db = client.db(dbName)
    // Place object representing this node
    const immer = {
      id: `https://${domain}/o/immer`,
      type: 'Place',
      name,
      url: `https://${hub}`,
      audience: apex.consts.publicAddress
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
    return server.listen(port, () => {
      console.log(`immers app listening on port ${port}`)
      // startup delivery in case anything is queued
      apex.startDelivery()
    })
  })

// clean shutdown required for autoencrypt
onShutdown(async () => {
  await client.close()
  await new Promise((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
  console.log('Immers server closed')
})
