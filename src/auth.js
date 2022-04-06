'use strict'

const passport = require('passport')
const oauth2orize = require('oauth2orize')
const login = require('connect-ensure-login')
const request = require('request-promise-native')
const nodemailer = require('nodemailer')
const cors = require('cors')
const jwt = require('jsonwebtoken')
// strategies for user authentication
const EasyNoPassword = require('easy-no-password').Strategy
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy
// strategies for OAuth client authentication
const CustomStrategy = require('passport-custom').Strategy
// additional OAuth exchange protocols
const jwtBearer = require('oauth2orize-jwt-bearer').Exchange

const overlaps = require('overlaps')
const authdb = require('./authdb')
const {
  domain,
  name,
  hub,
  smtpHost,
  smtpPort,
  smtpFrom,
  smtpUser,
  smtpPassword,
  easySecret,
  monetizationPointer,
  googleFont,
  backgroundColor,
  backgroundImage,
  icon,
  imageAttributionText,
  imageAttributionUrl
} = process.env
const emailCheck = require('email-validator')
const { parseHandle } = require('./utils')
const handleCheck = '^[A-Za-z0-9-]{3,32}$'
const nameCheck = '^[A-Za-z0-9_~ -]{3,32}$'
const oauthJwtExchangeType = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
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
  }).catch(err => {
    console.warn(`nodemailer test service not available: ${err.message}`)
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
        to: email,
        subject: `${user.username}: your ${name} password reset link`,
        text: `${user.username}, please use this link to reset your ${name} profile password: ${url}`
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
// OAuth2 client login
passport.use('oauth2-client-jwt', new CustomStrategy(async (req, done) => {
  const rawToken = req.body?.assertion
  if (!rawToken) {
    return done(null, false, 'missing assertion body field')
  }
  authdb.authenticateClientJwt(rawToken, done)
}))

// Configure authorization server (grant access to remote clients)
const server = oauth2orize.createServer()
server.serializeClient(authdb.serializeClient)
server.deserializeClient(authdb.deserializeClient)
// Implicit grant
server.grant(oauth2orize.grant.token(authdb.createAccessToken))
// jwt bearer exchange for admin service accounts (2-Legged OAuth)
server.exchange(oauthJwtExchangeType, jwtBearer(
  // Authorize client token exchange request
  function authorizeClientJwt (client, jwtBearer, done) {
    const jwtRequires = { audience: `https://${domain}/o/immer`, maxAge: '1h' }
    jwt.verify(jwtBearer, client.jwtPublicKeyPem, jwtRequires, async (err, validated) => {
      if (err) {
        console.error(`2LO error verifying jwt: ${err.toString()}`)
        return done(null, false, 'invalid jwt')
      }
      if (!client.canControlUserAccounts) {
        return done(null, false, 403)
      }
      let user
      try {
        if (validated.sub) {
          const { username, immer } = parseHandle(validated.sub)
          if (immer !== domain) {
            throw new Error(`User ${validated.sub} not from this domain`)
          }
          user = await authdb.getUserByName(username)
        }
        if (!user) {
          throw new Error(`User ${validated.sub} not found`)
        }
      } catch (err) {
        console.log(`2LO failed user lookup: ${err}`)
        return done(null, false, 'invalid sub claim')
      }
      if (!validated.scope) {
        return done(null, false, 'missing scope claim')
      }
      const params = {}
      const origin = new URL(client.redirectUri)
      params.origin = `${origin.protocol}//${origin.host}`
      params.issuer = `https://${domain}`
      params.scope = validated.scope.split(' ')
      authdb.createAccessToken(client, user, params, done)
    })
  }))
// token grant for logged-in users in immers client
function localToken (req, res) {
  if (!req.user) {
    return res.sendStatus(401)
  }
  const client = { id: `https://${domain}/o/immer` }
  const done = (err, token) => {
    if (err) {
      return res.sendStatus(500)
    }
    res.send(token)
  }
  authdb.createAccessToken(client, req.user, { origin: `https://${domain}`, scope: ['*'] }, done)
}

// dynamic cors for oauth clients
const hubCors = cors(function (req, done) {
  // avoid error in URL constructor for server-to-server requests
  if (!req.header('Origin')) { return done(null, { origin: false }) }
  try {
    const origin = new URL(req.header('Origin')).host
    if (
      origin === hub ||
      // CORS for authorized remote clients
      (req.authInfo && origin === new URL(req.authInfo.origin).host)
    ) {
      return done(null, {
        origin: true,
        credentials: true,
        exposedHeaders: 'Location'
      })
    }
    done(null, { origin: false })
  } catch (err) { done(err) }
})
// auth for public v. private routes, with cors enabled for client origins
const publ = [passport.authenticate(['bearer', 'anonymous'], { session: false }), hubCors]
// like public but with wide-open CORS
const open = [passport.authenticate(['bearer', 'anonymous'], { session: false }), cors()]
const priv = [passport.authenticate('bearer', { session: false }), hubCors]
// simple scoping limits acess to entire route by scope
function scope (scopeNames) {
  let hasScope
  if (!Array.isArray(scopeNames)) {
    hasScope = authorizedScopes => authorizedScopes?.includes(scopeNames)
  } else {
    hasScope = authorizedScopes => authorizedScopes && overlaps(authorizedScopes, scopeNames)
  }
  return function scopeAuth (req, res, next) {
    if (!req.authInfo?.scope?.includes('*') && !hasScope(req.authInfo?.scope)) {
      res.locals.apex.authorized = false
    }
    // leave authorized undefined if has scope so apex still checks ownership
    next()
  }
}

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
  if (req.body.name && !RegExp(nameCheck).test(req.body.name)) {
    validMessage += `Display name must match ${nameCheck}. `
  } else if (!req.body.name) {
    // display name is optional in registration, default to username
    req.body.name = req.body.username
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
  let { username, immer } = req.query
  if (!(username && immer)) { return res.status(400).send('Missing user handle') }
  try {
    immer = immer.toLowerCase()
    username = username.toLowerCase()
    if (immer === domain.toLowerCase()) {
      return res.json({ local: true })
    }
    let client = await authdb.getRemoteClient(immer)
    if (!client) {
      client = await request(`https://${immer}/auth/client`, {
        method: 'POST',
        body: {
          name,
          clientId: `https://${domain}/o/immer`,
          redirectUri: `https://${hub}`
        },
        json: true
      })
      await authdb.saveRemoteClient(immer, client)
    }
    /* returnTo is /auth/authorize with client_id and redirect_uri for the destination immer
     * so users are sent home to login and authorize the destination immer as a client,
     * then come back the same room on the desination with their token
     */
    const url = new URL(`${req.protocol}://${immer}${req.session.returnTo || '/'}`)
    const search = new URLSearchParams(url.search)
    // handle may or may not be included depending on path here, ensure it is
    search.set('me', `${username}[${immer}]`)
    url.search = search.toString()
    return res.json({ redirect: url.toString() })
  } catch (err) { next(err) }
}

function stashHandle (req, res, next) {
  /* To save repeated handle entry, an immer can pass along handle when
   * redirecting for auth. Store it in session for access during login
   */
  if (req.query.me && req.session) {
    req.session.handle = req.query.me
  }
  if (req.query.tab && req.session) {
    req.session.loginTab = req.query.tab
  }
  next()
}

module.exports = {
  authdb,
  publ,
  open,
  priv,
  scope,
  localToken: [hubCors, localToken],
  logout: [hubCors, logout],
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
    stashHandle,
    login.ensureLoggedIn('/auth/login'),
    server.authorization(authdb.validateClient, (client, user, scope, type, req, done) => {
      // Auto-approve for home immer
      if (client.isTrusted) {
        const params = {}
        const origin = new URL(req.redirectURI)
        params.origin = `${origin.protocol}//${origin.host}`
        // express protocol does not include colon
        params.issuer = `https://${domain}`
        params.scope = ['*']
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
        preferredScope: request.oauth2.req.scope.join(' '),
        name,
        monetizationPointer,
        googleFont,
        backgroundColor,
        backgroundImage,
        icon,
        imageAttributionText,
        imageAttributionUrl
      }
      response.render('dist/dialog/dialog.html', data)
    }
  ],
  // process result of auth dialog form
  decision: [
    login.ensureLoggedIn(),
    server.decision((req, done) => {
      const params = {}
      const origin = new URL(req.oauth2.redirectURI)
      params.origin = `${origin.protocol}//${origin.host}`
      // express protocol does not include colon
      params.issuer = `https://${domain}`
      params.scope = req.body.scope?.split(' ') || []
      done(null, params)
    })
  ],
  tokenExchange: [
    passport.authenticate('oauth2-client-jwt', { session: false }),
    server.token(),
    server.errorHandler()
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
