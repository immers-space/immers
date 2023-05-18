'use strict'
/**
 * OAuth2 authorization server
 * Processes requests to act on behalf of users from this immer,
 * granting access tokens if authorized
 */
const { appSettings, renderConfig } = require('../settings')
const oauth2orize = require('oauth2orize')
const passport = require('passport')
const login = require('connect-ensure-login')
// strategies for OAuth client authentication
const CustomStrategy = require('passport-custom').Strategy
// additional OAuth exchange protocols
const jwtBearer = require('oauth2orize-jwt-bearer').Exchange

const authdb = require('./authdb')
const { clnt } = require('./resourceServer')
const { domain } = appSettings

const oauthJwtExchangeType = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
const server = oauth2orize.createServer()

/// exports ///
module.exports = {
  registerClient,
  // OAuth2 client authorization & token request
  authorization: [
    stashHandle,
    login.ensureLoggedIn('/auth/login'),
    sessionToLocals,
    server.authorization(authdb.validateClient, checkIfAuthorizationDialogNeeded),
    renderAuthorizationDialog
  ],
  // process result of auth dialog form
  decision: [
    login.ensureLoggedIn('/auth/login'),
    server.decision(determineTokenParams)
  ],
  tokenExchange: [
    clnt, // authorize the client
    server.token(),
    server.errorHandler()
  ]
}

/// side effects ///

// Configure OAuth2 authorization server (grant access to remote clients)
server.serializeClient(authdb.serializeClient)
server.deserializeClient(authdb.deserializeClient)
// OAuth2 client login
passport.use('oauth2-client-jwt', new CustomStrategy(async (req, done) => {
  const rawToken = req.body?.assertion ?? req.get('authorization')?.split('Bearer ')[1]
  if (!rawToken) {
    return done(null, false, 'missing assertion body field or Bearer authorization header')
  }
  authdb.authenticateClientJwt(rawToken, done)
}))
// Implicit grant
server.grant(oauth2orize.grant.token(authdb.createAccessToken))
// jwt bearer exchange for admin service accounts (2-Legged OAuth)
server.exchange(oauthJwtExchangeType, jwtBearer(
  // Authorize client token exchange request
  function authorizeClientJwt (client, jwtBearer, done) {
    authdb.authorizeAccountControl(client, jwtBearer).then(({ validatedPayload, user }) => {
      const params = {}
      if (validatedPayload.origin) {
        params.origin = validatedPayload.origin
      } else {
        const origin = new URL(client.redirectUri[0])
        params.origin = `${origin.protocol}//${origin.host}`
      }
      params.issuer = `https://${domain}`
      params.scope = validatedPayload.scope.split(' ')
      authdb.createAccessToken(client, user, params, done)
    }).catch(err => {
      done(null, false, err.message)
    })
  })
)

/// utilities ///
async function registerClient (req, res, next) {
  let client
  if (!req.body.clientId || !req.body.redirectUri || !req.body.name) {
    return res.status(400).send('Invalid clientId or redirectUri')
  }
  try {
    client = await authdb.createClient(req.body.clientId, req.body.redirectUri, req.body.name)
  } catch (err) {
    if (err.name === 'MongoServerError' && err.code === 11000) {
      return res.status(409).send('Client already registered')
    }
    next(err)
  }
  return res.json(client)
}

function checkIfAuthorizationDialogNeeded (client, user, scope, type, authRequest, locals, done) {
  // Auto-approve for home immer
  if (client.isTrusted) {
    const params = {}
    const origin = new URL(authRequest.redirectURI)
    params.origin = `${origin.protocol}//${origin.host}`
    params.issuer = `https://${domain}`
    params.scope = ['*']
    /**
     * Can pass additional info to its own hub on user registration,
     * added as params in auth response, parsed to client.sessionInfo in ImmersClient
     */
    if (client.clientId === `https://${domain}/o/immer`) {
      // registrationInfo set in resourceServer->registerUser
      params.registrationInfo = locals.registrationInfo
    }
    return done(null, true, params)
  }
  // Otherwise ask user
  return done(null, false)
}

function renderAuthorizationDialog (request, response) {
  const data = Object.assign({
    transactionId: request.oauth2.transactionID,
    username: request.user.username,
    clientName: request.oauth2.client.name,
    redirectUri: request.oauth2.redirectURI,
    preferredScope: request.oauth2.req.scope.join(' ')
  }, renderConfig)
  response.render('dist/dialog/dialog.html', data)
}

function determineTokenParams (req, done) {
  const params = {}
  const origin = new URL(req.oauth2.redirectURI)
  params.origin = `${origin.protocol}//${origin.host}`
  params.issuer = `https://${domain}`
  params.scope = req.body.scope?.split(' ') || []
  done(null, params)
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

/**
 * oauth2orize doesn't allow access to raw request or session in callbacks,
 * but it does allow access to request.locals
 */
function sessionToLocals (req, res, next) {
  req.locals ??= {}
  req.locals.registrationInfo = req.session.registrationInfo
  delete req.session.registrationInfo
  next()
}
