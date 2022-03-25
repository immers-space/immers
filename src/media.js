const path = require('path')
const crypto = require('crypto')
const express = require('express')
const multer = require('multer')
const overlaps = require('overlaps')
const { GridFSBucket } = require('mongodb')
const { GridFsStorage } = require('multer-gridfs-storage')

const auth = require('./auth')
const { scopes } = require('../common/scopes')
const { apex, outboxPost } = require('./apex')

const { dbString, domain } = process.env
const router = express.Router()
const bucketName = 'uploads'
let bucket

const upload = multer({
  storage: new GridFsStorage({
    url: dbString,
    file: (req, file) => {
      // set random filename with original extension
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err)
          }
          const filename = buf.toString('hex') + path.extname(file.originalname)
          const fileInfo = {
            filename: filename,
            bucketName
          }
          resolve(fileInfo)
        })
      })
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20Mb
  }
})

router.post(
  '/',
  auth.priv,
  // check scope
  (req, res, next) => {
    if (!overlaps(['*', scopes.creative], req.authInfo?.scope ?? [])) {
      return res.status(403).send(`Uploading media requires ${scopes.creative.name} scope`)
    }
    next()
  },
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'icon', maxCount: 1 }]),
  (req, res, next) => {
    const file = req.files.file[0]
    const icon = req.files.icon?.[0]
    let object
    try {
      object = JSON.parse(req.body.object)
    } catch (err) {
      console.error('Error parsing media upload AP object', err)
      return next(err)
    }
    object.url = [{
      type: 'Link',
      href: `https://${domain}/media/${file.filename}`,
      mediaType: file.mimetype
    }]
    if (icon) {
      object.icon = {
        type: 'Image',
        mediaType: icon.mimetype,
        url: `https://${domain}/media/${icon.filename}`
      }
    }
    // forward to outbox route, alter request to look like object post
    req.body = object
    req.headers['content-type'] = apex.consts.jsonldOutgoingType
    req.params.actor = req.user.username
    next()
  },
  // finish publishing create activity
  outboxPost,
  (err, req, res, next) => {
    // delete unused files from failed request
    if (req.files) {
      if (!bucket) {
        bucket = new GridFSBucket(apex.store.db, { bucketName })
      }
      for (const fileArray in req.files) {
        req.files[fileArray].forEach(file => {
          bucket.delete(file.id)
            .then(() => console.log(`Deleted unused file ${file.filename}`))
            .catch(err => console.error(`Error deleting unused file ${file.filename}: ${err}`))
        })
      }
    }
    next(err)
  }
)

router.get(
  '/:filename',
  auth.publ, // adds dynamic cors when logged-in
  async (req, res) => {
    if (!bucket) {
      bucket = new GridFSBucket(apex.store.db, { bucketName })
    }
    const file = await bucket
      .find({ filename: req.params.filename })
      .next()
    if (!file) {
      return res.sendStatus(404)
    }
    console.log(file)
    res.set('Content-Type', file.contentType)
    bucket.openDownloadStream(file._id).pipe(res)
  }
)

async function fileCleanupOnDelete ({ actor, activity, object }) {
  if (!activity.type === 'Delete' || !object) {
    return
  }
  const deletes = []
  // todo: delete linked files
  return Promise.all(deletes)
}

module.exports = {
  router,
  fileCleanupOnDelete
}
