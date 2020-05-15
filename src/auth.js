'use strict'

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const db = require('../db')

/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(new LocalStrategy(
  (username, password, done) => {
    db.users.findByUsername(username, (error, user) => {
      if (error) return done(error)
      if (!user) return done(null, false)
      if (user.password !== password) return done(null, false)
      return done(null, user)
    })
  }
))

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser((id, done) => {
  db.users.findById(id, (error, user) => done(error, user))
})

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate either users or clients based on an access token
 * (aka a bearer token). If a user, they must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 */
passport.use(new BearerStrategy(
  (accessToken, done) => {
    db.accessTokens.find(accessToken, (error, token) => {
      if (error) return done(error)
      if (!token) return done(null, false)
      if (token.userId) {
        db.users.findById(token.userId, (error, user) => {
          if (error) return done(error)
          if (!user) return done(null, false)
          // To keep this example simple, restricted scopes are not implemented,
          // and this is just for illustrative purposes.
          done(null, user, { scope: '*' })
        })
      } else {
        // The request came from a client only since userId is null,
        // therefore the client is passed back instead of a user.
        db.clients.findByClientId(token.clientId, (error, client) => {
          if (error) return done(error)
          if (!client) return done(null, false)
          // To keep this example simple, restricted scopes are not implemented,
          // and this is just for illustrative purposes.
          done(null, client, { scope: '*' })
        })
      }
    })
  }
))
