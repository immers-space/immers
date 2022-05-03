'use strict'
require('dotenv-defaults').config()
const { apex, createImmersActor } = require('../src/apex')

module.exports = {
  async up (db, client) {
    apex.store.db = db
    apex.offlineMode = true // outbox items are queued but not delivered

    const users = await db.collection('users')
      .find({})
      .project({ _id: 0, username: 1 })
      .toArray()
    const session = client.startSession()
    try {
      await session.withTransaction(() => {
        return Promise.all(users.map(async user => {
          const actor = await apex.store
            .getObject(apex.utils.usernameToIRI(user.username), true)
          const tempActor = await createImmersActor(actor.preferredUsername[0], actor.name[0])
          const endpoints = [Object.assign(actor.endpoints?.[0] || {}, tempActor.endpoints[0])]
          const streams = [Object.assign(actor.streams?.[0] || {}, tempActor.streams[0])]
          await apex.store.updateObject({ id: actor.id, endpoints, streams }, actor.id, false)
          const newActor = await apex.store.getObject(actor.id, true)
          return apex.publishUpdate(newActor, newActor)
        }))
      })
    } finally {
      await session.endSession()
    }
  },

  async down (db, client) {
    apex.store.db = db
    apex.offlineMode = true // outbox items are queued but not delivered

    const users = await db.collection('users')
      .find({})
      .project({ _id: 0, username: 1 })
      .toArray()
    const session = client.startSession()
    try {
      await session.withTransaction(() => {
        return Promise.all(users.map(async user => {
          const actor = await apex.store
            .getObject(apex.utils.usernameToIRI(user.username), true)
          const { endpoints, streams } = actor
          delete endpoints[0].proxyUrl
          delete streams[0].blocklist
          await apex.store.updateObject({ id: actor.id, endpoints, streams }, actor.id, false)
          const newActor = await apex.store.getObject(actor.id, true)
          return apex.publishUpdate(newActor, newActor)
        }))
      })
    } finally {
      await session.endSession()
    }
  }
}
