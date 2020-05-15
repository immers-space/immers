'use strict'

const oauth2orize = require('oauth2orize')
const login = require('connect-ensure-login')
const authdb = require('../src/authdb')

// Create OAuth 2.0 server
const server = oauth2orize.createServer()

server.serializeClient(authdb.serializeClient)
server.deserializeClient(authdb.deserializeClient)
// Implicit grant only
server.grant(oauth2orize.grant.token(authdb.createAccessToken))

// User authorization & grant endpoint.
module.exports.authorization = [
  login.ensureLoggedIn(),
  server.authorization(authdb.validateClient, (client, user, done) => {
    console.log('client needs decision?')
    // Auto-approve
    if (client.isTrusted) return done(null, true)
    // Otherwise ask user
    return done(null, false)
  }),
  (request, response) => {
    console.log('decision dialog')
    response.render('dialog', { transactionId: request.oauth2.transactionID, user: request.user, client: request.oauth2.client })
  }
]
// decision result
module.exports.decision = [
  login.ensureLoggedIn(),
  server.decision()
]
