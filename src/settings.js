'use strict'
require('dotenv-defaults').config()
const { readStaticFileSync, parseProxyMode } = require('./utils')

const {
  additionalContext,
  adminEmail,
  backgroundColor,
  backgroundImage,
  baseTheme,
  caPath,
  certPath,
  cookieName,
  customCSS,
  dbHost,
  dbName,
  dbPort,
  dbString,
  domain,
  easySecret,
  emailOptInNameParam,
  emailOptInParam,
  emailOptInURL,
  enableClientRegistration,
  enablePublicRegistration,
  googleFont,
  homepage,
  hub,
  icon,
  imageAttributionText,
  imageAttributionUrl,
  keyPath,
  loginRedirect,
  maxUploadSize,
  monetizationPointer,
  name,
  port,
  proxyMode,
  sessionSecret,
  smtpFrom,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
  systemDisplayName,
  systemUserName,
  welcome
} = process.env

const welcomeContent = readStaticFileSync(welcome)
const hubs = hub.split(',')
// fallback to building string from parts for backwards compat
const mongoURI = dbString || `mongodb://${dbHost}:${dbPort}/${dbName}`

const appSettings = {
  additionalContext,
  adminEmail,
  backgroundColor,
  backgroundImage,
  baseTheme,
  caPath,
  certPath,
  cookieName,
  customCSS,
  domain,
  easySecret,
  emailOptInNameParam,
  emailOptInParam,
  emailOptInURL,
  enableClientRegistration,
  enablePublicRegistration,
  googleFont,
  homepage,
  hubs,
  icon,
  imageAttributionText,
  imageAttributionUrl,
  keyPath,
  loginRedirect,
  maxUploadSize,
  monetizationPointer,
  mongoURI,
  name,
  port,
  proxyMode: parseProxyMode(proxyMode),
  sessionSecret,
  smtpFrom,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
  systemDisplayName,
  systemUserName,
  welcomeContent
}

const renderConfig = {
  name,
  domain,
  hub: hubs,
  homepage,
  monetizationPointer,
  googleFont,
  backgroundColor,
  backgroundImage,
  baseTheme,
  customCSS,
  icon,
  imageAttributionText,
  imageAttributionUrl,
  emailOptInURL,
  enablePublicRegistration
}

const isTrue = (settingName) => {
  return isEqualTo(settingName, 'true')
}

const isFalse = (settingName) => {
  return isEqualTo(settingName, 'false')
}

const isEqualTo = (settingName, value) => {
  return (req, res, next) => {
    if (appSettings[settingName] !== value) {
      const validMessage = 'Method unavailable due to Immers configuration.'
      return res.status(405).format({
        text: () => res.send(validMessage),
        json: () => res.json({ error: validMessage })
      })
    }
    next()
  }
}

module.exports = {
  appSettings,
  renderConfig,
  isTrue,
  isFalse,
  isEqualTo
}
