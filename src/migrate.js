const {
  database,
  config,
  up
} = require('migrate-mongo')

module.exports.migrate = async function migrate (mongoURI) {
  let db
  let client
  const conf = await config.read()
  conf.mongodb.url = mongoURI
  config.set(conf)
  try {
    ;({ db, client } = await database.connect())
    const migrated = await up(db, client)
    if (migrated.length) {
      migrated.forEach(fileName => console.log('Migrated:', fileName))
    } else {
      console.log('No pending migrations')
    }
  } catch (err) {
    await client.close()
    throw err
  }
  return client.close()
}
