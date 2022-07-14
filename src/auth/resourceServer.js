'use strict'
/**
 * Resource Server
 * Control access to local users' data and ability to post
 * activities on their behalf via access tokens granted via
 * local authorization server
 */
const passport = require('passport')
const login = require('connect-ensure-login')
const nodemailer = require('nodemailer')
const cors = require('cors')
// strategies for user authentication
const EasyNoPassword = require('easy-no-password').Strategy
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy

const overlaps = require('overlaps')
const authdb = require('./authdb')
const { scopes } = require('../../common/scopes')

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
  adminEmail
} = process.env
const hubs = hub.split(',')
const emailCheck = require('email-validator')
const handleCheck = '^[A-Za-z0-9-]{3,32}$'
const nameCheck = '^[A-Za-z0-9_~ -]{3,32}$'

/// exports ///
/** Dynamic CORS for logged-in users */
const hubCors = cors(dynamicCorsFromToken)
module.exports = {
  /** auth for private routes only accessible with user access token (e.g. outbox POST) */
  priv: [passport.authenticate('bearer', { session: false }), hubCors],
  /** auth for public routes that need dynamic cors and/or that can include additional private information (e.g. outbox GET) */
  publ: [passport.authenticate(['bearer', 'anonymous'], { session: false }), hubCors],
  /** like public but with wide-open CORS (user profile lookup from destinations) */
  open: [passport.authenticate(['bearer', 'anonymous'], { session: false }), cors()],
  /** auth for OAuth client / service account jwt login (e.g. in Authorization code grant) */
  clnt: passport.authenticate('oauth2-client-jwt', { session: false }),
  admn: [passport.authenticate('bearer', { session: false }), requireAdmin],
  scope,
  /** Require access to view private information */
  viewScope: scope(scopes.viewPrivate.name),
  /** Require access to view friends list */
  friendsScope: scope([scopes.viewPrivate.name, scopes.viewFriends.name]),
  /** token grant for logged-in local users in web views */
  localToken: [hubCors, localToken],
  /** terminate login session */
  logout: [hubCors, logout],
  /** for endpoints that behave differently for authorized requests */
  passIfNotAuthorized,
  requirePrivilege,
  userToActor,
  registerUser,
  changePassword,
  changePasswordAndReturn: [
    login.ensureLoggedIn('/auth/login'),
    changePassword,
    returnTo
  ],
  validateNewUser,
  registration: [registerUser, respondRedirect],
  returnTo
}

/// side effects ///
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

/// utils ///
/** Terminate login session */
function logout (req, res, next) {
  req.logout()
  next()
}
/** token grant for logged-in users in immers client */
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
/** Allow cors from remote immers if a token is granted, otherwise only local hubs */
function dynamicCorsFromToken (req, done) {
  // avoid error in URL constructor for server-to-server requests
  if (!req.header('Origin')) { return done(null, { origin: false }) }
  try {
    const origin = new URL(req.header('Origin')).host
    if (
      hubs.indexOf(origin) !== -1 ||
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
}

/** for endpoints that behave differently for authorized requests */
function passIfNotAuthorized (req, res, next) {
  if (!req.get('authorization')) {
    return next('route')
  }
  next()
}

/**
 * Middlware factory that requires the given prop is
 * present on the authenticated user document with a value
 * of true, responding 403 otherwise
 * @param  {string} propName
 * @returns {function} express middleware
 */
function requirePrivilege (propName) {
  return (req, res, next) => {
    if (!req.user?.[propName] === true) {
      return res.sendStatus(403)
    }
    next()
  }
}

/**
 * simple scoping limits acess to entire route by scope
 * @param  {string[]} scopeNames
 * @returns {function} express middlware
 */
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

function respondRedirect (req, res) {
  let redirect = `https://${hubs[0]}`
  if (req.session && req.session.returnTo) {
    redirect = req.session.returnTo
    delete req.session.returnTo
  }
  return res.json({ redirect })
}

function returnTo (req, res) {
  let redirect = `https://${hubs[0]}`
  if (req.session && req.session.returnTo) {
    redirect = req.session.returnTo
    delete req.session.returnTo
  }
  res.redirect(redirect)
}

async function requireAdmin (req, res, next) {
  const admin = await authdb.getUserByEmail(adminEmail)
  const isAdmin = admin?.username === req.user.username
  if (isAdmin) {
    next()
  } else {
    return res.sendStatus(403)
  }
}
