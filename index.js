'use strict'
require('dotenv-defaults').config()
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
const media = require('./src/media')
const AutoEncryptPromise = import('@small-tech/auto-encrypt')
const { onShutdown } = require('node-graceful-shutdown')
const morgan = require('morgan')
const { debugOutput, parseHandle, parseProxyMode, apexDomain } = require('./src/utils')
const { apex, createImmersActor, deliverWelcomeMessage, routes, onInbox, onOutbox, outboxPost } = require('./src/apex')
const clientApi = require('./src/clientApi.js')
const { migrate } = require('./src/migrate')
const { scopes } = require('./common/scopes')
const { generateMetaTags } = require('./src/openGraph')
const settings = require('./src/settings')
const { MongoAdapter } = require('./src/auth/openIdServerDb')
const adminApi = require('./src/adminApi.js')
const SocketManager = require('./src/streaming/SocketManager')

const {
  port,
  domain,
  hub,
  homepage,
  name,
  dbHost,
  dbPort,
  dbName,
  dbString,
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
  proxyMode,
  enablePublicRegistration
} = process.env
let welcomeContent
if (welcome && fs.existsSync(path.join(__dirname, 'static-ext', welcome))) {
  // docker volume location
  welcomeContent = fs.readFileSync(path.join(__dirname, 'static-ext', welcome), 'utf8')
} else if (welcome && fs.existsSync(path.join(__dirname, 'static', welcome))) {
  // internal default
  welcomeContent = fs.readFileSync(path.join(__dirname, 'static', welcome), 'utf8')
}
const hubs = hub.split(',')
const renderConfig = {
  name,
  domain,
  hub: hubs,
  homepage,
  monetizationPointer,
  googleFont,
  backgroundColor,
  backgroundImage,
  customCSS,
  icon,
  imageAttributionText,
  imageAttributionUrl,
  emailOptInURL,
  enablePublicRegistration
}

// fallback to building string from parts for backwards compat
const mongoURI = dbString || `mongodb://${dbHost}:${dbPort}/${dbName}`
const app = express()

const client = new MongoClient(mongoURI)

nunjucks.configure({
  autoescape: true,
  express: app,
  watch: app.get('env') === 'development'
})

/// sessions, logging, core middlwares ///
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status Accepts ":req[accept]" ":referrer" ":user-agent"'))
const sessionStore = new MongoSessionStore({
  uri: mongoURI,
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

/// oidc-provider wants to do its own parsing, so mount it before parsers ///
app.get('/.well-known/openid-configuration', (req, res, next) => {
  // correct for openid-provider mounting well-known under subpath
  req.url = '/oidc/.well-known/openid-configuration'
  next('route')
})
// OIDC provider is still WIP, immer-to-immer login remains on legacy OAuth 2.0
// app.use('/oidc', auth.oidcServerRouter)

/// parsers ///
app.use(cookieParser()) // TODO - this might be unnecesary with express-session
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ type: ['application/json'].concat(apex.consts.jsonldTypes) }))

/// auth related routes ///
// route for getting a login session cookie with controlled accounts
app.post(
  '/auth/login',
  auth.passIfNotAuthorized,
  auth.controlledAccountLogin
)
// routes for normal user login
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

/**
 * @openapi
 *  /auth/home:
 *    get:
 *    summary: Find a user's home authorization server
 *    descripion: Identifies home server from user handle, registers a client with that server if needed, and returns an authorization url
 *    responses:
 *    200:
 *      description: object with result info
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              local:
 *                type: boolean
 *                description: is this user local to this Immers Server?
 *              redirect:
 *                type: string
 *                description: URL you need to redirect the user to in order to authorize with their remote home server
 */
app.get('/auth/home', auth.checkImmer)
app.get('/auth/logout', auth.logout, (req, res) => res.redirect('/'))
app.post('/auth/logout', auth.logout, (req, res) => {
  return res.sendStatus(200)
})
app.post('/auth/client', settings.isTrue('enableClientRegistration'), auth.registerClient)

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
app.get('/auth/return', auth.handleOAuthReturn)

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

