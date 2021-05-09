const crypto = require('crypto')

module.exports = {
  async up (db, client) {
    const users = await db.collection('users')
      .find({})
      .project({ _id: 1, email: 1 })
      .toArray()
    const session = client.startSession()
    try {
      await session.withTransaction(() => {
        return Promise.all(users.map(async user => {
          if (!user.email) {
            return
          }
          return db.collection('users').updateOne({ _id: user._id }, {
            $set: {
              email: crypto.createHash('sha256').update(user.email.toLowerCase()).digest('base64')
            }
          })
        }))
      })
    } finally {
      await session.endSession()
    }
  },

  async down () {
    // can't undo this; that's the point :)
    return Promise.resolve('ok')
  }
}
