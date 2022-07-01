'use strict'
/**
 * Authorization index
 */
const authdb = require('./authdb')
const resourceServer = require('./resourceServer')
const authorizationServer = require('./oauthServer')
const oauthClient = require('./oauthClient')
const openIdServer = require('./openIdServer')

module.exports = {
  authdb,
  // resource server
  clnt: resourceServer.clnt,
  open: resourceServer.open,
  priv: resourceServer.priv,
  publ: resourceServer.publ,
  scope: resourceServer.scope,
  viewScope: resourceServer.viewScope,
  friendsScope: resourceServer.friendsScope,
  localToken: resourceServer.localToken,
  logout: resourceServer.logout,
  passIfNotAuthorized: resourceServer.passIfNotAuthorized,
  requirePrivilege: resourceServer.requirePrivilege,
  userToActor: resourceServer.userToActor,
  registration: resourceServer.registration,
  registerUser: resourceServer.registerUser,
  changePassword: resourceServer.changePassword,
  changePasswordAndReturn: resourceServer.changePasswordAndReturn,
  validateNewUser: resourceServer.validateNewUser,
  // oauth2 authorization server
  registerClient: authorizationServer.registerClient,
  authorization: authorizationServer.authorization,
  decision: authorizationServer.decision,
  tokenExchange: authorizationServer.tokenExchange,
  // oauth2 client
  checkImmer: oauthClient.checkImmer,
  // openId Connect server
  oidcServerRouter: openIdServer.router
}
