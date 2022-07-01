// const { router } = require()
const { Provider } = require('oidc-provider')
const { domain } = process.env
const OICD_ISSUER_REL = 'http://openid.net/specs/connect/1.0/issuer'
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

/// exports ///
module.exports = {
  router: oidc.callback(),
  webfingerPassIfNotIssuer,
  webfingerRespond
}

/// utils ///
function webfingerPassIfNotIssuer (req, res, next) {
  if (req.query.rel !== OICD_ISSUER_REL) {
    return next('route')
  }
  next()
}
function webfingerRespond (req, res, next) {
  const resource = req.query.resource
  const actorObj = res.locals.apex.target
  if (!actorObj) {
    return res.status(404).send(`${resource} not found`)
  }
  const sendFinger = () => res.send({
    subject: resource,
    links:
    [
      {
        rel: OICD_ISSUER_REL,
        href: `https://${domain}`
      }
    ]
  })
  res.format({
    'application/json': sendFinger,
    'application/jrd+json': sendFinger
  })
}
