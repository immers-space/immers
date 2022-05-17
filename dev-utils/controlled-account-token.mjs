#!/usr/bin/env node
'use strict'
import { getPrivateKey, getJwt, getHttpClient, logErrors, getYargs } from './common.mjs'
import 'dotenv/config'

const { domain, hub } = process.env
const yargs = getYargs(process.argv)
const argv = await yargs
  .default('ssl-check', true)
  .default('key', './immersAdminPrivateKey.pem')
  .option('immer-handle', { type: 'string', require: true })
  .alias('i', 'immer-handle')
  .example('$0 --i "test[localhost:8081]" --ssl-check false')
  .argv
const immersAdminPrivateKey = getPrivateKey(argv.key)
if (!immersAdminPrivateKey) {
  console.error('Error reading key file.')
  process.exit(1)
}
const payload = { scope: '*', origin: hub }
const options = { audience: `https://${domain}/o/immer`, subject: argv.i }
const oAuthJwt = getJwt(domain, immersAdminPrivateKey, payload, options)

const sslCheck = argv.sslCheck === true || argv.sslCheck.toLowerCase() === 'true'
const httpClient = getHttpClient(sslCheck)
await httpClient.post(
    `https://${domain}/auth/exchange`,
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: oAuthJwt
    }).toString()
).then(response => {
  const { accessToken, scope } = response.data
  console.log(`access_token: ${accessToken}`)
  console.log(`scope: ${scope}`)
}).catch((e) => {
  logErrors(e)
  process.exit(1)
})
