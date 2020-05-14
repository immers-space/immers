module.exports = function (store) {
  return {
    clients: {
      // deserialize
      findById (id, cb) {

      },
      // exchange, authorization,
      findByClientId (clientId, cb) {

      }
    },
    users: {
      findByUsername (username, cb) {

      }
    },
    authorizationCodes: {
      save (code, clientId, redirectUri, userId, username, cb) {

      },
      find (code, cb) {

      }
    },
    accessTokens: {
      save (token, userId, clientId, cb) {

      },
      findByUserIdAndClientId (useId, clientId, cb) {

      }
    }
  }
}