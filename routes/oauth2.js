'use strict'

const oauth2orize = require('oauth2orize')
const login = require('connect-ensure-login')
const db = require('../db')
const utils = { getUid }

// Create OAuth 2.0 server
const server = oauth2orize.createServer()

server.serializeClient((client, done) => done(null, client.id))

server.deserializeClient((id, done) => {
  db.clients.findById(id, (error, client) => {
    if (error) return done(error)
    return done(null, client)
  })
})

// Register supported grant types.
// Grant implicit authorization. The callback takes the `client` requesting
// authorization, the authenticated `user` granting access, and
// their response, which contains approved scope, duration, etc. as parsed by
// the application. The application issues a token, which is bound to these
// values.

server.grant(oauth2orize.grant.token((client, user, ares, done) => {
  const token = utils.getUid(256)
  db.accessTokens.save(token, user.id, client.clientId, (error) => {
    if (error) return done(error)
    console.log(JSON.stringify(user))
    return done(null, token)
  })
}))

// User authorization endpoint.
//
// `authorization` middleware accepts a `validate` callback which is
// responsible for validating the client making the authorization request. In
// doing so, is recommended that the `redirectUri` be checked against a
// registered value, although security requirements may vary across
// implementations. Once validated, the `done` callback must be invoked with
// a `client` instance, as well as the `redirectUri` to which the user will be
// redirected after an authorization decision is obtained.
//
// This middleware simply initializes a new authorization transaction. It is
// the application's responsibility to authenticate the user and render a dialog
// to obtain their approval (displaying details about the client requesting
// authorization). We accomplish that here by routing through `ensureLoggedIn()`
// first, and rendering the `dialog` view.

module.exports.authorization = [
  login.ensureLoggedIn(),
  server.authorization((clientId, redirectUri, done) => {
    db.clients.findByClientId(clientId, (error, client) => {
      if (error) return done(error)
      // WARNING: For security purposes, it is highly advisable to check that
      //          redirectUri provided by the client matches one registered with
      //          the server. For simplicity, this example does not. You have
      //          been warned.
      return done(null, client, redirectUri)
    })
  }, (client, user, done) => {
    // Check if grant request qualifies for immediate approval

    // Auto-approve
    if (client.isTrusted) return done(null, true)

    db.accessTokens.findByUserIdAndClientId(user.id, client.clientId, (error, token) => {
      if (error) {
        throw error
      }
      // Auto-approve
      if (token) return done(null, true)

      // Otherwise ask user
      return done(null, false)
    })
  }),
  (request, response) => {
    response.render('dialog', { transactionId: request.oauth2.transactionID, user: request.user, client: request.oauth2.client })
  }
]

// User decision endpoint.
//
// `decision` middleware processes a user's decision to allow or deny access
// requested by a client application. Based on the grant type requested by the
// client, the above grant middleware configured above will be invoked to send
// a response.

module.exports.decision = [
  login.ensureLoggedIn(),
  server.decision()
]

/**
 * Return a unique identifier with the given `len`.
 *
 * @param {Number} length
 * @return {String}
 * @api private
 */
function getUid (length) {
  let uid = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charsLength = chars.length

  for (let i = 0; i < length; ++i) {
    uid += chars[getRandomInt(0, charsLength - 1)]
  }

  return uid
}

/**
 * Return a random int, used by `utils.getUid()`.
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */
function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
