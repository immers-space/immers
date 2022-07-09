// const { router } = require()
const { Provider } = require('oidc-provider')
const { OICD_ISSUER_REL } = require('./consts')
const { ObjectId } = require('mongodb')
const uid = require('uid-safe')
const authdb = require('./authdb')
const { apex } = require('../apex')
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
  },
  findAccount
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

/// utils ///
async function findAccount (ctx, sub, token) {
  // @param ctx - koa request context
  // @param sub {string} - account identifier (subject)
  // @param token - is a reference to the token used for which a given account is being loaded,
  //   is undefined in scenarios where claims are returned from authorization endpoint
  const user = await authdb.getUserByName(sub.replace(`https://${domain}/u/`, ''))
  if (!user) {
    return null
  }
  // we don't save user emails; fill in immers handle instead
  const email = `${user.username}@${domain}`
  return {
    accountId: sub,
    // @param use {string} - can either be "id_token" or "userinfo", depending on
    //   where the specific claims are intended to be put in
    // @param scope {string} - the intended scope, while oidc-provider will mask
    //   claims depending on the scope automatically you might want to skip
    //   loading some claims from external resources or through db projection etc. based on this
    //   detail or not return them in ID Tokens but only UserInfo and so on
    // @param claims {object} - the part of the claims authorization parameter for either
    //   "id_token" or "userinfo" (depends on the "use" param)
    // @param rejected {Array[String]} - claim names that were rejected by the end-user, you might
    //   want to skip loading some claims from external resources or through db projection
    async claims (use, scope, claims, rejected) {
      const result = { sub, email }
      if (use === 'userinfo') {
        result.profile = await apex.toJSONLD(await apex.store.getObject(sub, false))
      }
      console.log('OIDC CLAIMS:', result)
      return result
    }
  }
}
