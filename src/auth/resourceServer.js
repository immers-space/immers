'use strict'
/**
 * Resource Server
 * Control access to local users' data and ability to post
 * activities on their behalf via access tokens granted via
 * local authorization server
 */
const { appSettings } = require('../settings')
const passport = require('passport')
const login = require('connect-ensure-login')
const nodemailer = require('nodemailer')
const cors = require('cors')
const easyNoPasswordLibrary = require('easy-no-password')
// strategies for user authentication
const EasyNoPasswordStrategy = easyNoPasswordLibrary.Strategy
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy

const overlaps = require('overlaps')
const authdb = require('./authdb')
const { scopes } = require('../../common/scopes')

const {
  domain,
  name,
  hubs,
  passEmailToHub,
  smtpHost,
  smtpPort,
  smtpFrom,
  smtpUser,
  smtpPassword,
  smtpClient,
  smtpKey,
  easySecret
} = appSettings
const easyNoPassword = easyNoPasswordLibrary(easySecret)
const emailCheck = require('email-validator')
const { USER_ROLES } = require('./consts')
const handleCheck = '^[A-Za-z0-9-]{3,32}$'
const nameCheck = '^[A-Za-z0-9_~ -]{3,32}$'

/// exports ///
/** Dynamic CORS for logged-in users */
const hubCors = cors(dynamicCorsFromToken)
const clnt = passport.authenticate('oauth2-client-jwt', { session: false })
module.exports = {
  /** auth for private routes only accessible with user access token (e.g. outbox POST) */
  priv: [passport.authenticate('bearer', { session: false }), hubCors],
  /** auth for public routes that need dynamic cors and/or that can include additional private information (e.g. outbox GET) */
  publ: [passport.authenticate(['bearer', 'anonymous'], { session: false }), hubCors],
  /** like public but with wide-open CORS (user profile lookup from destinations) */
  open: [passport.authenticate(['bearer', 'anonymous'], { session: false }), cors()],
  /** auth for OAuth client / service account jwt login (e.g. in Authorization code grant) */
  clnt,
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
  /** Check permission to control user */
  authorizeServiceAccount: [
    clnt,
    requirePrivilege('canControlUserAccounts')
  ],
  /** Create login session for user via controlled account  */
  controlledAccountLogin: [
    clnt,
    proxyLogin
  ],
  oidcLoginProviders: [hubCors, oidcLoginProviders],
  oidcSendProviderApprovalEmail,
  oidcProcessProviderApproved,
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
  returnTo,
  respondRedirect
}

/// side effects ///
let transporter
if (process.env.NODE_ENV === 'production') {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465 || smtpPort === '465',
    auth: smtpClient
      ? {
          type: 'OAuth2',
          user: smtpUser,
          serviceClient: smtpClient,
          privateKey: smtpKey
        }
      : {
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
passport.use('easy', new EasyNoPasswordStrategy(
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
        html: `${user.username}, please use this link to reset your ${name} profile password: <a href="${url}">${url}</a>`,
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
  req.logout(next)
}
/**
 * Get a login session cookie for a controlled account,
 * jwt `sub` claim contains handle
 */
async function proxyLogin (req, res, next) {
  const client = req.user // set via oauth2-client-jwt authentication
  // re-validate the jwt because control requires authorization in addition to authentication
  const token = req.get('authorization')?.split('Bearer ')[1]
  let user
  let validatedPayload
  try {
    ({ user, validatedPayload } = await authdb.authorizeAccountControl(client, token))
  } catch (err) {
    next(err)
  }
  if (!user) {
    return res.sendStatus(404)
  }
  if (validatedPayload.scope !== '*') {
    return res.status(403).send('insufficient scope')
  }
  // create a login session and set-cookie header
  req.login(user, (err) => {
    if (err) {
      return next(err)
    }
    res.sendStatus(200)
  })
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

/** List OpenId providers that should have custom login buttons */
function oidcLoginProviders (req, res, next) {
  authdb.getOidcLoginProviders().then(providers => {
    res.json(providers)
  }).catch(next)
}

/** User authorization request to add a new OIDC provider to existing account */
async function oidcSendProviderApprovalEmail (req, res, next) {
  let email, providerDomain, providerName, username
  try {
    ;({ email, providerDomain, providerName, username } = req.session.oidcClientState)
  } catch {
    const err = new Error('Invalid OpenID state: missing email or provider')
    err.status = 403
    return next(err)
  }
  try {
    const token = await new Promise((resolve, reject) => {
      easyNoPassword.createToken(`${username}${providerDomain}`, (err, token) => {
        if (err) {
          return reject(err)
        }
        resolve(token)
      })
    })
    const search = new URLSearchParams({
      username,
      provider: providerDomain,
      token
    })
    const url = `https://${domain}/auth/oidc-merge/approve?${search}`
    const providerText = providerName
      ? `${providerName} (${providerDomain})`
      : providerDomain
    const info = await transporter.sendMail({
      from: `"${name}" <${smtpFrom}>`,
      to: email,
      subject: `${username}: your ${name} login authorization link`,
      html: `${username}, we received a request to authorize ${providerText} to login to your ${name} account. If this was you, please use this link to approve the request: <a href="${url}">${url}</a>`,
      text: `${username}, we received a request to authorize ${providerText} to login to your ${name} account. If this was you, please use this link to approve the request: ${url}`
    })
    if (process.env.NODE_ENV !== 'production') {
      console.log(nodemailer.getTestMessageUrl(info))
    }
  } catch (err) {
    console.error(err)
    return next(new Error('Error sending OIDC merge authorization email'))
  }
  next()
}

/** Process user authorization for OIDC provider */
async function oidcProcessProviderApproved (req, res, next) {
  const token = req.query.token
  const username = req.query.username
  const providerDomain = req.query.provider
  if (!username || !providerDomain) {
    const err = new Error('Invalid OpenID State')
    err.status = 403
    return next(err)
  }
  try {
    const isValid = await new Promise((resolve, reject) => {
      easyNoPassword.isValid(
        token,
        `${username}${providerDomain}`,
        (error, isValid) => error ? reject(error) : resolve(isValid)
      )
    })
    if (isValid) {
      await authdb.updateUserOidcProvider(username, providerDomain, false)
    } else {
      console.warn(`Unauthorized oidcProcessProviderApproved attempt for provider: ${providerDomain}`)
      const err = new Error('Invalid token')
      err.status = 403
      return next(err)
    }
  } catch (err) {
    console.error(`Error processing oidc provider approval for ${providerDomain}`)
    next(err)
  }
  next()
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
    const { username, password, email, oidcProviders } = req.body
    const user = await authdb.createUser(username, password, email, oidcProviders)
    if (!user) {
      throw new Error('Unable to create user')
    }
    req.session.registrationInfo = {
      isNewUser: true,
      provider: oidcProviders?.[0] || 'email'
    }
    if (passEmailToHub) {
      // temporarily save cleartext email in session, it will be deleted and passed to hub with the authorization response
      req.session.registrationInfo.email = email
    }
    req.login(user, { keepSessionInfo: true }, next)
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
  try {
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
  } catch (err) {
    next(err)
  }
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

function requireAdmin (req, res, next) {
  const isAdmin = req.user?.role === USER_ROLES.ADMIN
  if (isAdmin) {
    next()
  } else {
    return res.sendStatus(403)
  }
}
