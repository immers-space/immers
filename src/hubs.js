const request = require('request-promise-native')
const { hub, reticulum } = require('../config.json')
const { hubAccessToken } = require('../secrets.json')
const apiServer = reticulum || hub

module.exports = {
  createRoom
}

function createRoom (req, res, next) {
  if (!req.body || !req.body.hub || !req.body.hub.name) {
    res.status(400).send('body.hub.name required')
  }
  const name = req.body.hub.name
  const scene = req.body.hub.scene_id
  const room = { name }
  if (scene) {
    room.scene_id = scene
  }
  request({
    url: `https://${apiServer}/api/v1/hubs`,
    method: 'POST',
    json: true,
    headers: {
      Authorization: `Bearer ${hubAccessToken}`
    },
    body: { hub: room }
  }).then(room => {
    res.json(room)
  }).catch(err => {
    console.error('Error creating room', err.message)
    res.status(500).send()
  })
}
