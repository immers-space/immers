'use strict'
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const express = require('express')
const session = require('express-session')
const MongoSessionStore = require('connect-mongodb-session')(session)
const cookieParser = require('cookie-parser')
const cors = require('cors')
const history = require('connect-history-api-fallback')
const { MongoClient } = require('mongodb')
const socketio = require('socket.io')
const requestRaw = require('request')
const request = require('request-promise-native')
const nunjucks = require('nunjucks')
const passport = require('passport')
const auth = require('./src/auth')
const AutoEncryptPromise = import('@small-tech/auto-encrypt')
const { onShutdown } = require('node-graceful-shutdown')
const morgan = require('morgan')
const { debugOutput, parseHandle, parseProxyMode, apexDomain } = require('./src/utils')
const { apex, createImmersActor, deliverWelcomeMessage, routes, onInbox, onOutbox, outboxPost } = require('./src/apex')
const { migrate } = require('./src/migrate')
const { scopes } = require('./common/scopes')

const {
  port,
  domain,
  hub,
  homepage,
  name,
  dbHost,
  dbPort,
  dbName,
  sessionSecret,
  keyPath,
  certPath,
  caPath,
  monetizationPointer,
  googleFont,
  backgroundColor,
  backgroundImage,
  customCSS,
  icon,
  imageAttributionText,
  imageAttributionUrl,
  emailOptInURL,
  emailOptInParam,
  emailOptInNameParam,
  systemUserName,
  systemDisplayName,
  welcome,
  proxyMode
} = process.env
let welcomeContent
if (welcome && fs.existsSync(path.join(__dirname, 'static-ext', welcome))) {
  // docker volume location
  welcomeContent = fs.readFileSync(path.join(__dirname, 'static-ext', welcome), 'utf8')
} else if (welcome && fs.existsSync(path.join(__dirname, 'static', welcome))) {
  // internal default
  welcomeContent = fs.readFileSync(path.join(__dirname, 'static', welcome), 'utf8')
}
const renderConfig = {
  name,
  domain,
  hub,
  homepage,
  monetizationPointer,
  googleFont,
  backgroundColor,
  backgroundImage,
  customCSS,
  icon,
  imageAttributionText,
  imageAttributionUrl,
  emailOptInURL
}
const mongoURI = `mongodb://${dbHost}:${dbPort}`
const app = express()

const client = new MongoClient(mongoURI)

nunjucks.configure({
  autoescape: true,
  express: app,
  watch: app.get('env') === 'development'
})

// parsers
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ type: ['application/json'].concat(apex.consts.jsonldTypes) }))
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status Accepts ":req[accept]" ":referrer" ":user-agent"'))
const sessionStore = new MongoSessionStore({
  uri: mongoURI,
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
    secure: true,
    // allow logged in requests from both immer and hub
    domain: apexDomain(domain)
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
    const data = Object.assign({}, renderConfig)
    if (req.session && req.session.handle) {
      Object.assign(data, parseHandle(req.session.handle))
      delete req.session.handle
    }
    if (req.session?.loginTab) {
      data.loginTab = req.session.loginTab
      delete req.session.loginTab
    }
    res.render('dist/login/login.html', data)
  })
  .post(passport.authenticate('local', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/auth/login?passwordfail'
  }))
// find username & home from handle; if user is remote, get remote authorization url
app.get('/auth/home', auth.checkImmer)
app.get('/auth/logout', auth.logout, (req, res) => res.redirect('/'))
app.post('/auth/logout', auth.logout, (req, res) => {
  return res.sendStatus(200)
})
app.post('/auth/client', auth.registerClient)

app.post('/auth/forgot', passport.authenticate('easy'), (req, res) => {
  return res.json({ emailed: true })
})
app.route('/auth/reset')
  .get(passport.authenticate('easy'), (req, res) => {
    res.render('dist/reset/reset.html', renderConfig)
  })
  .post(auth.changePasswordAndReturn)
/* redirect to an email opt-in form
 doing this here rather than client-side because the URL was
 troublesome to pass to the client via renderConfig due to sanitization
*/
app.get('/auth/optin', (req, res) => {
  if (!emailOptInURL) {
    return res.sendStatus(404)
  }
  const url = new URL(emailOptInURL)
  const search = new URLSearchParams(url.search)
  if (emailOptInParam && req.query.email) {
    search.set(emailOptInParam, req.query.email)
  }
  if (emailOptInNameParam && req.query.name) {
    search.set(emailOptInNameParam, req.query.name)
  }
  url.search = search
  res.redirect(url)
})

