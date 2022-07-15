const { Router } = require('express')
const { apex } = require('./apex')
const auth = require('./auth')
const router = new Router()
const ObjectId = require('mongodb').ObjectId

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

async function getOauthClients (req, res) {
  const oidcRemoteClients = await apex.store.db.collection('oidcRemoteClients')
    .find({})
    .toArray()
  res.json(oidcRemoteClients)
}

async function postOauthClient (req, res) {
  try {
    await apex.store.db.collection('oidcRemoteClients').insertOne({
      name: req.body.name,
      domain: req.body.domain,
      clientId: req.body.clientId,
      clientSecret: req.body.clientSecret,
      buttonIcon: req.body.buttonIcon,
      buttonLabel: req.body.buttonLabel
    })
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
    .findOne({ _id: ObjectId(req.params.id) })
  res.json(oidcRemoteClients)
}

async function updateOauthClient (req, res) {
  try {
    await apex.store.db.collection('oidcRemoteClients').updateOne(
      { _id: ObjectId(req.params.id) },
      {
        $set: {
          name: req.body.name,
          domain: req.body.domain,
          clientId: req.body.clientId,
          clientSecret: req.body.clientSecret,
          buttonIcon: req.body.buttonIcon,
          buttonLabel: req.body.buttonLabel
        }
      }
    )
    return res.json({ success: true })
  } catch (err) { return res.status(500) }
}
