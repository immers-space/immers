'use strict'

const passport = require('passport')
const oauth2orize = require('oauth2orize')
const login = require('connect-ensure-login')
const request = require('request-promise-native')
const nodemailer = require('nodemailer')
const cors = require('cors')
const EasyNoPassword = require('easy-no-password').Strategy
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy
const authdb = require('./authdb')
const {
  domain,
  name,
  hub,
  smtpHost,
  smtpPort,
  smtpFrom,
  monetizationPointer,
  theme
} = require('../config.json')
const { easySecret, smtpUser, smtpPassword } = require('../secrets.json')
const emailCheck = require('email-validator')
const handleCheck = '^[A-Za-z0-9-]{3,32}$'
const nameCheck = '^[A-Za-z0-9 -]{3,32}$'
let transporter
if (process.env.NODE_ENV === 'production') {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword
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
    if (req.body && req.body.email) {
      return { stage: 1, username: req.body.email }
    } else if (req.query && req.query.username && req.query.token) {
      return { stage: 2, username: req.query.username, token: req.query.token }
    } else {
      return null
    }
  },
  // send email callback
  async function (email, token, done) {
    try {
      const user = await authdb.getUserByEmail(email)
      if (!user) { throw new Error('User not found') }
      const safeEmail = encodeURIComponent(email)
      const url = `https://${domain}/auth/reset?username=${safeEmail}&token=${token}`
      const info = await transporter.sendMail({
        from: `"${name}" <${smtpFrom}>`,
        to: user.email,
        subject: `${user.username}: your ${name} password reset link`,
        text: `${user.username}, please use this link to reset you ${name} profile password: ${url}`
      })
      if (process.env.NODE_ENV !== 'production') {
        console.log(nodemailer.getTestMessageUrl(info))
      }
      done()
    } catch (err) { done(err) }
  },
  // post-verification callback to get user for login
  function (email, done) {
    authdb.getUserByEmail(email)
      .then(user => done(null, user))
      .catch(done)
  }
))
// login password
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
  try {
    const { username, password, email } = req.body
    const user = await authdb.createUser(username, password, email)
    if (!user) {
      throw new Error('Unable to create user')
    }
    req.login(user, next)
  } catch (err) { next(err) }
}

function changePassword (req, res, next) {
  if (!req.user) {
    res.sendStatus(403)
  }
  if (!req.body.password) {
    res.status(400).send('Missing password')
  }
  authdb.setPassword(req.user.username, req.body.password)
    .then(ok => {
      if (!ok) throw new Error('Unable to change password')
      next()
    })
    .catch(next)
}

async function validateNewUser (req, res, next) {
  // check validity
  let validMessage = ''
  if (!emailCheck.validate(req.body.email)) {
    validMessage += 'Invalid email. '
  } else {
    req.body.email = req.body.email.toLowerCase()
  }

  if (!RegExp(handleCheck).test(req.body.username)) {
    validMessage += `Username must match ${handleCheck}. `
  } else {
    req.body.username = req.body.username.toLowerCase()
  }

  if (!RegExp(nameCheck).test(req.body.name)) {
    validMessage += `Display name must match ${nameCheck}. `
  }

  if (validMessage) {
    return res.status(400).format({
      text: () => res.send(validMessage),
      json: () => res.json({ error: validMessage })
    })
  }
  // check availability
  let availableMessage = ''
  if (await authdb.getUserByEmail(req.body.email)) {
    availableMessage += 'Email already registered. '
  }

  if (await authdb.getUserByName(req.body.username)) {
    availableMessage += 'Username already registered. '
  }

  if (availableMessage) {
    return res.status(409).format({
      text: () => res.send(availableMessage),
      json: () => res.json({ error: availableMessage, taken: true })
    })
  }

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

async function checkImmer (req, res, next) {
  if (!req.query.immer) { return res.status(400).send('Missing user handle') }
  try {
    const remoteDomain = req.query.immer
    if (remoteDomain.toLowerCase() === domain.toLowerCase()) {
      return res.json({ local: true })
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
  changePassword,
  changePasswordAndReturn: [
    login.ensureLoggedIn('/auth/login'),
    changePassword,
    returnTo
  ],
  validateNewUser,
  registerClient,
  checkImmer,
  registration: [
    registerUser,
    respondRedirect
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
      const data = {
        transactionId: request.oauth2.transactionID,
        username: request.user.username,
        clientName: request.oauth2.client.name,
        redirectUri: request.oauth2.client.redirectUri,
        name,
        monetizationPointer,
        ...theme
      }
      response.render('dist/dialog/dialog.html', data)
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

// misc utils
function respondRedirect (req, res) {
  let redirect = `https://${hub}`
  if (req.session && req.session.returnTo) {
    redirect = req.session.returnTo
    delete req.session.returnTo
  }
  return res.json({ redirect })
}

function returnTo (req, res) {
  let redirect = `https://${hub}`
  if (req.session && req.session.returnTo) {
    redirect = req.session.returnTo
    delete req.session.returnTo
  }
  res.redirect(redirect)
}
