const { escape, unescape } = require('mongo-escape')
const merge = require('deepmerge')

function escapeClone (obj) {
  return escape(merge({}, obj))
}

const collections = [
  'Grant', 'Session', 'AccessToken',
  'AuthorizationCode', 'RefreshToken', 'ClientCredentials', 'Client', 'InitialAccessToken',
  'RegistrationAccessToken', 'DeviceCode', 'Interaction', 'ReplayDetection',
  'BackchannelAuthenticationRequest', 'PushedAuthorizationRequest'
]
const grantIdCollections = new Set([
  'AccessToken', 'AuthorizationCode', 'RefreshToken', 'DeviceCode', 'BackchannelAuthenticationRequest'
])
const userCodeCollections = new Set(['DeviceCode'])
const uidCollections = new Set(['Session'])

class MongoAdapter {
  constructor (name) {
    this.name = `oidcServer_${name}`
    /**
     * Workaround oidc-provider requirement that dabatase be connected
     * before you can initailize Provider and get its router
     * by waiting for initialization in all methods that access DB
     */
    this.coll = new Promise(resolve => {
      const ready = () => resolve(MongoAdapter.DB.collection(this.name))
      if (MongoAdapter.DB) {
        ready()
      } else {
        MongoAdapter.InitializedResolvers.add(ready)
      }
    })
  }

  async upsert (_id, payload, expiresIn) {
    const payloadEsc = escapeClone(payload)

    if (expiresIn) {
      payloadEsc.expiresAt = new Date(Date.now() + (expiresIn * 1000))
    }

    await (await this.coll).updateOne(
      { _id },
      { $set: { payload: payloadEsc } },
      { upsert: true }
    )
  }

  async find (_id) {
    const result = await (await this.coll).find(
      { _id },
      { payload: 1 }
    ).limit(1).next()

    if (!result) return undefined
    return unescape(result.payload)
  }

  async findByUserCode (userCode) {
    const result = await (await this.coll).find(
      { 'payload.userCode': userCode },
      { payload: 1 }
    ).limit(1).next()

    if (!result) return undefined
    return unescape(result.payload)
  }

  async findByUid (uid) {
    const result = await (await this.coll).find(
      { 'payload.uid': uid },
      { payload: 1 }
    ).limit(1).next()

    if (!result) return undefined
    return unescape(result.payload)
  }

  async destroy (_id) {
    await (await this.coll).deleteOne({ _id })
  }

  async revokeByGrantId (grantId) {
    await (await this.coll).deleteMany({ 'payload.grantId': grantId })
  }

  async consume (_id) {
    await (await this.coll).findOneAndUpdate(
      { _id },
      { $set: { 'payload.consumed': Math.floor(Date.now() / 1000) } }
    )
  }

  static DB
  static InitializedResolvers = new Set()
  static Initialize (db) {
    const indexPromises = collections.map(name => {
      return db.collection(name).createIndexes([
        ...(grantIdCollections.has(name)
          ? [{
              key: { 'payload.grantId': 1 }
            }]
          : []),
        ...(userCodeCollections.has(name)
          ? [{
              key: { 'payload.userCode': 1 },
              unique: true
            }]
          : []),
        ...(uidCollections.has(name)
          ? [{
              key: { 'payload.uid': 1 },
              unique: true
            }]
          : []),
        {
          key: { expiresAt: 1 },
          expireAfterSeconds: 0
        }
      ])
    })
    return Promise.all(indexPromises).then(() => {
      MongoAdapter.DB = db
      MongoAdapter.InitializedResolvers.forEach(resolver => resolver())
    })
  }
}

module.exports = { MongoAdapter }
