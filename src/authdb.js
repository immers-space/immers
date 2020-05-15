const { ObjectId } = require('mongodb')
const uid = require('uid-safe')
const tokenAge = 24 * 60 * 60 * 1000 // one day
let db
module.exports = {
  async setup (connection) {
    db = connection
    // token expiration via record deletion
    await db.collection('tokens').createIndex({
      expiry: 1
    }, {
      name: 'tokens-ttl',
      expireAfterSeconds: 0
    })
    /// //// temp
    await db.collection('users').findOneAndReplace({
      handle: 'will@localhost:8081'
    }, {
      handle: 'will@localhost:8081',
      password: 'password'
    }, { upsert: true })
    await db.collection('clients').findOneAndReplace({
      clientId: 'https://localhost:8081/o/immer'
    }, {
      clientId: 'https://localhost:8081/o/immer',
      redirectUri: 'https://localhost:8080/hub.html',
      isTrusted: true
    }, { upsert: true })
  },
  serializeClient (client, done) {
    done(null, client._id)
  },
  async deserializeClient (id, done) {
    try {
      return done(null, await db.collection('clients').findOne({ _id: ObjectId(id) }))
    } catch (err) { done(err) }
  },
  async validateClient (clientId, redirectUriFull, done) {
    try {
      // allow hub room id to be appended to registered Uri
      const url = new URL(redirectUriFull)
      const redirectUri = `${url.protocol}//${url.host}${url.pathname}`
      const client = await db.collection('clients').findOne({ clientId, redirectUri })
      if (!client) {
        return done(null, false)
      }
      return done(null, client, redirectUriFull)
    } catch (err) { done(err) }
  },
  serializeUser (user, done) {
    done(null, user._id)
  },
  async deserializeUser (id, done) {
    try {
      done(null, await db.collection('users').findOne({ _id: ObjectId(id) }))
    } catch (err) { done(err) }
  },
  async validateUser (handle, password, done) {
    try {
      // todo: bcrypt
      const user = await db.collection('users').findOne({ handle, password })
      return done(null, user)
    } catch (err) { done(err) }
  },
  async createAccessToken (client, user, ares, done) {
    try {
      const tokenType = 'Bearer'
      const clientId = client.clientId
      const token = await uid(128)
      const expiry = new Date(Date.now() + tokenAge)
      await db.collection('tokens')
        .insertOne({ token, user, clientId, expiry, tokenType, origin: ares.origin })
      return done(null, token, { token_type: tokenType })
    } catch (err) { done(err) }
  },
  async validateAccessToken (token, done) {
    try {
      const tokenDoc = await db.collection('tokens').findOne({ token })
      done(null, tokenDoc.user, { scope: '*', origin: tokenDoc.origin })
    } catch (err) { done(err) }
  }
}