async function registerActor (req, res, next) {
  const preferredUsername = req.body.username
  const name = req.body.name
  try {
    const actor = await createImmersActor(preferredUsername, name)
    await apex.store.saveObject(actor)
    await deliverWelcomeMessage(actor, welcomeContent)
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
// token endpoint for immers web client
app.post('/auth/token', auth.localToken)

// AP routes
const viewAuth = auth.scope(scopes.viewPrivate.name)
const friendsAuth = auth.scope([scopes.viewPrivate.name, scopes.viewFriends.name])
app.route(routes.inbox)
  .get(auth.publ, viewAuth, apex.net.inbox.get)
  .post(auth.publ, apex.net.inbox.post)
app.route(routes.outbox)
  .get(auth.publ, viewAuth, apex.net.outbox.get)
  .post(auth.priv, outboxPost)
app.route(routes.actor)
  // open auth allows cross-origin fetching to support user discovery from destinations
  .get(auth.open, auth.scope(scopes.viewProfile.name), apex.net.actor.get)
app.get(routes.object, auth.publ, viewAuth, apex.net.object.get)
app.get(routes.activity, auth.publ, viewAuth, apex.net.activityStream.get)
app.get(routes.followers, auth.publ, friendsAuth, apex.net.followers.get)
app.get(routes.following, auth.publ, friendsAuth, apex.net.following.get)
app.get(routes.liked, auth.publ, viewAuth, apex.net.liked.get)
app.get(routes.collections, auth.publ, viewAuth, apex.net.collections.get)
app.get(routes.shares, auth.publ, viewAuth, apex.net.shares.get)
app.get(routes.likes, auth.publ, viewAuth, apex.net.likes.get)
app.get(routes.blocked, auth.priv, friendsAuth, apex.net.blocked.get)
app.get(routes.rejections, auth.priv, friendsAuth, apex.net.rejections.get)
app.get(routes.rejected, auth.priv, friendsAuth, apex.net.rejected.get)
app.get('/.well-known/webfinger', cors(), apex.net.webfinger.get)
app.get('/.well-known/nodeinfo', cors(), apex.net.nodeInfoLocation.get)
app.get('/nodeinfo/:version', cors(), apex.net.nodeInfo.get)

// CORS & AP proxy services
app.post('/proxy', auth.priv, apex.net.proxy.post)
app.get('/proxy/*', auth.publ, (req, res) => {
  const url = req.url.replace('/proxy/', '')
  requestRaw(url, {
    headers: {
      Accept: req.get('Accept') || '*/*'
    }
  }).pipe(res)
})

/// Custom side effects
app.on('apex-inbox', onInbox)
app.on('apex-outbox', onOutbox)

// custom c2s apis
const friendUpdateTypes = ['Arrive', 'Leave', 'Accept', 'Follow', 'Reject']
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
        type: { $in: friendUpdateTypes }
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
  // check content type first in case this is HTML request
  apex.net.validators.jsonld,
  auth.priv,
  friendsAuth,
  apex.net.validators.targetActor,
  apex.net.security.verifyAuthorization,
  apex.net.security.requireAuthorized,
  friendsLocations,
  apex.net.responders.result
])
// static files included in repo/docker image
app.use('/static', express.static('static'))
// static files added on deployed server
app.use('/static', express.static('static-ext'))
app.use('/dist', express.static('dist'))
app.get('/', (req, res) => {
  // logged in users go to their profile page
  res.redirect(
    req.user
      ? apex.utils.usernameToIRI(req.user.username)
      : `${req.protocol}://${homepage || hub}`
  )
})
// for SPA routing in activity pub pages
app.use(history({
  index: '/ap.html'
}))
// HTML versions of acitivty pub objects routes
app.get('/ap.html', auth.publ, (req, res) => {
  const data = {
    loggedInUser: req.user?.username
  }
  res.render('dist/ap/ap.html', Object.assign(data, renderConfig))
})

const sslOptions = {
  key: keyPath && fs.readFileSync(path.join(__dirname, keyPath)),
  cert: certPath && fs.readFileSync(path.join(__dirname, certPath)),
  ca: caPath && fs.readFileSync(path.join(__dirname, caPath))
}
migrate(mongoURI).catch((err) => {
  console.error('Unable to apply migrations: ', err.message)
  process.exit(1)
}).then(async () => {
  const { default: AutoEncrypt } = await AutoEncryptPromise
  let server
  if (process.env.NODE_ENV === 'production') {
    if (proxyMode) {
      server = http.createServer(app)
      app.set('trust proxy', parseProxyMode(proxyMode))
    } else {
      server = AutoEncrypt.https.createServer({ domains: [domain] }, app)
    }
  } else {
    server = https.createServer(sslOptions, app)
  }

  // streaming updates
  const profilesSockets = new Map()
  const io = socketio(server, {
    // we have to leave CORS open for preflight regardless, and tokens are required to connect,
    // so not really worth the effort to make CORS more specific
    cors: {
      origin: '*',
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true

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
    socket.on('disconnect', async (reason) => {
      console.log('socket disconnect: ', reason, socket.authorizedUserId)
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
  // clean shutdown required for autoencrypt
  onShutdown(async () => {
    await client.close()
    await new Promise((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()))
    })
    console.log('Immers server closed')
  })

  // server startup
  await client.connect()
  apex.store.db = client.db(dbName)
  // Place object representing this node
  const immer = await apex.fromJSONLD({
    id: `https://${domain}/o/immer`,
    type: 'Place',
    name,
    url: `https://${hub}`,
    audience: apex.consts.publicAddress
  })
  await apex.store.setup(immer)
  await auth.authdb.setup(apex.store.db)
  if (systemUserName) {
    apex.systemUser = await apex.createActor(
      systemUserName,
      systemDisplayName || systemUserName,
      name,
      icon && `https://${domain}/static/${icon}`,
      'Service'
    )
    await apex.store.db.collection('objects').findOneAndReplace(
      { id: apex.systemUser.id },
      apex.systemUser,
      {
        upsert: true,
        returnDocument: 'after'
      }
    )
  }
  server.listen(port, () => {
    console.log(`immers app listening on port ${port}`)
    // startup delivery in case anything is queued
    apex.startDelivery()
  })
})
