#!/usr/bin/env node
'use strict'
import { getPrivateKey, getJwt, getHttpClient, logErrors, getYargs } from './common.mjs'
import { appSettings } from '../src/settings.js'

const { domain } = appSettings
const yargs = getYargs(process.argv)
const argv = await yargs
  .default('ssl-check', true)
  .default('key', './immersAdminPrivateKey.pem')
  .option('username', { type: 'string', require: true })
  .option('email', { type: 'string', require: true })
  .alias('u', 'username')
  .alias('e', 'email')
  .argv
const immersAdminPrivateKey = getPrivateKey(argv.key)
if (!immersAdminPrivateKey) {
  console.error('Error reading key file.')
  process.exit(1)
}
const auth = getJwt(domain, immersAdminPrivateKey)
const sslCheck = argv.sslCheck === true || argv.sslCheck.toLowerCase() === 'true'
const httpClient = getHttpClient(sslCheck)
await httpClient.post(
  `https://${domain}/auth/user`,
  {
    username: argv.username,
    email: argv.email
  },
  { headers: { Authorization: `Bearer ${auth}` } }
).then(res => {
  console.log(`User successfully created: https://${domain}/u/${argv.username}`)
}).catch((e) => {
  logErrors(e)
  process.exit(1)
})
