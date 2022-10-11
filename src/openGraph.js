const { URL, URLSearchParams } = require('url')
const textVersion = require('textversionjs')

// AP summary allows HTML, but og:description does not
const htmlToText = html => textVersion(html, {
  linkProcess: (href, text) => text,
  imgProcess: (src, alt) => alt,
  headingStyle: 'linebreak',
  listStyle: 'linebreak'
})

module.exports = {
  generateMetaTags
}

const objectReg = /^\/(\w)\/([A-Za-z0-9-]+)/

async function generateMetaTags (req, res, next) {
  const path = req.originalUrl
  const apex = req.app.locals.apex
  const openGraph = res.locals.openGraph = {}

  const pathMatch = objectReg.exec(path.toLowerCase())
  if (!pathMatch) {
    return next()
  }
  const [, type, id] = pathMatch
  try {
    if (type === 'u') {
      const profile = await apex.store.getObject(`https://${apex.domain}/u/${id}`)
      if (!profile) {
        return next()
      }
      const { name, summary, icon, avatar } = await apex.toJSONLD(profile)
      openGraph.ogTitle = `${name}'s Profile`
      openGraph.ogDescription = htmlToText(summary ?? 'Immerser profile')
      if (icon) {
        openGraph.ogImage = typeof icon === 'string' ? icon : icon.url
      }
      if (avatar) {
        openGraph.twitterEmbed = modelPlayer(avatar, apex.domain)
      }
    } else if (type === 's') {
      const activity = await apex.store.getActivity(`https://${apex.domain}/s/${id}`)
      if (!activity) {
        return next()
      }
      const { type: activityType, summary: activitySummary, object } = await apex.toJSONLD(activity)
      const summary = activitySummary || object?.summary
      if (summary) {
        openGraph.ogTitle = `${activityType} ${object?.name || 'Activity'}`
        openGraph.ogDescription = htmlToText(summary)
      } else {
        openGraph.ogTitle = `${activityType} Activity`
        openGraph.ogDescription = htmlToText(object?.name || object?.type)
      }
      if (object?.icon) {
        openGraph.ogImage = hrefFromIcon(object.icon)
      }
      if (object?.type === 'Model') {
        openGraph.twitterEmbed = modelPlayer(object, apex.domain)
      } else if (object?.type === 'Image') {
        openGraph.ogImage = hrefFromIcon(object)
      }
    } else if (type === 'o') {
      let object = await apex.store.getObject(`https://${apex.domain}/o/${id}`)
      if (!object) {
        return next()
      }
      object = await apex.toJSONLD(object)
      if (object.name && object.summary) {
        openGraph.ogTitle = object.name
        openGraph.ogDescription = htmlToText(object.summary)
      } else {
        openGraph.ogTitle = `${object.type}`
        openGraph.ogDescription = htmlToText(object.summary ?? object.name ?? '')
      }
      if (object.icon) {
        openGraph.ogImage = hrefFromIcon(object.icon)
      }
      if (object.type === 'Model') {
        openGraph.twitterEmbed = modelPlayer(object, apex.domain)
      } else if (object.type === 'Image') {
        openGraph.ogImage = hrefFromIcon(object)
      }
    }
  } catch (err) {
    console.warn('Error generating open graph tags: ', err)
    // continue to serve page anyway without og tags
  }
  next()
}

function modelPlayer (model, domain) {
  const cardUrl = new URL(`https://${domain}/static/twitter-player.html`)
  const poster = model.icon ? hrefFromIcon(model.icon) : ''
  cardUrl.search = new URLSearchParams({
    src: typeof model.url === 'string'
      ? model.url
      : model.url?.href,
    poster,
    alt: model.name
  }).toString()
  return {
    width: 480,
    height: 480,
    url: cardUrl.href
  }
}

function hrefFromIcon (icon) {
  if (typeof icon === 'string') {
    return icon
  } else {
    return typeof icon.url === 'string'
      ? icon.url
      : icon.url?.href
  }
}
