#!/usr/bin/env node
'use strict'
import 'dotenv/config'
import crypto from 'crypto'
import { MongoClient } from 'mongodb'
const {
  domain,
  hub,
  name,
  dbHost,
  dbPort,
  dbName,
  dbString
} = process.env
const mongoURI = dbString || `mongodb://${dbHost}:${dbPort}/${dbName}`
const client = new MongoClient(mongoURI)
let exitCode = 0
try {
  await client.connect()
} catch (err) {
  console.error('Unable to connect to database', err)
  process.exit(1)
}
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem'
    }
  })
  await client.db().collection('clients').findOneAndUpdate({
    clientId: `https://${domain}/o/immer`
  }, {
    $set: {
      name,
      clientId: `https://${domain}/o/immer`,
      redirectUri: `https://${hub}`,
      isTrusted: true,
      canControlUserAccounts: true,
      jwtPublicKeyPem: publicKey
    }
  }, { upsert: true })
  console.log(privateKey)
} catch (err) {
  exitCode = 1
  console.error('Error installing key', err)
} finally {
  await client.close()
}
process.exit(exitCode)
