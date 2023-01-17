const { appSettings } = require('../settings')
const { ObjectId } = require('mongodb')
const uid = require('uid-safe')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { USER_ROLES } = require('./consts')
const { parseHandle } = require('../utils')
const { hashEmail } = require('../cryptoUtils')

const { domain, hubs, name, adminEmail } = appSettings

const saltRounds = 10
const tokenAge = 24 * 60 * 60 * 1000 // one day
const anonClientPrefix = '_anonymous:'

/** @type {import('mongodb').Db} */
let db
const authdb = {
  /**
   * Initialize auth database: creates needed indices, promote admins,
   * update local client
   * @param {import('mongodb').Db} connection Connected mongo database
   */
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
    await db.collection('oidcRemoteClients').createIndex({
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
    await db.collection('clients').findOneAndUpdate({
      clientId: `https://${domain}/o/immer`
    }, {
      $set: {
        name,
        clientId: `https://${domain}/o/immer`,
        redirectUri: hubs.map(h => `https://${h}`),
        isTrusted: true
      }
    }, { upsert: true })

    if (adminEmail) {
      // grant admin access to user specifid in config
      const adminGrant = await db.collection('users').findOneAndUpdate({
        email: hashEmail(adminEmail),
        role: { $ne: USER_ROLES.ADMIN }
      }, {
        $set: {
          role: USER_ROLES.ADMIN
        }
      })
      if (adminGrant.value) {
        console.log(`Granted admin access to ${adminGrant.value.username}, ${adminEmail}`)
      }
    }
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
    if (client._id === 'anonymous') {
      return done(null, `${anonClientPrefix}${JSON.stringify(client)}`)
    }
    done(null, client._id.toString())
  },
  async deserializeClient (id, done) {
    try {
      if (id.startsWith(anonClientPrefix)) {
        return done(null, JSON.parse(id.substring(anonClientPrefix.length)))
      }
      return done(null, await db.collection('clients').findOne({ _id: ObjectId(id) }))
    } catch (err) { done(err) }
  },
  async validateClient (clientId, redirectUriFull, done) {
    try {
      // apparently cast to string somewhere
      if (!clientId || clientId === 'undefined') {
        // anonymous clients can get tokens for their own uri
        const anonClient = { _id: 'anonymous', clientId: 'anonymous', name: '', redirectUri: [redirectUriFull] }
        return done(null, anonClient, redirectUriFull)
      }
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
  // login as client by proving you have the private key matching our saved public key
  async authenticateClientJwt (rawToken, done) {
    let claims
    try {
      claims = jwt.decode(rawToken)
      if (!claims) {
        throw new Error('invalid jwt')
      }
    } catch (err) {
      return done(null, false, 'invalid jwt')
    }
    if (!claims.iss) {
      return done(null, false, 'missing claim: issuer')
    }
    let client
    try {
      client = await db
        .collection('clients')
        .findOne({ clientId: claims.iss })
      if (!client?.jwtPublicKeyPem) {
        return done(null, false)
      }
    } catch (err) {
      return done(err)
    }
    jwt.verify(rawToken, client.jwtPublicKeyPem, (err, verifiedJwt) => {
      if (err) {
        // invalid JWT
        return done(null, false)
      }
      done(null, client, { verifiedJwt })
    })
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
        .insertOne({ token, user, clientId, expiry, tokenType, origin: ares.origin, scope: ares.scope })
      const responseParams = { token_type: tokenType, issuer: ares.issuer, scope: ares.scope.join(' ') }
      if (ares.registrationInfo) {
        Object.assign(responseParams, ares.registrationInfo)
      }
      return done(null, token, responseParams)
    } catch (err) { done(err) }
  },
  async validateAccessToken (token, done) {
    try {
      const tokenDoc = await db.collection('tokens').findOne({ token })
      if (!tokenDoc) { return done(null, false) }
      done(null, tokenDoc.user, { scope: tokenDoc.scope, origin: tokenDoc.origin })
    } catch (err) { done(err) }
  },
  /// immers api methods (promises instead of callbacks)
  // validate a client request to control a user account
  async authorizeAccountControl (client, jwtBearer) {
    if (!client.canControlUserAccounts) {
      throw new Error('forbidden')
    }
    const validatedPayload = await new Promise((resolve, reject) => {
      const jwtRequires = { audience: `https://${domain}/o/immer`, maxAge: '1h' }
      jwt.verify(jwtBearer, client.jwtPublicKeyPem, jwtRequires, async (err, validated) => {
        if (err) {
          console.error(`2LO error verifying jwt: ${err.toString()}`)
          reject(err)
        }
        resolve(validated)
      })
    })
    let user
    try {
      if (validatedPayload.sub) {
        const { username, immer } = parseHandle(validatedPayload.sub)
        if (immer !== domain) {
          throw new Error(`User ${validatedPayload.sub} not from this domain`)
        }
        user = await authdb.getUserByName(username)
      }
      if (!user) {
        throw new Error(`User ${validatedPayload.sub} not found`)
      }
    } catch (err) {
      console.log(`2LO failed user lookup: ${err}`)
      throw new Error('invalid sub claim')
    }
    if (!validatedPayload.scope) {
      throw new Error('missing scope claim')
    }
    return { validatedPayload, user }
  },
  getUserByName (username) {
    username = username.toLowerCase()
    return db.collection('users').findOne({ username })
  },
  getUserByEmail (email) {
    email = hashEmail(email)
    return db.collection('users').findOne({ email })
  },
  async createUser (username, password, email, oidcProviders) {
    const user = { username }
    if (password) {
      user.passwordHash = await bcrypt.hash(password, saltRounds)
    }
    if (Array.isArray(oidcProviders)) {
      user.oidcProviders = oidcProviders
    }
    user.email = hashEmail(email)
    user.role = USER_ROLES.USER
    if (email === adminEmail) {
      console.log(`Granting admin acccess to ${username}, ${adminEmail}`)
      user.role = USER_ROLES.ADMIN
    }
    await db.collection('users').insertOne(user)
    return user
  },
  async setPassword (username, password) {
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const result = await db.collection('users')
      .updateOne({ username }, { $set: { passwordHash } })
    return result.modifiedCount
  },
  async updateUserOidcProvider (username, providerDomain, remove) {
    const operator = remove ? '$pull' : '$addToSet'
    await db.collection('users')
      .updateOne({ username }, { [operator]: { oidcProviders: providerDomain } })
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
    return db.collection('remoteClients').findOne({ domain })
  },
  /**
   * Save a client from another immer or service that can access this server's resource server
   * @param {string} domain host value of the provider url
   * @param {('immers'|'oidc'|'saml')} type client type
   * @param {object} issuer data describing the provider (varies by type)
   * @param {object} client data describing this server's client (e.g. id & key, vaires by type)
   * @param {{ [name]: string, [buttonIcon]: string, [buttonLabel]: string, [showButton]: boolean }} [metadata] data for UI representations
   * @returns {Promise<object>} created/updated client report
   */
  async saveRemoteClient (domain, type, issuer, client, metadata = {}) {
    const data = {
      ...metadata,
      domain,
      type,
      issuer: issuer.metadata,
      client: client.metadata
    }
    const result = await db.collection('remoteClients').insertOne(data)
    if (!result.acknowledged) { throw new Error('Error saving remove client') }
    return data
  },
  async updateRemoteClient (id, update) {
    const result = await db.collection('remoteClients').updateOne(
      { _id: ObjectId(id) },
      { $set: update }
    )
    if (!result.acknowledged) { throw new Error('Error saving remove client') }
  },
  async getOidcLoginProviders () {
    return db.collection('oidcRemoteClients')
      .find({ showButton: true }, { projection: { _id: 0, domain: 1, buttonIcon: 1, buttonLabel: 1 } })
      .toArray()
  }

}

module.exports = authdb
