'use strict'
/**
 * OAuth2 Client
 * Connects to the home immer of visiting immersers,
 * requesting access tokens from their immers' authorization server
 * in order to accesss their account and post activities on their behalf
 */
const request = require('request-promise-native')
const { Issuer, generators } = require('openid-client')
const saml = require('samlify')
const validator = require('@authenio/samlify-node-xmllint')
const { appSettings } = require('../settings')
const authdb = require('./authdb')
const { scopes } = require('../../common/scopes')
const { parseHandle } = require('../utils')
const { CLIENT_TYPES } = require('./consts')

const {
  domain,
  name,
  hubs,
  icon
} = appSettings

/// exports ///
module.exports = {
  checkImmer,
  checkImmerAndRedirect,
  handleOAuthReturn: [parseOAuthReturn, handleSsoLogin],
  handleSamlReturn: [parseSamlReturn, handleSsoLogin],
  oidcPreRegister,
  oidcPostRegister,
  oidcPostMerge,
  samlServiceProviderMetadata
}

/// side effects ///
saml.setSchemaValidator(validator)

/// utils ///
async function checkImmer (req, res, next) {
  const { username, immer } = req.query
  if (!(username && immer)) { return res.status(400).send('Missing user handle') }
  try {
    const { result, oidcClientState } = await discoverAndRegisterClient(username, immer, req.session?.returnTo)
    if (oidcClientState) {
      req.session.oidcClientState = oidcClientState
    }
    res.json(result)
  } catch (err) { next(err) }
}

/**
 * this can shortcut the auth-login flow by taking a user directly to
 * their home immer login without rendering our local login if
 * we know who they are
 */
async function checkImmerAndRedirect (req, res, next) {
  if (!req.session?.handle) {
    return next()
  }
  try {
    const { username, immer } = parseHandle(req.session.handle)
    const { result, oidcClientState } = await discoverAndRegisterClient(username, immer, req.session.returnTo)
    if (oidcClientState) {
      req.session.oidcClientState = oidcClientState
    }
    if (result.redirect) {
      return res.redirect(result.redirect)
    }
    return next()
  } catch (e) {
    console.error('Error checking immer:', e)
    // continue on to login page
    next()
  }
}

async function discoverAndRegisterClient (username, userDomain, requestedPath) {
  userDomain = userDomain.toLowerCase()
  username = username.toLowerCase()

  if (userDomain === domain.toLowerCase()) {
    return { result: { local: true } }
  }

  let savedClient = await authdb.getRemoteClient(userDomain)
  // attempt to discover new provider if not known
  if (!savedClient) {
    // try OpenId Connect Discovery first
    try {
      // else discover and register new client
      const issuer = await Issuer.webfinger(`acct:${username}@${userDomain}`)
      if (!issuer.registration_endpoint) {
        throw new Error(`${userDomain} does not support dynamic client registration`)
      }
      const client = await issuer.Client.register({
        client_name: name,
        logo_uri: `https://${domain}/static/${icon}`,
        client_uri: `https://${domain}`,
        redirect_uris: [`https://${domain}/auth/return`]
        // response_types: [],
        // grant_types: [],
      })
      savedClient = await authdb
        .saveRemoteClient(userDomain, CLIENT_TYPES.OIDC, issuer.metadata, client.metadata)
    } catch (err) {
      console.error(err)
    }
    // fallback to immers legacy discovery, error out if not available
    const client = await request(`https://${userDomain}/auth/client`, {
      method: 'POST',
      body: {
        name,
        clientId: `https://${domain}/o/immer`,
        redirectUri: hubs.map(h => `https://${h}`)
      },
      json: true
    })
    savedClient = await authdb
      .saveRemoteClient(userDomain, CLIENT_TYPES.IMMERS, null, client)
  }

  // authorize with the retreived or newly registered provider
  switch (savedClient.type) {
    case CLIENT_TYPES.OIDC: {
      const issuer = new Issuer(savedClient.issuer)
      const client = new issuer.Client(savedClient.client)
      const codeVerifier = generators.codeVerifier()
      const oidcClientState = { codeVerifier, providerDomain: userDomain, type: CLIENT_TYPES.OIDC }
      const codeChallenge = generators.codeChallenge(codeVerifier)
      const redirect = client.authorizationUrl({
        // TODO: check issuer.scopes_supported to determine if the remote client is a full immer or just an identity provider,
        // update scope request to match
        scope: 'openid email',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        redirect_uri: `https://${domain}/auth/return`
      })
      return { result: { redirect }, oidcClientState }
    }
    case CLIENT_TYPES.SAML: {
      const idp = saml.IdentityProvider(savedClient.issuer)
      const sp = saml.ServiceProvider(await authdb.getSamlServiceProvider(true))
      // awkward api for RelayState - will change in future samlify version
      sp.entitySetting.relayState = userDomain
      const { context } = await sp.createLoginRequest(idp, 'redirect')
      return { result: { redirect: context } }
    }
    case CLIENT_TYPES.IMMERS: {
      /* requestedPath is /auth/authorize with client_id and redirect_uri for the destination immer
        * so users are sent home to login and authorize the destination immer as a client,
        * then come back the same room on the desination with their token
        */
      const url = new URL(`https://${userDomain}${requestedPath || '/'}`)
      const search = new URLSearchParams(url.search)
      // handle may or may not be included depending on path here, ensure it is
      search.set('me', `${username}[${userDomain}]`)
      url.search = search.toString()
      return { result: { redirect: url.toString() } }
    }
  }
}

