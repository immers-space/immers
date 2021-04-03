const { apex, createImmersActor } = require('../src/apex')

module.exports = {
  async up (db, client) {
    apex.store.db = db
    apex.offlineMode = true // outbox items are queued but not delivered
    const users = await db.collection('users')
      .find({})
      .project({ _id: 0, username: 1 })
      .toArray()
    return Promise.all(users.map(async user => {
      const actor = await apex.store
        .getObject(apex.utils.usernameToIRI(user.username), true)
      const newActor = await createImmersActor(actor.preferredUsername[0], actor.name)
      // preserve existing keypair
      newActor._meta = actor._meta
      newActor.publicKey = actor.publicKey
      await apex.store.updateObject(newActor, newActor.id, true)
      return apex.publishUpdate(newActor, newActor)
    }))
  },

  async down (db, client) {
    // can't completely undo update
    return Promise.resolve('ok')
  }
}
