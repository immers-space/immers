'use strict'
/**
 * Authorization index
 */
const authdb = require('./authdb')
const resourceServer = require('./resourceServer')
const authorizationServer = require('./oauthServer')
const oauthClient = require('./oauthClient')
// const openIdServer = require('./openIdServer')

module.exports = {
  authdb,
  // resource server
  clnt: resourceServer.clnt,
  open: resourceServer.open,
  priv: resourceServer.priv,
  publ: resourceServer.publ,
  admn: resourceServer.admn,
  scope: resourceServer.scope,
  viewScope: resourceServer.viewScope,
  friendsScope: resourceServer.friendsScope,
  localToken: resourceServer.localToken,
  logout: resourceServer.logout,
  authorizeServiceAccount: resourceServer.authorizeServiceAccount,
  controlledAccountLogin: resourceServer.controlledAccountLogin,
  oidcLoginProviders: resourceServer.oidcLoginProviders,
  oidcSendProviderApprovalEmail: resourceServer.oidcSendProviderApprovalEmail,
  oidcProcessProviderApproved: resourceServer.oidcProcessProviderApproved,
  passIfNotAuthorized: resourceServer.passIfNotAuthorized,
  requirePrivilege: resourceServer.requirePrivilege,
  userToActor: resourceServer.userToActor,
  registerUser: resourceServer.registerUser,
  changePassword: resourceServer.changePassword,
  changePasswordAndReturn: resourceServer.changePasswordAndReturn,
  validateNewUser: resourceServer.validateNewUser,
  returnTo: resourceServer.returnTo,
  respondRedirect: resourceServer.respondRedirect,
  // oauth2 authorization server
  registerClient: authorizationServer.registerClient,
  authorization: authorizationServer.authorization,
  decision: authorizationServer.decision,
  tokenExchange: authorizationServer.tokenExchange,
  // oauth2 client
  checkImmer: oauthClient.checkImmer,
  checkImmerAndRedirect: oauthClient.checkImmerAndRedirect,
  handleOAuthReturn: [oauthClient.handleOAuthReturn, resourceServer.returnTo],
  oidcPreRegister: oauthClient.oidcPreRegister,
  oidcPostRegister: oauthClient.oidcPostRegister,
  oidcPostMerge: oauthClient.oidcPostMerge
  // openId Connect server (WIP)
  /*
  oidcServerRouter: openIdServer.router,
  oidcWebfingerPassIfNotIssuer: openIdServer.webfingerPassIfNotIssuer,
  oidcWebfingerRespond: openIdServer.webfingerRespond
  */
}
