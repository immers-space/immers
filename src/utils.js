module.exports = {
  parseHandle,
  debugOutput
}

function debugOutput (app) {
  const l = (activity) => {
    const obj = activity.object?.[0]?.id ?? activity.object?.[0]
    const target = activity.target?.[0]?.id ?? activity.target?.[0]
    return `${activity.type}: from ${activity.actor} to ${activity.to} obj ${obj} target ${target}`
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
