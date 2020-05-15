'use strict'

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy
const authdb = require('./authdb')

passport.serializeUser(authdb.serializeUser)
passport.deserializeUser(authdb.deserializeUser)
// login with username/password during authentication request
passport.use(new LocalStrategy(authdb.validateUser))
// token use
passport.use(new BearerStrategy(authdb.validateAccessToken))
// allow passthrough for routes with public info
passport.use(new AnonymousStrategy())
