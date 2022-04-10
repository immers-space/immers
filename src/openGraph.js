const { URL, URLSearchParams } = require('url')

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
      const { name, summary, icon, avatar } = await apex.toJSONLD(await apex.store.getObject(`https://${apex.domain}/u/${id}`))
      openGraph.ogTitle = `${name}'s Profile`
      openGraph.ogDescription = `${summary}`
      if (icon) {
        openGraph.ogImage = typeof icon === 'string' ? icon : icon.url
      }
      if (avatar) {
        const cardUrl = new URL(`https:${apex.domain}/static/twitter-player.html`)
        let avatarIconUrl
        if (avatar.icon) {
          if (typeof avatar.icon === 'string') {
            avatarIconUrl = avatar.icon
          } else {
            avatarIconUrl = typeof avatar.icon.url === 'string'
              ? avatar.icon.url
              : avatar.icon.url?.href
          }
        }
        cardUrl.search = new URLSearchParams({
          src: typeof avatar.url === 'string'
            ? avatar.url
            : avatar.url?.href,
          poster: avatarIconUrl,
          alt: avatar.name
        }).toString()
        openGraph.twitterEmbed = {
          width: 480,
          height: 480,
          url: cardUrl.href
        }
      }
    }
  } catch (err) {
    return next(err)
  }
  next()
}
