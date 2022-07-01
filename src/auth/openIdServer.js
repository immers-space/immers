const { Provider } = require('oidc-provider')
const configuration = {
  // ... see the available options in Configuration options section
  clients: [{
    client_id: 'foo',
    client_secret: 'bar',
    redirect_uris: ['http://lvh.me:8080/cb']
    // + other client properties
  }]
  // ...
}

const oidc = new Provider('http://localhost:3000', configuration)

// express/nodejs style application callback (req, res, next) for use with express apps, see /examples/express.js

module.exports = {
  router: oidc.callback()
}
