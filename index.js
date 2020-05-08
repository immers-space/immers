const fs = require('fs')
const path = require('path')
const https = require('https')
const express = require('express')
const cors = require('cors')
const { MongoClient } = require('mongodb')
const ActivitypubExpress = require('activitypub-express')

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))
const { port, domain, hub, name } = config
const app = express()
const routes = {
  actor: '/u/:actor',
  object: '/o/:id',
  activity: '/s/:id',
  inbox: '/inbox/:actor',
  outbox: '/outbox/:actor',
  followers: '/followers/:actor',
  following: '/following/:actor',
  liked: '/liked/:actor'
}
const apex = ActivitypubExpress({
  domain,
  actorParam: 'actor',
  objectParam: 'id',
  activityParam: 'id',
  routes,
  context: ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1']
  // context: ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1", `https://${domain}/ns`]
})
const client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true, useNewUrlParser: true })

app.use(express.urlencoded({ extended: false }))
app.use(express.json({ type: ['application/json'].concat(apex.consts.jsonldTypes) }))
app.use(cors({ origin: hub }))

app.use(apex)
app
  .route(routes.inbox)
  .get(apex.net.inbox.get)
  .post(apex.net.inbox.post)
app
  .route(routes.outbox)
  .get(apex.net.outbox.get)
  .post(apex.net.outbox.post)
app
  .route(routes.actor)
  .get(apex.net.actor.get)
  .post(async function (req, res) {
    const name = req.params.actor
    console.log(`Creating user ${name}`)
    const actor = await apex.createActor(name, name, 'immers profile')
    const result = await apex.store.saveObject(actor)
    if (result) {
      return res.status(201).send(await apex.toJSONLD(actor))
    }
    return res.sendStatus(500)
  })

app.get(routes.object, apex.net.object.get)
app.get(routes.activity, apex.net.activityStream.get)
app.get('/.well-known/webfinger', apex.net.webfinger.get)
/*
// schema extensions
const immersSchema = JSON.parse(fs.readFileSync("server/context.json"));
immersSchema["@context"].immers = `https://${domain}/ns#`;
app.get("/ns", function(req, res) {
  res.json(immersSchema);
});
console.log("setting custom loader");
// override fetching of some contexts
const nodeDocumentLoader = jsonld.documentLoaders.node();
const customLoader = async (url, options) => {
  console.log("custom loader");
  if (url.startsWith(`https://${domain}/ns`)) {
    console.log("cached context");
    return {
      contextUrl: null, // this is for a context via a link header
      document: immersSchema, // this is the actual document that was loaded
      documentUrl: url // this is the actual context URL after redirects
    };
  }
  // call the default documentLoader
  return nodeDocumentLoader(url);
};
jsonld.documentLoader = customLoader;
*/

// auto-accept follows
app.on('apex-follow', async msg => {
  console.log('apex-follow')
  if (!msg.recipient) return // ignore outbox follows
  console.log(`${msg.actor} followed ${msg.recipient.id}`)
  const accept = await apex.buildActivity('Accept', msg.recipient.id, msg.actor, { object: msg.activity.id })
  const publishUpdatedFollowers = await apex.acceptFollow(msg.recipient, msg.activity)
  await apex.addToOutbox(msg.recipient, accept)
  return publishUpdatedFollowers()
})

// custom c2s apis
async function friendsLocations (req, res, next) {
  const locals = res.locals.apex
  const friends = await apex.store.db.collection('streams').aggregate([
    { $match: { '_meta.collection': locals.target.inbox[0], type: { $in: ['Arrive', 'Leave'] } } },
    { $sort: { _id: -1 } },
    { $group: { _id: '$actor', loc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$loc' } },
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

app.get('/u/:actor/friends', [
  apex.net.validators.jsonld,
  apex.net.validators.targetActor,
  friendsLocations,
  apex.net.responders.result
])

const key = fs.readFileSync(path.join(__dirname, 'certs', 'server.key'))
const cert = fs.readFileSync(path.join(__dirname, 'certs', 'server.cert'))

client
  .connect({ useNewUrlParser: true })
  .then(() => {
    apex.store.db = client.db('immers')
    // Place object representing this node
    const immer = {
      id: `https://${domain}/o/immer`,
      type: 'Place',
      name,
      url: `https://${domain}`
    }
    return apex.fromJSONLD(immer)
  })
  .then(immer => {
    return apex.store.setup(immer)
  })
  .then(() => {
    return https.createServer({ key, cert }, app).listen(port, () => console.log(`apex app listening on port ${port}`))
  })
