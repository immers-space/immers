const { Router } = require('express')
const { apex } = require('./apex')
const auth = require('./auth')
const router = new Router()
const friendUpdateTypes = ['Arrive', 'Leave', 'Accept', 'Follow', 'Reject']

module.exports = {
  router,
  friendUpdateTypes
}
// custom c2s apis
async function friendsLocations (req, res, next) {
  const apex = req.app.locals.apex
  const locals = res.locals.apex
  const actor = locals.target
  const inbox = actor.inbox[0]
  const followers = actor.followers[0]
  const rejected = apex.utils.nameToRejectedIRI(actor.preferredUsername)
  const friends = await apex.store.db.collection('streams').aggregate([
    {
      $match: {
        $and: [
          { '_meta.collection': inbox },
          // filter only pending follow requests
          { '_meta.collection': { $nin: [followers, rejected] } }
        ],
        type: { $in: friendUpdateTypes }
      }
    },
    // most recent activity per actor
    { $sort: { _id: -1 } },
    { $group: { _id: '$actor', loc: { $first: '$$ROOT' } } },
    // sort actors by most recent activity
    { $sort: { _id: -1 } },
    { $replaceRoot: { newRoot: '$loc' } },
    { $sort: { _id: -1 } },
    { $lookup: { from: 'objects', localField: 'actor', foreignField: 'id', as: 'actor' } },
    { $project: { _id: 0, 'actor.publicKey': 0 } }
  ]).toArray()
  locals.result = {
    id: `https://${domain}${req.originalUrl}`,
    type: 'OrderedCollection',
    totalItems: friends.length,
    orderedItems: friends
  }
  next()
}
router.get('/u/:actor/friends', [
  // check content type first in case this is HTML request
  apex.net.validators.jsonld,
  auth.priv,
  auth.friendsScope,
  apex.net.validators.targetActor,
  apex.net.security.verifyAuthorization,
  apex.net.security.requireAuthorized,
  friendsLocations,
  apex.net.responders.result
])
