'use strict'

const passport = require('passport')
const oauth2orize = require('oauth2orize')
const login = require('connect-ensure-login')
const request = require('request-promise-native')
const cors = require('cors')
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy
const authdb = require('./authdb')
const { domain, name, hub } = require('../config.json')

// Configure route login/authorization options
passport.serializeUser(authdb.serializeUser)
passport.deserializeUser(authdb.deserializeUser)
// login with username/password during authentication request
passport.use(new LocalStrategy(authdb.validateUser))
// token use
passport.use(new BearerStrategy(authdb.validateAccessToken))
// allow passthrough for routes with public info
passport.use(new AnonymousStrategy())

// Configure authorization server (grant access to remote clients)
const server = oauth2orize.createServer()
server.serializeClient(authdb.serializeClient)
server.deserializeClient(authdb.deserializeClient)
// Implicit grant only
server.grant(oauth2orize.grant.token(authdb.createAccessToken))

// dynamic cors for oauth clients
const hubCors = cors(function (req, done) {
  try {
    const origin = (req.header('Origin') || '').toLowerCase()
    if (origin === hub) {
      return done(null, { origin: true })
    }
    if (req.authInfo && origin === req.authInfo.origin) {
      return done(null, { origin: true })
    }
    done(null, { origin: false })
  } catch (err) { done(err) }
})
// auth for public v. private routes, with cors enabled for client origins
const publ = [passport.authenticate(['bearer', 'anonymous'], { session: false }), hubCors]
const priv = [passport.authenticate('bearer', { session: false }), hubCors]

function userToActor (req, res, next) {
  req.params.actor = req.user.username
  next()
}

async function registerUser (req, res, next) {
  let user
  if (!req.body.preferredUsername || !req.body.password) {
    return res.status(400).send('Invalid username or password')
  }
  try {
    user = await authdb.createUser(req.body.preferredUsername, req.body.password)
  } catch (err) {
    if (err.name === 'MongoError' && err.code === 11000) {
      return res.redirect(`${req.headers.referer}?taken`)
    }
    next(err)
  }
  req.login(user, err => {
    if (err) { return next(err) }
    const url = req.session.returnTo
    delete req.session.returnTo
    res.redirect(url || '/')
  })
}

async function registerClient (req, res, next) {
  let client
  if (!req.body.clientId || !req.body.redirectUri) {
    return res.status(400).send('Invalid clientId or redirectUri')
  }
  try {
    client = await authdb.createClient(req.body.clientId, req.body.redirectUri, req.body.name)
  } catch (err) {
    if (err.name === 'MongoError' && err.code === 11000) {
      return res.status(409).send('Client already registered')
    }
    next(err)
  }
  return res.json(client)
}

async function homeImmer (req, res, next) {
  if (!req.query.handle) { return res.status(400).send('Missing user handle') }
  try {
    const [, username, remoteDomain] = /@?([^@]+)@(.+)/.exec(req.query.handle)
    if (remoteDomain.toLowerCase() === domain.toLowerCase()) {
      // handle converted to local username
      return res.json({ username })
    }
    let client = await authdb.getRemoteClient(remoteDomain)
    if (!client) {
      client = await request(`https://${remoteDomain}/auth/client`, {
        method: 'POST',
        body: {
          name,
          clientId: `https://${domain}/o/immer`,
          redirectUri: `https://${hub}/hub.html`
        },
        json: true
      })
      await authdb.saveRemoteClient(remoteDomain, client)
    }
    return res.json({ redirect: `${req.protocol}://${remoteDomain}${req.session.returnTo || '/'}` })
  } catch (err) { next(err) }
}

module.exports = {
  authdb,
  publ,
  priv,
  userToActor,
  registerUser,
  registerClient,
  homeImmer,
  // new client authorization & token request
  authorization: [
    login.ensureLoggedIn('/auth/login'),
    server.authorization(authdb.validateClient, (client, user, done) => {
      // Auto-approve
      if (client.isTrusted) return done(null, true)
      // Otherwise ask user
      return done(null, false)
    }),
    (request, response) => {
      response.render('dialog.njk', { transactionId: request.oauth2.transactionID, user: request.user, client: request.oauth2.client })
    }
  ],
  // process result of auth dialog form
  decision: [
    login.ensureLoggedIn(),
    server.decision((req, done) => {
      // TODO: scopes
      const params = {}
      const origin = new URL(req.oauth2.redirectURI)
      params.origin = `${origin.protocol}//${origin.host}`
      done(null, params)
    })
  ]
}
