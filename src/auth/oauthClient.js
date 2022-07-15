'use strict'
/**
 * OAuth2 Client
 * Connects to the home immer of visiting immersers,
 * requesting access tokens from their immers' authorization server
 * in order to accesss their account and post activities on their behalf
 */
const request = require('request-promise-native')
const { Issuer, generators } = require('openid-client')
const authdb = require('./authdb')
const { scopes } = require('../../common/scopes')

const {
  domain,
  name,
  hub,
  icon
} = process.env
const hubs = hub.split(',')

/// exports ///
module.exports = {
  checkImmer,
  handleOAuthReturn,
  oidcPreRegister,
  oidcPostRegister
}

/// utils ///
async function checkImmer (req, res, next) {
  let { username, immer } = req.query
  if (!(username && immer)) { return res.status(400).send('Missing user handle') }
  immer = immer.toLowerCase()
  username = username.toLowerCase()
  // OpenId Connect Discovery
  try {
    let issuer
    let client
    // check if client already saved
    const clientMetadata = await authdb.oidcGetRemoteClient(immer)
    if (clientMetadata) {
      console.info(`loaded existing oidc client for ${immer}`)
      issuer = new Issuer(clientMetadata.issuer)
      client = new issuer.Client(clientMetadata.client)
    } else {
      // else discover and register new client
      issuer = await Issuer.webfinger(`acct:${username}@${immer}`)
      if (!issuer.registration_endpoint) {
        throw new Error(`${immer} does not support dynamic client registration`)
      }
      client = await issuer.Client.register({
        client_name: name,
        logo_uri: `https://${domain}/static/${icon}`,
        client_uri: `https://${domain}`,
        redirect_uris: [`https://${domain}/auth/return`]
        // response_types: [],
        // grant_types: [],
      })
      await authdb.oidcSaveRemoteClient(immer, issuer, client)
    }
    const codeVerifier = generators.codeVerifier()
    req.session.oidcClientState = { codeVerifier, providerDomain: immer }
    const codeChallenge = generators.codeChallenge(codeVerifier)
    const redirect = client.authorizationUrl({
      // TODO: check issuer.scopes_supported to determine if the remote client is a full immer or just an identity provider,
      // update scope request to match
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: `https://${domain}/auth/return`
    })
    return res.json({ redirect })
  } catch (err) {
    console.error(err)
  }

  // legacy immers discovery
  try {
    if (immer === domain.toLowerCase()) {
      return res.json({ local: true })
    }
    let client = await authdb.getRemoteClient(immer)
    if (!client) {
      client = await request(`https://${immer}/auth/client`, {
        method: 'POST',
        body: {
          name,
          clientId: `https://${domain}/o/immer`,
          redirectUri: hubs.map(h => `https://${h}`)
        },
        json: true
      })
      await authdb.saveRemoteClient(immer, client)
    }
    /* returnTo is /auth/authorize with client_id and redirect_uri for the destination immer
     * so users are sent home to login and authorize the destination immer as a client,
     * then come back the same room on the desination with their token
     */
    const url = new URL(`${req.protocol}://${immer}${req.session.returnTo || '/'}`)
    const search = new URLSearchParams(url.search)
    // handle may or may not be included depending on path here, ensure it is
    search.set('me', `${username}[${immer}]`)
    url.search = search.toString()
    return res.json({ redirect: url.toString() })
  } catch (err) { next(err) }
}

async function handleOAuthReturn (req, res, next) {
  try {
    const { codeVerifier, providerDomain } = req.session.oidcClientState
    delete req.session.oidcClientState
    const savedClient = await authdb.oidcGetRemoteClient(providerDomain)
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
      // this is an identity provider, find/create local account
      const user = await authdb.getUserByEmail(claims.email)
      if (!user) {
        req.session.oidcClientState = { email: claims.email, providerDomain }
        return res.redirect('/auth/oidc-interstitial')
      } else if (!user.oidcProviders?.includes(providerDomain)) {
        /* because we allow dynamic client registration, we must take
           care to rule out a malicious provider granting fraudulent
           id_tokens for an email corresponding to a user in our system
           that registered via other means
        */
        // TODO send an easyNoPassword email to get user consent to add this provider
        // TODO render view explaining consent is needed to add new provider to existing account
        return res.status(403).send(`${providerDomain} not authorized for this accout`)
      }
      // establish login session
      req.login(user, next)
      // next in route will return to OAuth authorize endpoint, which will autogrant token now that user
      // is logged in with local account and return them to the destination
    }
  } catch (err) {
    console.error('Error processing oidc client callback')
    return next(err)
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

// And later refresh the tokenSet if it had a refresh_token.
// const newTokenSet = await client.refresh(refresh_token)
// console.log('refreshed and validated tokens %j', newTokenSet)
// console.log('refreshed ID Token claims %j', newTokenSet.claims())
