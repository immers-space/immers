'use strict'

const passport = require('passport')
const oauth2orize = require('oauth2orize')
const login = require('connect-ensure-login')
const request = require('request-promise-native')
const nodemailer = require('nodemailer')
const cors = require('cors')
const EasyNoPassword = require('easy-no-password').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy
const authdb = require('./authdb')
const { domain, name, hub, smtpHost, smptPort } = require('../config.json')
const { easySecret, smtpUser, smptPassword } = require('../secrets.json')
let transporter
if (process.env === 'production') {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smptPort,
    secure: smptPort === 465,
    auth: {
      user: smtpUser,
      pass: smptPassword
    }
  })
} else {
  nodemailer.createTestAccount().then(testAccount => {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    })
  })
}

// Configure route login/authorization options
passport.serializeUser(authdb.serializeUser)
passport.deserializeUser(authdb.deserializeUser)
// login via email
passport.use(new EasyNoPassword(
  { secret: easySecret },
  function (req) {
    // Check if we are in "stage 1" (requesting a token) or "stage 2" (verifying a token)
    if (req.body && req.body.username) {
      return { stage: 1, username: req.body.username }
    } else if (req.query && req.query.username && req.query.token) {
      return { stage: 2, username: req.query.username, token: req.query.token }
    } else {
      return null
    }
  },
  // send email callback
  async function (username, token, done) {
    try {
      const user = await authdb.getUserByName(username)
      if (!user) { throw new Error('User not found') }
      const url = `https://${domain}/auth/logintoken?username=${username}&token=${token}`
      const info = await transporter.sendMail({
        from: `"${name}" <noreply@${domain}>`,
        to: user.email,
        subject: `Your ${name} login link`,
        text: `Use this link to login ${url}`,
        html: `Use this link to login <a href="${url}">${url}</a>`
      })
      if (process.env !== 'production') {
        console.log(nodemailer.getTestMessageUrl(info))
      }
      done()
    } catch (err) { done(err) }
  },
  // post-verification callback to get user for login
  function (username, done) {
    authdb.getUserByName(username)
      .then(user => done(null, user))
      .catch(done)
  }
))
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
  // avoid error in URL constructor for server-to-server requests
  if (!req.header('Origin')) { return done(null, { origin: false }) }
  try {
    const origin = new URL(req.header('Origin')).host
    if (origin === hub) {
      return done(null, { origin: true, credentials: true })
    }
    if (req.authInfo && origin === new URL(req.authInfo.origin).host) {
      // CORS for authorized remote clients
      return done(null, { origin: true, credentials: true })
    }
    done(null, { origin: false })
  } catch (err) { done(err) }
})
// auth for public v. private routes, with cors enabled for client origins
const publ = [passport.authenticate(['bearer', 'anonymous'], { session: false }), hubCors]
const priv = [passport.authenticate('bearer', { session: false }), hubCors]

function logout (req, res, next) {
  req.logout()
  next()
}

function userToActor (req, res, next) {
  req.params.actor = req.user.username
  next()
}

async function registerUser (req, res, next) {
  if (!req.body.username || !req.body.email) {
    return res.status(400).send('Invalid username or password')
  }
  try {
    await authdb.createUser(req.body.username.toLowerCase(), req.body.email)
  } catch (err) {
    if (err.name === 'MongoError' && err.code === 11000) {
      return res.json({ taken: true })
    }
    next(err)
  }
  // pass to easy strategy for password email
  next()
}

async function registerClient (req, res, next) {
  let client
  if (!req.body.clientId || !req.body.redirectUri || !req.body.name) {
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
  if (!req.body.handle) { return res.status(400).send('Missing user handle') }
  try {
    const [, username, remoteDomain] = /@?([^@]+)@(.+)/.exec(req.body.handle)
    if (remoteDomain.toLowerCase() === domain.toLowerCase()) {
      // pass username to easy strategy for login email
      req.body.username = username
      return next()
    }
    let client = await authdb.getRemoteClient(remoteDomain)
    if (!client) {
      client = await request(`https://${remoteDomain}/auth/client`, {
        method: 'POST',
        body: {
          name,
          clientId: `https://${domain}/o/immer`,
          redirectUri: `https://${hub}`
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
  logout,
  userToActor,
  registerUser,
  registerClient,
  homeImmer,
  // new user registration followed by email login
  registration: [
    registerUser,
    passport.authenticate('easy'),
    (req, res) => { return res.json({ emailed: true }) }
  ],
  // new client authorization & token request
  authorization: [
    login.ensureLoggedIn('/auth/login'),
    server.authorization(authdb.validateClient, (client, user, scope, type, req, done) => {
      // Auto-approve
      if (client.isTrusted) {
        const params = {}
        const origin = new URL(req.redirectURI)
        params.origin = `${origin.protocol}//${origin.host}`
        // express protocol does not include colon
        params.issuer = `https://${domain}`
        return done(null, true, params)
      }
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
      // express protocol does not include colon
      params.issuer = `https://${domain}`
      done(null, params)
    })
  ]
}
