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
  handleOAuthReturn
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
    console.log(issuer, client)
    const codeVerifier = generators.codeVerifier()
    req.session.oicdClientState = { codeVerifier, clientDomain: immer }
    // store the code_verifier in your framework's session mechanism, if it is a cookie based solution
    // it should be httpOnly (not readable by javascript) and encrypted.
    const codeChallenge = generators.codeChallenge(codeVerifier)
    const redirect = client.authorizationUrl({
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: `https://${domain}/auth/return`
    })
    console.log('result', codeVerifier, redirect)
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
  const { codeVerifier, clientDomain } = req.session.oicdClientState
  const savedClient = await authdb.oidcGetRemoteClient(clientDomain)
  const issuer = new Issuer(savedClient.issuer)
  const client = new issuer.Client(savedClient.client)
  const params = client.callbackParams(req)
  const tokenSet = await client.callback(`https://${domain}/auth/return`, params, { code_verifier: codeVerifier })
  console.log('received and validated tokens %j', tokenSet)
  console.log('validated ID Token claims %j', tokenSet.claims())
  // const userinfo = await client.userinfo(access_token)
  // console.log('userinfo %j', userinfo)
  // And later refresh the tokenSet if it had a refresh_token.

  // const newTokenSet = await client.refresh(refresh_token)
  // console.log('refreshed and validated tokens %j', newTokenSet)
  // console.log('refreshed ID Token claims %j', newTokenSet.claims())

  // TODO: redirect to session.returnTo, with token in hashparams
  res.send('OK')
}
