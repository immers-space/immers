'use strict'

const { CLIENT_TYPES } = require('../src/auth/consts')
const REMOTES = 'remotes'
const OIDC_REMOTES = 'oidcRemoteClients'
const NEW_REMOTES = 'remoteClients'

module.exports = {
  /**
   * @param {import('mongodb').Db} db
   * @param {import('mongodb').MongoClient} client
   */
  async up (db, client) {
    const immerClients = await db.collection(REMOTES).find({}).project({ _id: -1 }).toArray()
    const oidcClients = await db.collection(OIDC_REMOTES).find({}).project({ _id: -1 }).toArray()
    const remoteClients = []
    immerClients.forEach(immerClient => {
      const { domain, ...client } = immerClient
      remoteClients.push({
        type: CLIENT_TYPES.IMMERS,
        domain,
        client
      })
    })
    oidcClients.forEach(oidcClient => {
      oidcClient.type = CLIENT_TYPES.OIDC
      if (remoteClients.find(client => client.domain === oidcClient.domain)) {
        console.warn('Could not migrate OIDC client due to duplicate domain', JSON.stringify(oidcClient))
        return
      }
      remoteClients.push(oidcClient)
    })
    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        await db.collection(NEW_REMOTES).createIndex({
          domain: 1
        }, {
          unique: true
        })
        await db.collection(NEW_REMOTES).insertMany(remoteClients)
        await db.collection(REMOTES).drop()
        await db.collection(OIDC_REMOTES).drop()
      })
    } finally {
      await session.endSession()
    }
  },

  async down (db, client) {
    const remoteClients = await db.collection(NEW_REMOTES).find({}).project({ _id: -1 }).toArray()
    const remotes = []
    const oidcRemoteClients = []
    remoteClients.forEach(remoteClient => {
      switch (remoteClient.type) {
        case CLIENT_TYPES.IMMERS: {
          const { domain, client } = remoteClient
          remotes.push({
            domain,
            ...client
          })
          break
        }
        case CLIENT_TYPES.OIDC: {
          delete remoteClient.type
          oidcRemoteClients.push(remoteClient)
          break
        }
        default:
          console.warn('cannot migrate unsupported client type', JSON.stringify(remoteClient))
      }
    })
    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        await db.collection(REMOTES).createIndex({
          domain: 1
        }, {
          unique: true
        })
        await db.collection(OIDC_REMOTES).createIndex({
          domain: 1
        }, {
          unique: true
        })
        await db.collection(REMOTES).insertMany(remotes)
        await db.collection(OIDC_REMOTES).insertMany(oidcRemoteClients)
        await db.collection(NEW_REMOTES).drop()
      })
    } finally {
      await session.endSession()
    }
  }
}
