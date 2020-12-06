const { ObjectId } = require('mongodb')
const uid = require('uid-safe')
const bcrypt = require('bcrypt')
const { domain, hub, name } = require('../config.json')

const saltRounds = 10
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
    await db.collection('clients').createIndex({
      clientId: 1
    }, {
      unique: true
    })
    await db.collection('remotes').createIndex({
      domain: 1
    }, {
      unique: true
    })
    await db.collection('users').createIndex({
      username: 1
    }, {
      unique: true
    })
    await db.collection('users').createIndex({
      email: 1
    }, {
      unique: true
    })

    // trusted client entry for local hub
    await db.collection('clients').findOneAndReplace({
      clientId: `https://${domain}/o/immer`
    }, {
      name,
      clientId: `https://${domain}/o/immer`,
      redirectUri: `https://${hub}`,
      isTrusted: true
    }, { upsert: true })
  },
  // passport / oauth2orize methods
  async validateUser (username, password, done) {
    try {
      username = username.toLowerCase()
      const user = await db.collection('users').findOne({ username })
      if (!user || !user.passwordHash) { return done(null, false) }
      const match = await bcrypt.compare(password, user.passwordHash)
      done(null, match && user)
    } catch (err) { done(err) }
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
      const redirectUri = `${url.protocol}//${url.host}`
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
  async createAccessToken (client, user, ares, done) {
    try {
      const tokenType = 'Bearer'
      const clientId = client.clientId
      const token = await uid(128)
      const expiry = new Date(Date.now() + tokenAge)
      await db.collection('tokens')
        .insertOne({ token, user, clientId, expiry, tokenType, origin: ares.origin })
      return done(null, token, { token_type: tokenType, issuer: ares.issuer })
    } catch (err) { done(err) }
  },
  async validateAccessToken (token, done) {
    try {
      const tokenDoc = await db.collection('tokens').findOne({ token })
      if (!tokenDoc) { return done(null, false) }
      done(null, tokenDoc.user, { scope: '*', origin: tokenDoc.origin })
    } catch (err) { done(err) }
  },
  // immers api methods (promises instead of callbacks)
  getUserByName (username) {
    username = username.toLowerCase()
    return db.collection('users').findOne({ username })
  },
  getUserByEmail (email) {
    email = email.toLowerCase()
    return db.collection('users').findOne({ email })
  },
  async createUser (username, password, email) {
    const user = { username, email }
    const passwordHash = await bcrypt.hash(password, saltRounds)
    user.passwordHash = passwordHash
    await db.collection('users').insertOne(user)
    return user
  },
  async setPassword (username, password) {
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const result = await db.collection('users')
      .updateOne({ username }, { $set: { passwordHash } })
    return result.modifiedCount
  },
  async createClient (clientId, redirectUri, name) {
    const client = { clientId, name }
    client.redirectUri = Array.isArray(redirectUri)
      ? redirectUri
      : [redirectUri]
    await db.collection('clients')
      .insertOne(client, { forceServerObjectId: true })
    return client
  },
  getRemoteClient (domain) {
    return db.collection('remotes').findOne({ domain })
  },
  async saveRemoteClient (domain, client) {
    const result = await db.collection('remotes').insertOne({
      domain,
      clientId: client.clientId,
      redirectUri: client.redirectUri
    })
    if (!result.insertedCount) { throw new Error('Error saving remove client') }
  }

}
