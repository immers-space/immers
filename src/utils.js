const { parseDomain, ParseResultType } = require('parse-domain')

module.exports = {
  parseHandle,
  parseProxyMode,
  debugOutput,
  apexDomain
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