// user registration
const register = [auth.validateNewUser, auth.logout, registerActor, auth.registerUser]
// authorized service account user regisration
app.post(
  '/auth/user',
  auth.passIfNotAuthorized,
  auth.authorizeServiceAccount,
  register,
  auth.respondRedirect
)
// public user registration, if enabled
app.post('/auth/user', settings.isTrue('enablePublicRegistration'), register, auth.respondRedirect)
// complete registration started via oidc identity provider
app.route('/auth/oidc-interstitial')
  .get((req, res) => res.render('dist/oidc-interstitial/oidc-interstitial.html', renderConfig))
  .post(auth.oidcPreRegister, register, auth.oidcPostRegister, auth.respondRedirect)

/**
 * @openapi
 * /auth/oidc-providers:
 *  get:
 *    summary: OpenId provider listing
 *    description: Retreive data necessary to display other provider login buttons
 *    responses:
 *      200:
 *        description: All clients requiting discrete login buttons
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  domain:
 *                    type: string
 *                    description: OIDC provider domain, pass as 'immer' param to /auth/home to trigger OIDC login
 *                  buttonIcon:
 *                    type: string
 *                    description: url of icon to display
 *                  buttonLabel:
 *                    type: string
 *                    description: text to to display next to icon
 *                required:
 *                  - domain
 */
app.get('/auth/oidc-providers', auth.oidcLoginProviders)

// users are sent here from Hub to get access token, but it may interrupt with redirect
// to login and further redirect to login at their home immer if they are remote
app.get('/auth/authorize', auth.authorization)
app.post('/auth/decision', auth.decision)
app.post('/auth/exchange', auth.tokenExchange)
// get actor from token
app.get('/auth/me', auth.priv, auth.userToActor, apex.net.actor.get)
// token endpoint for immers web client
app.post('/auth/token', auth.localToken)

// AP routes
app.route(routes.inbox)
  .get(auth.publ, auth.viewScope, apex.net.inbox.get)
  .post(auth.publ, apex.net.inbox.post)
app.route(routes.outbox)
  .get(auth.publ, auth.viewScope, apex.net.outbox.get)
  .post(auth.priv, outboxPost)
app.route(routes.actor)
  // open auth allows cross-origin fetching to support user discovery from destinations
  .get(auth.open, auth.scope(scopes.viewProfile.name), apex.net.actor.get)
app.get(routes.object, auth.publ, auth.viewScope, apex.net.object.get)
app.get(routes.activity, auth.publ, auth.viewScope, apex.net.activityStream.get)
app.get(routes.followers, auth.publ, auth.friendsScope, apex.net.followers.get)
app.get(routes.following, auth.publ, auth.friendsScope, apex.net.following.get)
app.get(routes.liked, auth.publ, auth.viewScope, apex.net.liked.get)
app.get(routes.collections, auth.publ, auth.viewScope, apex.net.collections.get)
app.get(routes.shares, auth.publ, auth.viewScope, apex.net.shares.get)
app.get(routes.likes, auth.publ, auth.viewScope, apex.net.likes.get)
app.get(routes.blocked, auth.priv, auth.friendsScope, apex.net.blocked.get)
app.get(routes.rejections, auth.priv, auth.friendsScope, apex.net.rejections.get)
app.get(routes.rejected, auth.priv, auth.friendsScope, apex.net.rejected.get)

// metadata & discovery routes
/* OIDC server is WIP
app.get(
  '/.well-known/webfinger',
  auth.oidcWebfingerPassIfNotIssuer,
  cors(),
  apex.net.wellKnown.parseWebfinger,
  apex.net.validators.targetActor,
  auth.oidcWebfingerRespond
)
*/
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
    },
    timeout: 5000
  }).on('error', function (err) {
    console.log('proxy error', err)
    res.sendStatus(500)
  }).pipe(res)
})

// file upload
app.use('/media', media.router)

/// Custom side effects
app.on('apex-inbox', onInbox)
app.on('apex-outbox', onOutbox)
app.on('apex-inbox', media.fileCleanupOnDelete)
app.on('apex-outbox', media.fileCleanupOnDelete)

