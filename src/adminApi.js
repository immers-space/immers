const { Router } = require('express')
const { Issuer } = require('openid-client')
const { apex } = require('./apex')
const { authdb } = require('./auth')
const auth = require('./auth')
const router = new Router()
const ObjectId = require('mongodb').ObjectId

const { domain } = process.env

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

const clientProjection = {
  name: 1,
  domain: 1,
  'client.client_id': 1,
  showButton: 1,
  buttonIcon: 1,
  buttonLabel: 1
}

async function getOauthClients (req, res) {
  const oidcRemoteClients = await apex.store.db.collection('oidcRemoteClients')
    .find({}, { projection: clientProjection })
    .toArray()
  res.json(oidcRemoteClients.map(toFrontEndClientFormat))
}

async function postOauthClient (req, res) {
  let clientData
  try {
    clientData = await processClientFromFrontEnd(req.body)
  } catch (err) {
    return res.json({ success: false, step: 'discovery', error: err.toString() })
  }
  try {
    const { domain: providerDomain, issuer, client, metadata } = clientData
    await authdb.oidcSaveRemoteClient(providerDomain, issuer, client, metadata)
    return res.json({ success: true })
  } catch (err) { return res.status(500) }
}

async function deleteOauthClient (req, res) {
  try {
    await apex.store.db.collection('oidcRemoteClients').deleteOne({
      _id: ObjectId(req.body.id)
    })
    return res.json({ success: true })
  } catch (err) { return res.status(500) }
}

async function getOauthClient (req, res) {
  const oidcRemoteClients = await apex.store.db.collection('oidcRemoteClients')
    .findOne({ _id: ObjectId(req.params.id) }, { projection: clientProjection })
  res.json(toFrontEndClientFormat(oidcRemoteClients))
}

async function updateOauthClient (req, res) {
  try {
    const update = {
      name: req.body.name,
      'client.client_id': req.body.clientId,
      showButton: req.body.showButton,
      buttonIcon: req.body.buttonIcon,
      buttonLabel: req.body.buttonLabel
    }
    if (req.body.clientSecret) {
      update['client.client_secret'] = req.body.clientSecret
    }
    await apex.store.db.collection('oidcRemoteClients').updateOne(
      { _id: ObjectId(req.params.id) },
      { $set: update }
    )
    return res.json({ success: true })
  } catch (err) { return res.status(500) }
}

/// utils ///
function toFrontEndClientFormat (dbClient) {
  const { _id, name, domain: providerDomain, showButton, buttonIcon, buttonLabel, client } = dbClient
  return {
    _id,
    name,
    domain: providerDomain,
    showButton,
    buttonIcon,
    buttonLabel,
    clientId: client?.client_id
  }
}

async function processClientFromFrontEnd (data) {
  const { name, domain: providerDomain, clientId, clientSecret, showButton, buttonIcon, buttonLabel } = data
  const providerOriginOrDisdoveryUrl = providerDomain.includes('://') ? providerDomain : `https://${providerDomain}`
  const issuer = await Issuer.discover(providerOriginOrDisdoveryUrl)
  const client = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [`htttps://${domain}/auth/return`],
    response_types: ['code']
  })
  const cleanDomain = new URL(providerOriginOrDisdoveryUrl).host
  return { domain: cleanDomain, issuer, client, metadata: { name, showButton, buttonIcon, buttonLabel } }
}
