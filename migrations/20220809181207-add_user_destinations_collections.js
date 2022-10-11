'use strict'
require('dotenv-defaults').config()
const { apex, refreshAndUpdateActorObject } = require('../src/apex')

const { domain } = process.env
const destinationsPrefix = `https://${domain}/u/`

module.exports = {
  async up (db, client) {
    apex.store.db = db
    apex.offlineMode = true // outbox items are queued but not delivered

    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        // add destinations & friendsDestinations to actor.streams for existing users
        const usersCursor = db.collection('users')
          .find({})
          .project({ _id: 0, username: 1 })
        for await (const user of usersCursor) {
          await refreshAndUpdateActorObject(user)
        }
        // add existing Arrive activitities to destinations/friendsDestinations collections
        const arrivesCursor = db.collection('streams').find({ type: 'Arrive' })
        for await (const arrive of arrivesCursor) {
          const newCols = []
          arrive._meta.collection?.forEach(col => {
            const colInfo = apex.utils.iriToCollectionInfo(col)
            if (colInfo?.name === 'inbox') {
              // for every inbox collection, add a friendsDestinations collection
              newCols.push(`https://${domain}/u/${colInfo.actor}/friends-destinations`)
            } else if (colInfo?.name === 'outbox') {
              // for every outbox collection, add a destinations collection
              newCols.push(`https://${domain}/u/${colInfo.actor}/destinations`)
            }
          })
          if (newCols.length) {
            await apex.store.updateActivityMeta(arrive, 'collection', { $each: newCols })
          }
        }
      })
    } finally {
      await session.endSession()
    }
  },

  async down (db, client) {
    apex.store.db = db
    apex.offlineMode = true // outbox items are queued but not delivered

    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        const usersCursor = db.collection('users')
          .find({})
          .project({ _id: 0, username: 1 })
        for await (const user of usersCursor) {
          await db.collection('objects')
            .updateOne({ id: apex.utils.usernameToIRI(user.username) }, { $unset: { destinations: '', friendsDestinations: '' } })
        }
        // remove Arrive activitities from destinations/friendsDestinations collections
        const arrivesCursor = db.collection('streams').find({ type: 'Arrive' })
        for await (const arrive of arrivesCursor) {
          const oldCols = []
          arrive._meta.collection?.forEach(col => {
            if (
              col.startsWith(destinationsPrefix) &&
              (col.endsWith('destinations') || col.endsWith('friends-destinations'))
            ) {
              oldCols.push(col)
            }
          })
          if (oldCols.length) {
            await apex.store.updateActivityMeta(arrive, 'collection', { $in: oldCols }, true)
          }
        }
      })
    } finally {
      await session.endSession()
    }
  }
}
