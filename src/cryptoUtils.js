const crypto = require('crypto')
const x509 = require('@peculiar/x509')
const { mkdir, readFile, writeFile } = require('fs/promises')
const path = require('path')

module.exports = {
  createSelfSignedCertificate,
  getLocalDevCertificate,
  hashEmail
}

async function getLocalDevCertificate () {
  try {
    const certificate = await readFile(path.join(process.cwd(), 'certs', 'certificate.pem'))
    const privateKey = await readFile(path.join(process.cwd(), 'certs', 'pivateKey.pem'))
    return { certificate, privateKey }
  } catch {
    const { certificate, privateKey } = await createSelfSignedCertificate()
    await mkdir(path.join(process.cwd(), 'certs'), { recursive: true })
    await writeFile(path.join(process.cwd(), 'certs', 'certificate.pem'), certificate)
    await writeFile(path.join(process.cwd(), 'certs', 'pivateKey.pem'), privateKey)
    return { certificate, privateKey }
  }
}

function hashEmail (email) {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('base64')
}

async function createSelfSignedCertificate (name = 'localhost', number = '01') {
  x509.cryptoProvider.set(crypto.webcrypto)
  const alg = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048
  }
  const notAfter = new Date()
  notAfter.setUTCFullYear(notAfter.getUTCFullYear() + 10)
  const usages = x509.KeyUsageFlags.nonRepudiation |
    x509.KeyUsageFlags.digitalSignature |
    x509.KeyUsageFlags.keyEncipherment |
    x509.KeyUsageFlags.keyAgreement
  const keys = await crypto.webcrypto.subtle.generateKey(alg, true, ['sign', 'verify'])
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: number,
    name: `CN=${name}`,
    notBefore: new Date(),
    notAfter,
    signingAlgorithm: alg,
    keys,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(usages, true),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey)
    ]
  })
  const publicKey = webKeyToPem(keys.publicKey, false)
  const privateKey = webKeyToPem(keys.privateKey, true)
  return { certificate: cert.toString('pem'), publicKey, privateKey }
}

function webKeyToPem (cryptoKey, isPrivate) {
  return crypto.KeyObject
    .from(cryptoKey)
    .export({ type: isPrivate ? 'pkcs8' : 'spki', format: 'pem' })
    .toString()
}
