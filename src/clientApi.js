// custom c2s apis
const { Router } = require('express')
const { apex } = require('./apex')
const auth = require('./auth')
const { domain } = process.env
const router = new Router()
// note we have to include reject here or else the query will find the previous accept and
// the user will show up as a current friend. Clients probably want to filter the rejects before display
const friendStatusTypes = ['Arrive', 'Leave', 'Accept', 'Follow', 'Reject']

module.exports = {
  router
}

router.get('/u/:actor/friends', [
  // check content type first in case this is HTML request
  apex.net.validators.jsonld,
  auth.priv,
  auth.friendsScope,
  apex.net.validators.targetActorWithMeta,
  apex.net.security.verifyAuthorization,
  apex.net.security.requireAuthorized,
  friendsLocations,
  apex.net.responders.result
])

router.get('/u/:actor/destinations', [
  // check content type first in case this is HTML request
  apex.net.validators.jsonld,
  auth.priv,
  auth.friendsScope,
  apex.net.validators.targetActorWithMeta,
  apex.net.security.verifyAuthorization,
  apex.net.security.requireAuthorized,
  outboxDestinations,
  apex.net.responders.result
])

router.get('/u/:actor/friends-destinations', [
  // check content type first in case this is HTML request
  apex.net.validators.jsonld,
  auth.priv,
  auth.friendsScope,
  apex.net.validators.targetActorWithMeta,
  apex.net.security.verifyAuthorization,
  apex.net.security.requireAuthorized,
  inboxDestinations,
  apex.net.responders.result
])

async function friendsLocations (req, res, next) {
  const apex = req.app.locals.apex
  const locals = res.locals.apex
  const actor = locals.target
  const inbox = actor.inbox[0]
  const followers = actor.followers[0]
  const rejected = apex.utils.nameToRejectedIRI(actor.preferredUsername)
  const outbox = actor.outbox[0]
  const following = actor.following[0]
  const rejections = apex.utils.nameToRejectionsIRI(actor.preferredUsername)
  const friends = await apex.store.db.collection('streams').aggregate([
    {
      $match: {
        $and: [
          { '_meta.collection': inbox },
          // filter only pending follow requests
          { '_meta.collection': { $nin: [followers, rejected] } }
        ],
        type: { $in: friendStatusTypes },
        actor: { $nin: actor._local.blockList }
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
    { $project: { _id: 0, _meta: 0, 'actor.publicKey': 0, 'actor._meta': 0 } },
    {
      // include outgoing follow requests that are pending
      $unionWith: {
        coll: 'streams',
        pipeline: [
          {
            $match: {
              $and: [
                { '_meta.collection': outbox },
                // filter only pending follow requests
                { '_meta.collection': { $nin: [following, rejections] } }
              ],
              type: { $eq: 'Follow' }
            }
          },
          { $sort: { _id: -1 } },
          { $lookup: { from: 'objects', localField: 'object', foreignField: 'id', as: 'object' } },
          { $project: { _id: 0, _meta: 0, 'object.publicKey': 0, 'object._meta': 0 } }
        ]
      }
    }
  ]).toArray()
  locals.result = {
    id: `https://${domain}${req.originalUrl}`,
    type: 'OrderedCollection',
    totalItems: friends.length,
    orderedItems: friends
  }
  next()
}

async function outboxDestinations (req, res, next) {
  const locals = res.locals.apex
  if (!locals.target) return next()
  const actor = locals.target
  try {
    const collection = await destinationHistory(actor.streams[0].destinations, req.query.page, locals.authorized, actor._local.blockList)
    locals.result = collection
    next()
  } catch (err) {
    console.error('Error querying outbox destination history', err)
    next(err)
  }
}

async function inboxDestinations (req, res, next) {
  const locals = res.locals.apex
  if (!locals.target) return next()
  const actor = locals.target
  try {
    const collection = await destinationHistory(actor.streams[0].friendsDestinations, req.query.page, locals.authorized, actor._local.blockList)
    locals.result = collection
    next()
  } catch (err) {
    console.error('Error querying inbox destination history', err)
    next(err)
  }
}

/** List unique visited locations, most recent first. Your destinations if collectionId is outbox or else friends' if inbox */
function destinationHistory (collectionId, page, authorized, blockList) {
  const recentUniqueUrls = [{
    $sort: {
      _id: -1
    }
  }, {
    $group: {
      _id: '$target.url',
      recent: {
        $first: '$$ROOT'
      }
    }
  }, {
    $replaceRoot: {
      newRoot: '$recent'
    }
  }]
  return apex.getCollection(collectionId, page, null, authorized, blockList, recentUniqueUrls)
}
