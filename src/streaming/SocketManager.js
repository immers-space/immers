
class SocketList extends Set {
  add (value) {
    if (typeof value.emit !== 'function') {
      console.warn('Ignoring invalid socket')
      return
    }
    return super.add(value)
  }

  /**
   * Call the emit method for every socket in the set with the provided args
   */
  emitAll (...args) {
    for (const liveSocket of this.values()) {
      liveSocket.emit(...args)
    }
  }
}
/**
 * Map where every value is a SocketList set,
 * created on demand if not existing
 */
class SocketManager extends Map {
  /**
   * @param {string} key actor IRI
   * @returns {SocketList} set of live sockets for this user
   */
  get (key) {
    if (!this.has(key)) {
      this.set(key, new SocketList())
    }
    return super.get(key)
  }
}

module.exports = SocketManager
