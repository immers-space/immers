const { Router } = require('express')
const { Issuer } = require('openid-client')
const saml = require('samlify')
const request = require('request-promise-native')
const { apex } = require('./apex')
const { authdb } = require('./auth')
const auth = require('./auth')
const { appSettings, updateThemeSettings } = require('./settings')
const { CLIENT_TYPES } = require('./auth/consts')
const router = new Router()
const ObjectId = require('mongodb').ObjectId

const { domain } = appSettings

module.exports = {
  router
}

router.get('/a/is-admin', [
  auth.admn,
  (req, res) => {
    res.json({ isAdmin: true })
  }
])

router.get('/a/oauth-clients', [
  auth.admn,
  getOauthClients
])

router.post('/a/oauth-clients', [
  auth.admn,
  postOauthClient
])

router.delete('/a/oauth-clients', [
  auth.admn,
  deleteOauthClient
])

router.get('/a/oauth-client/:id', [
  auth.admn,
  getOauthClient
])

router.put('/a/oauth-client/:id', [
  auth.admn,
  updateOauthClient
])

router.put('/a/settings/theme', [
  auth.admn,
  putThemeSettings
])

const clientProjection = {
  type: 1,
  name: 1,
  domain: 1,
  'client.client_id': 1,
  'issuer.isAssertionEncrypted': 1,
  'issuer.wantLogoutRequestSigned': 1,
  'issuer.messageSigningOrder': 1,
  showButton: 1,
  buttonIcon: 1,
  buttonLabel: 1
}

async function getOauthClients (req, res) {
  const remoteClients = await apex.store.db.collection('remoteClients')
    .find({}, { projection: clientProjection })
    .toArray()
  res.json(remoteClients.map(toFrontEndClientFormat))
}

async function postOauthClient (req, res) {
  let clientData
  try {
    clientData = await processClientFromFrontEnd(req.body)
  } catch (err) {
    return res.json({ success: false, step: 'discovery', error: err.toString() })
  }
  try {
    const { domain: providerDomain, type, issuer, client, metadata } = clientData
    await authdb.saveRemoteClient(providerDomain, type, issuer, client, metadata)
    return res.json({ success: true })
  } catch (err) { return res.sendStatus(500) }
}

async function deleteOauthClient (req, res) {
  try {
    await apex.store.db.collection('remoteClients').deleteOne({
      _id: ObjectId(req.body.id)
    })
    return res.json({ success: true })
  } catch (err) { return res.sendStatus(500) }
}

async function getOauthClient (req, res) {
  const remoteClients = await apex.store.db.collection('remoteClients')
    .findOne({ _id: ObjectId(req.params.id) }, { projection: clientProjection })
  res.json(toFrontEndClientFormat(remoteClients))
}

async function updateOauthClient (req, res) {
  try {
    const update = {
      name: req.body.name,
      showButton: req.body.showButton,
      buttonIcon: req.body.buttonIcon,
      buttonLabel: req.body.buttonLabel
    }
    // OIDC updates
    if (req.body.clientId) {
      update['client.client_id'] = req.body.clientId
    }
    if (req.body.clientSecret) {
      update['client.client_secret'] = req.body.clientSecret
    }
    // SAML udpates
    if (req.body.isAssertionEncrypted != null) {
      update['issuer.isAssertionEncrypted'] = req.body.isAssertionEncrypted
    }
    if (req.body.wantLogoutRequestSigned != null) {
      update['issuer.wantLogoutRequestSigned'] = req.body.wantLogoutRequestSigned
    }
    if (req.body.messageSigningOrder) {
      update['issuer.messageSigningOrder'] = req.body.messageSigningOrder
    }
    await apex.store.db.collection('remoteClients').updateOne(
      { _id: ObjectId(req.params.id) },
      { $set: update }
    )
    return res.json({ success: true })
  } catch (err) { return res.sendStatus(500) }
}

function putThemeSettings (req, res, next) {
  const {
    baseTheme,
    customTheme
  } = req.body
  updateThemeSettings(apex.store.db, { baseTheme, customTheme })
    .then(() => res.sendStatus(200))
    .catch(next)
}

/// utils ///
function toFrontEndClientFormat (dbClient) {
  // TODO
  const { _id, type, name, domain: providerDomain, showButton, buttonIcon, buttonLabel, client, issuer } = dbClient
  return {
    _id,
    type,
    name,
    domain: providerDomain,
    showButton,
    buttonIcon,
    buttonLabel,
    clientId: client?.client_id,
    isAssertionEncrypted: issuer?.isAssertionEncrypted,
    wantLogoutRequestSigned: issuer?.wantLogoutRequestSigned,
    messageSigningOrder: issuer?.messageSigningOrder
  }
}

async function processClientFromFrontEnd (data) {
  const { type, name, domain: providerDomain, showButton, buttonIcon, buttonLabel } = data
  const metadata = { name, showButton, buttonIcon, buttonLabel }
  let cleanProviderDomain
  let issuer
  let client
  if (type === CLIENT_TYPES.OIDC) {
    const { clientId, clientSecret } = data
    const providerOriginOrDisdoveryUrl = providerDomain.includes('://') ? providerDomain : `https://${providerDomain}`
    const oidcIssuer = await Issuer.discover(providerOriginOrDisdoveryUrl)
    const oidcClient = new oidcIssuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [`https://${domain}/auth/return`],
      response_types: ['code']
    })
    issuer = oidcIssuer.metadata
    client = oidcClient.metadata
    cleanProviderDomain = new URL(providerOriginOrDisdoveryUrl).host
  } else if (type === CLIENT_TYPES.SAML) {
    const { isAssertionEncrypted, wantLogoutRequestSigned, messageSigningOrder } = data
    const metadata = data.metadata ?? await request(data.domain)
    issuer = { metadata, isAssertionEncrypted, wantLogoutRequestSigned, messageSigningOrder }
    const testIdP = new saml.IdentityProvider(issuer)
    cleanProviderDomain = new URL(testIdP.entityMeta.getEntityID()).host
  }
  return { type, domain: cleanProviderDomain, issuer, client, metadata }
}
