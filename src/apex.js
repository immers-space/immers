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
