'use strict'
require('dotenv-defaults').config()
const { readStaticFileSync, parseProxyMode } = require('./utils')
const SETTINGS_COL = 'appSettings'
const THEME_SETTING = 'theme'

const {
  additionalContext,
  adminEmail,
  backgroundColor,
  backgroundImage,
  baseTheme,
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
  loginRedirect,
  maxUploadSize,
  monetizationPointer,
  name,
  passEmailToHub,
  port,
  proxyMode,
  sessionSecret,
  smtpFrom,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
  smtpClient,
  smtpKey,
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
  loginRedirect,
  maxUploadSize,
  monetizationPointer,
  mongoURI,
  name,
  passEmailToHub: passEmailToHub === 'true',
  port,
  proxyMode: parseProxyMode(proxyMode),
  sessionSecret,
  smtpFrom,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUser,
  smtpClient,
  smtpKey,
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
  customTheme: '', // loaded from DB
  icon,
  imageAttributionText,
  imageAttributionUrl,
  emailOptInURL,
  enablePublicRegistration,
  passEmailToHub: appSettings.passEmailToHub
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
  isEqualTo,
  updateRenderConfigFromDb,
  updateThemeSettings
}

async function updateRenderConfigFromDb (db) {
  const dbTheme = await db.collection(SETTINGS_COL)
    .findOne({ setting: THEME_SETTING })
  if (dbTheme) {
    Object.assign(renderConfig, dbTheme)
  }
}

async function updateThemeSettings (db, data) {
  const result = await db.collection(SETTINGS_COL).findOneAndUpdate(
    { setting: THEME_SETTING },
    { $set: data },
    { upsert: true, returnDocument: 'after' }
  )
  if (!result.ok) {
    throw new Error('Error saving settings')
  }
  // also update the settings in memory to affect renders immediately
  Object.assign(renderConfig, result.value)
}
