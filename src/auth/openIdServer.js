// const { router } = require()
const { Provider } = require('oidc-provider')
const { OICD_ISSUER_REL } = require('./consts')
const { ObjectId } = require('mongodb')
const uid = require('uid-safe')
const { domain, proxyMode, sessionSecret, enableClientRegistration } = process.env
const configuration = {
  routes: {
    authorization: '/authorize',
    backchannel_authentication: '/backchannel',
    code_verification: '/device',
    device_authorization: '/device/auth',
    end_session: '/session/end',
    introspection: '/token/introspection',
    jwks: '/jwks',
    pushed_authorization_request: '/request',
    registration: '/client',
    revocation: '/token/revocation',
    token: '/token',
    userinfo: '/me'
  },
  clients: [],
  cookies: {
    keys: [sessionSecret]
  },
  features: {
    registration: {
      enabled: enableClientRegistration,
      idFactory: () => new ObjectId().toString(),
      initialAccessToken: false,
      issueRegistrationAccessToken: true,
      policies: undefined,
      secretFactory: () => uid(128)
    }
  }
}

const oidc = new Provider(`https://${domain}`, configuration)
// match app proxy config
oidc.proxy = !!proxyMode

/// exports ///
module.exports = {
  router: oidc.callback(),
  webfingerPassIfNotIssuer,
  webfingerRespond
}

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
