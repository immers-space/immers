module.exports = {
  parseHandle
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