app.use(clientApi.router)
app.use(adminApi.router)
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
      : `${req.protocol}://${homepage || hubs[0]}`
  )
})

// for SPA routing in activity pub pages
app.use(history({
  index: '/ap.html'
}))
// HTML versions of acitivty pub objects routes
app.get('/ap.html', auth.publ, generateMetaTags, (req, res) => {
  const data = {
    loggedInUser: req.user?.username,
    ...res.locals.openGraph
  }
  res.render('dist/ap/ap.html', Object.assign(data, renderConfig))
})

// final fallback to static content
// useful for immers + static site combo so they don't have to include /static in all page urls
app.use('/', express.static('static-ext'))

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
  const profilesSockets = new SocketManager()
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
      profilesSockets.get(socket.authorizedUserId).add(socket)
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
        profilesSockets.get(socket.authorizedUserId).delete(socket)
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
  const friendUpdateTypes = ['Arrive', 'Leave', 'Accept', 'Follow', 'Reject', 'Undo', 'Block']
  async function onInboxFriendUpdate (msg) {
    const liveSockets = profilesSockets.get(msg.recipient.id)
    msg.activity.actor = [msg.actor]
    msg.activity.object = [msg.object]
    // convert to same format as inbox endpoint and strip any private properties
    liveSockets.emitAll('inbox-update', apex.stringifyPublicJSONLD(await apex.toJSONLD(msg.activity)))
    if (friendUpdateTypes.includes(msg.activity.type)) {
      liveSockets.emitAll('friends-update')
    }
  }
  app.on('apex-inbox', onInboxFriendUpdate)

  // live stream of feed updates to client outbox-update goes to chat & friends-update to people list
  async function onOutboxFriendUpdate (msg) {
    const liveSockets = profilesSockets.get(msg.actor.id)
    msg.activity.actor = [msg.actor]
    msg.activity.object = [msg.object]
    // convert to same format as inbox endpoint and strip any private properties
    liveSockets.emitAll('outbox-update', apex.stringifyPublicJSONLD(await apex.toJSONLD(msg.activity)))
    if (friendUpdateTypes.includes(msg.activity.type)) {
      liveSockets.emitAll('friends-update')
    }
    // live updates for addition/removal from blocklist
    if (msg.activity.type === 'Block' || (msg.activity.type === 'Undo' && msg.object?.type === 'Block')) {
      liveSockets.emitAll('blocked-update')
    }
  }
  app.on('apex-outbox', onOutboxFriendUpdate)

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
  apex.store.db = client.db()
  await MongoAdapter.Initialize(apex.store.db)
  const iconUrl = icon && `https://${domain}/static/${icon}`
  // Place object representing this node
  const place = {
    id: `https://${domain}/o/immer`,
    type: 'Place',
    name,
    url: `https://${hubs[0]}`,
    audience: apex.consts.publicAddress
  }
  if (icon) {
    place.icon = iconUrl
  }
  const immer = await apex.fromJSONLD(place)
  await apex.store.setup(immer)
  await auth.authdb.setup(apex.store.db)
  if (systemUserName) {
    apex.systemUser = await createImmersActor(
      systemUserName,
      systemDisplayName || systemUserName,
      name,
      iconUrl,
      'Service'
    )
    await apex.store.db.collection('users').findOneAndUpdate(
      { email: null },
      { $set: { username: systemUserName, email: null } },
      { upsert: true }
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
  try {
    const pluginsRoot = path.join(__dirname, 'static-ext', 'immers-plugins', 'index.js')
    if (fs.existsSync(pluginsRoot)) {
      const plugins = await import(pluginsRoot)
      await Promise.resolve(plugins.default(app, immer, apex))
    }
  } catch (err) {
    console.warn('Error loading plugins', err)
  }
  server.listen(port, () => {
    console.log(`immers app listening on port ${port}`)
    // put back online if was offline for migration
    apex.offlineMode = false
    // startup delivery in case anything is queued
    apex.startDelivery()
  })
})
