'use strict'
/**
 * OAuth2 Client
 * Connects to the home immer of visiting immersers,
 * requesting access tokens from their immers' authorization server
 * in order to accesss their account and post activities on their behalf
 */
const request = require('request-promise-native')
const { Issuer } = require('openid-client')
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
  checkImmer
}

/// utils ///
async function checkImmer (req, res, next) {
  let { username, immer } = req.query
  if (!(username && immer)) { return res.status(400).send('Missing user handle') }
  immer = immer.toLowerCase()
  username = username.toLowerCase()
  // OpenId Connect Discovery
  try {
    // TODO: check if client already saved
    // else discover and register new client
    const issuer = await Issuer.webfinger(`acct:${username}@${immer}`)
    console.log(issuer)
    if (!issuer.registration_endpoint) { /* dyn client reg not supported */ }
    const client = await issuer.Client.register({
      client_name: name,
      logo_uri: `https://${domain}/static/${icon}`,
      client_uri: `https://${domain}`,
      redirect_uris: hubs.map(h => `https://${h}`)
      // response_types: [],
      // grant_types: [],
    })
    console.log('client', client)
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