async function parseOAuthReturn (req, res, next) {
  try {
    const { codeVerifier, providerDomain } = req.session.oidcClientState
    delete req.session.oidcClientState
    const savedClient = await authdb.getRemoteClient(providerDomain)
    const issuer = new Issuer(savedClient.issuer)
    const client = new issuer.Client(savedClient.client)
    const params = client.callbackParams(req)
    const tokenSet = await client
      .callback(`https://${domain}/auth/return`, params, { code_verifier: codeVerifier })
    const scopesGranted = tokenSet.scope?.split(' ') || []
    const claims = tokenSet.claims()
    if (scopesGranted.includes(scopes.viewProfile)) {
      // TODO provider is an immer, pass access_token back to hub (I think maybe ?redirect_uri of req.session.returnTo)
      const userinfo = await client.userinfo(tokenSet.access_token)
      console.log('userinfo %j', userinfo)
      res.sendStatus(501)
    } else if (claims.email) {
      res.locals.ssoState = {
        providerDomain,
        providerName: savedClient.name,
        email: claims.email
      }
      return next()
    }
    throw new Error('OIDC response missing email')
  } catch (err) {
    console.error('Error processing oidc client callback')
    return next(err)
  }
}

async function parseSamlReturn (req, res, next) {
  try {
    const providerDomain = req.body.RelayState
    if (!providerDomain) {
      throw new Error('Assertion response missing RelayState')
    }
    const savedClient = await authdb.getRemoteClient(providerDomain)
    if (!savedClient) {
      throw new Error(`Invalid RelayState: ${providerDomain}`)
    }
    const idp = saml.IdentityProvider(savedClient.issuer)
    const sp = saml.ServiceProvider(await authdb.getSamlServiceProvider(true))
    const { extract } = await sp.parseLoginResponse(idp, 'post', req)
    if (extract.attributes.email) {
      res.locals.ssoState = {
        providerDomain,
        providerName: savedClient.name,
        email: extract.attributes.email
      }
      return next()
    }
    throw new Error('SAML response missing email')
  } catch (err) {
    console.error('Error processing saml client callback')
    return next(err)
  }
}

// find/create local account for identity provider login
async function handleSsoLogin (req, res, next) {
  try {
    const { email, providerDomain, providerName } = res.locals.ssoState
    const user = await authdb.getUserByEmail(email)
    if (!user) {
      req.session.oidcClientState = { email, providerDomain }
      // render page to select username
      return res.redirect('/auth/oidc-interstitial')
    } else if (!user.oidcProviders?.includes(providerDomain)) {
      /* because we allow dynamic client registration, we must take
         care to rule out a malicious provider granting fraudulent
         id_tokens for an email corresponding to a user in our system
         that registered via other means
      */
      req.session.oidcClientState = {
        authorized: true,
        email,
        providerDomain,
        providerName,
        username: user.username
      }
      const search = new URLSearchParams({
        merge: providerDomain,
        name: providerName
      })
      return res.redirect(`/auth/oidc-merge?${search}`)
    }
    // otherwise, login returning user
    // next in route will return to OAuth authorize endpoint, which will autogrant token now that user
    // is logged in with local account and return them to the destination
    req.login(user, next)
  } catch (err) {
    next(err)
  }
}

/** Validate oidc-registration response then pass to normal registration middlewares */
function oidcPreRegister (req, res, next) {
  if (!req.session?.oidcClientState?.email || !req.session.oidcClientState.providerDomain) {
    const err = new Error('Invalid OpenID state: missing email or provider')
    err.status = 403
    throw err
  }
  const { email, providerDomain } = req.session.oidcClientState
  req.body.email = email
  req.body.oidcProviders = [providerDomain]
  next()
}

function oidcPostRegister (req, res, next) {
  delete req.session.oidcClientState
  next()
}

async function oidcPostMerge (req, res, next) {
  try {
    const {
      authorized,
      providerDomain,
      username
    } = req.session.oidcClientState
    if (!(authorized && username && providerDomain)) {
      console.log('Invalid OIDC state for accout merge')
      return res.sendStatus(401)
    }
    const user = await authdb.getUserByName(username)
    if (!user.oidcProviders?.includes(providerDomain)) {
      // still waiting for authorization email link to be clicked
      return res.json({ pending: true })
    }
    delete req.session.oidcClientState
    req.login(user, next)
    // next in route will return to OAuth authorize endpoint, which will autogrant token now that user
    // is logged in with local account and return them to the destination
  } catch (err) {
    console.warn('Error processing OIDC account merge')
    return next(err)
  }
}

async function samlServiceProviderMetadata (req, res, next) {
  try {
    const sp = saml.ServiceProvider(await authdb.getSamlServiceProvider(false))
    res.header('Content-Type', 'text/xml').send(sp.getMetadata())
  } catch (err) {
    next(err)
  }
}
