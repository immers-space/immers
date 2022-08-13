require('dotenv-defaults').config()
const {
  dbHost,
  dbPort,
  dbName,
  dbString
} = process.env
// fallback to building string from parts for backwards compat
const mongoURI = dbString || `mongodb://${dbHost}:${dbPort}/${dbName}`

const config = {
  mongodb: {
    // the default below is overriden with config when migrate is called from index.js
    url: mongoURI,

    options: {
      useNewUrlParser: true, // removes a deprecation warning when connecting
      useUnifiedTopology: true // removes a deprecating warning when connecting
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: 'migrations',

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: 'changelog',

  // The file extension to create migrations and search for in migration dir
  migrationFileExtension: '.js'
}

// Return the config as a promise
module.exports = config
