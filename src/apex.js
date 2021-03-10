const ActivitypubExpress = require('activitypub-express')
const immersContext = require('../static/immers-context.json')
const { domain } = require('../config.json')

const routes = {
  actor: '/u/:actor',
  object: '/o/:id',
  activity: '/s/:id',
  inbox: '/inbox/:actor',
  outbox: '/outbox/:actor',
  followers: '/followers/:actor',
  following: '/following/:actor',
  liked: '/liked/:actor',
  collections: '/collection/:actor/:id',
  blocked: '/blocked/:actor',
  rejections: '/rejections/:actor/',
  rejected: '/rejected/:actor/',
  shares: '/shares/:id/',
  likes: '/likes/:id/'
}

const apex = ActivitypubExpress({
  domain,
  actorParam: 'actor',
  objectParam: 'id',
  routes,
  context: immersContext,
  endpoints: {
    oauthAuthorizationEndpoint: `${domain}/auth/authorize`
  }
})

module.exports = {
  apex,
  createImmersActor,
  onOutbox,
  onInbox,
  routes
}

async function createImmersActor (preferredUsername, name) {
  const actor = await apex.createActor(preferredUsername, name, 'Immerser profile')
  actor.streams = [{
    id: `${actor.id}#streams`,
    // personal avatar collection
    avatars: apex.utils.userCollectionIdToIRI(preferredUsername, 'avatars')
  }]
  return actor
}

// apex event handlers for custom side-effects

const collectionTypes = ['Add', 'Remove']
async function onOutbox ({ actor, activity, object }) {
  // publish avatars collection updates
  const isColChange = collectionTypes.includes(activity.type)
  const isAvatarCollection = activity.target?.[0] === actor.streams?.[0].avatars
  if (isColChange && isAvatarCollection) {
    return apex.publishUpdate(actor, await apex.getAdded(actor, 'avatars'))
  }
  // Friend behavior - follows are made reciprocal with automated followback
  if (activity.type === 'Accept' && object.type === 'Follow') {
    const followback = await apex.buildActivity('Follow', actor.id, object.actor, {
      object: object.actor,
      inReplyTo: object.id
    })
    return apex.addToOutbox(actor, followback)
  }
}

async function onInbox ({ actor, activity, recipient, object }) {
  // Friend behavior - follows are made reciprocal by auto-accepting followbacks
  // validate by checking it is a reply to an outgoing follow for the same actor
  // (use this over checking actor is in my following list to avoid race condition with Accept processing)
  let inReplyTo
  if (
    // is a follow for me and
    activity.type === 'Follow' && object.id === recipient.id &&
    // is a reply
    (inReplyTo = activity.inReplyTo && await apex.store.getActivity(activity.inReplyTo[0])) &&
    // to a follow
    inReplyTo.type === 'Follow' &&
    // sent by me
    apex.actorIdFromActivity(inReplyTo) === recipient.id &&
    // to this actor
    apex.objectIdFromActivity(inReplyTo) === actor.id
  ) {
    const accept = await apex.buildActivity('Accept', recipient.id, actor.id, {
      object: activity.id
    })
    const { postTask: publishUpdatedFollowers } = await apex.acceptFollow(recipient, activity)
    await apex.addToOutbox(recipient, accept)
    return publishUpdatedFollowers()
  }
  // auto unfollowback
  if (activity.type === 'Reject' && object.type === 'Follow' && object.actor[0] === recipient.id) {
    const rejectedIRI = apex.utils.nameToRejectedIRI(recipient.preferredUsername)
    const follow = await apex.store.findActivityByCollectionAndActorId(recipient.followers[0], actor.id, true)
    if (!follow || follow._meta?.collection?.includes(rejectedIRI)) {
      return
    }
    // perform reject side effects and publish
    await apex.store.updateActivityMeta(follow, 'collection', rejectedIRI)
    await apex.store.updateActivityMeta(follow, 'collection', recipient.followers[0], true)
    const reject = await apex.buildActivity('Reject', recipient.id, actor.id, {
      object: follow.id
    })
    await apex.addToOutbox(recipient, reject)
    return apex.publishUpdate(recipient, await apex.getFollowers(recipient))
  }
}
