const fs = require('fs')
const path = require('path')
const { parseDomain, ParseResultType } = require('parse-domain')

module.exports = {
  parseHandle,
  parseProxyMode,
  debugOutput,
  apexDomain,
  readStaticFileSync
}

function debugOutput (app) {
  const l = (activity) => {
    const obj = activity.object?.[0]?.id ?? activity.object?.[0]
    const target = activity.target?.[0]?.id ?? activity.target?.[0]
    return `${activity.type}: from ${activity.actor[0].id ?? activity.actor[0]} to ${activity.to} obj ${obj} target ${target}`
  }
  app.on('apex-inbox', msg => console.log('---inbox----------\n', l(msg.activity)))
  app.on('apex-outbox', msg => console.log('---outbox---------\n', l(msg.activity)))
}

const handleReg = /([^@[]+)[@[]([^\]]+)/

function parseHandle (handle) {
  const match = handleReg.exec(handle)
  if (match && match.length === 3) {
    return {
      username: match[1],
      immer: match[2]
    }
  }
}

function parseProxyMode (proxyMode) {
  try {
    // boolean or number
    return JSON.parse(proxyMode)
  } catch (ignore) {}
  // string
  return proxyMode
}

function apexDomain (domain) {
  try {
    const url = new URL(`https://${domain}`)
    // use url.hostname to strip port from domain
    const parsedDomain = parseDomain(url.hostname)
    return parsedDomain.type === ParseResultType.Listed
      ? [parsedDomain.domain, ...parsedDomain.topLevelDomains].join('.')
      : url.hostname
  } catch (err) {
    console.warn(`Unable to parse apex domain: ${err.message}`)
    return domain
  }
}

/** Find a file in either local or docker static folder and readFileSync it  */
function readStaticFileSync (file) {
  if (!file) {
    return
  }
  if (fs.existsSync(path.join(__dirname, '..', 'static-ext', file))) {
    // docker volume location
    return fs.readFileSync(path.join(__dirname, '..', 'static-ext', file), 'utf8')
  } else if (fs.existsSync(path.join(__dirname, '..', 'static', file))) {
    // internal default
    return fs.readFileSync(path.join(__dirname, '..', 'static', file), 'utf8')
  }
}
