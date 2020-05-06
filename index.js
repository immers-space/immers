const fs = require('fs')
const path = require('path')
const https = require('https')
const express = require('express')
const { MongoClient } = require('mongodb')
const ActivitypubExpress = require('activitypub-express')

const port = 8081
const domain = `localhost:${port}`
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
app.use(express.json({ type: ['application/json'].concat(apex.consts.jsonldTypes) }), apex)
// define routes using prepacakged middleware collections
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

const key = fs.readFileSync(path.join(__dirname, 'certs', 'server.key'))
const cert = fs.readFileSync(path.join(__dirname, 'certs', 'server.cert'))

client
  .connect({ useNewUrlParser: true })
  .then(() => {
    apex.store.db = client.db('immers')
    return apex.store.setup()
  })
  .then(() => {
    return https.createServer({ key, cert }, app).listen(port, () => console.log(`apex app listening on port ${port}`))
  })
