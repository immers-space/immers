'use strict'

const isTrue = (settingName, overrideCheck) => {
  return isEqualTo(settingName, 'true', overrideCheck)
}

const isFalse = (settingName, overrideCheck) => {
  return isEqualTo(settingName, 'false', overrideCheck)
}

const isEqualTo = (settingName, value, overrideCheck) => {
  return (req, res, next) => {
    if (overrideCheck?.(req, res)) {
      return next()
    }
    if (process.env[settingName] !== value) {
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
  isTrue,
  isFalse,
  isEqualTo
}
