const path = require('path')
const crypto = require('crypto')
const express = require('express')
const multer = require('multer')
const cors = require('cors')
const overlaps = require('overlaps')
const { GridFSBucket, ObjectId } = require('mongodb')
const { GridFsStorage } = require('multer-gridfs-storage')

const auth = require('./auth')
const { scopes } = require('../common/scopes')
const { apex, outboxPost } = require('./apex')

const { dbString, dbHost, dbPort, dbName, domain, maxUploadSize } = process.env
// fallback to building string from parts for backwards compat
const mongoURI = dbString || `mongodb://${dbHost}:${dbPort}/${dbName}`
const router = express.Router()
const bucketName = 'uploads'
let bucket

const upload = multer({
  storage: new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      // set random filename with original extension
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err)
          }
          const filename = buf.toString('hex') + path.extname(file.originalname)
          const fileInfo = {
            filename,
            bucketName
          }
          resolve(fileInfo)
        })
      })
    }
  }),
  limits: {
    fileSize: maxUploadSize * 1024 * 1024
  }
})

router.post(
  '/',
  auth.priv,
  // check scope
  (req, res, next) => {
    if (!overlaps(['*', scopes.creative.name], req.authInfo?.scope ?? [])) {
      return res.status(403).send(`Uploading media requires ${scopes.creative.name} scope`)
    }
    next()
  },
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'icon', maxCount: 1 }]),
  (req, res, next) => {
    const file = req.files.file[0]
    const icon = req.files.icon?.[0]
    const fileIds = [file.id.toString()]
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
      fileIds.push(icon.id.toString())
    }
    // attach file ids to object metadata after creation
    res.locals.apex.postWork.push(sentResponse => {
      const objId = sentResponse.locals.apex.object?.id
      if (!objId) {
        // post must have errored, cleanup will be handled by error handler
        return
      }
      return apex.store.db.collection('objects').updateOne(
        { id: objId },
        { $addToSet: { '_meta.files': { $each: fileIds } } }
      ).catch(err => console.error('Unable to save file metadata', fileIds, err))
    })
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
        req.files[fileArray].forEach(file => deleteFileIfUnused(file.id))
      }
    }
    next(err)
  }
)

router.get(
  '/:filename',
  // leave cors open for now since the proxy features were so recently added to client/server.
  // After some time for these to be adopted, change to auth.publ, restricting cors to logged in users only
  cors(),
  // auth.publ, // adds dynamic cors when logged-in
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
    res.set('Content-Type', file.contentType)
    bucket.openDownloadStream(file._id).pipe(res)
  }
)

function fileCleanupOnDelete ({ activity, object }) {
  if (activity.type !== 'Delete' || !object) {
    return
  }
  object._meta?.files?.forEach?.(fileId => deleteFileIfUnused(fileId))
}

async function deleteFileIfUnused (fileId) {
  if (!bucket) {
    bucket = new GridFSBucket(apex.store.db, { bucketName })
  }
  try {
    const count = await apex.store.db
      .collection('objects')
      .countDocuments({ '_meta.files': fileId })
    if (!count) {
      console.log(`Deleting file no longer in use: ${fileId}`)
      await bucket.delete(ObjectId(fileId))
    } else {
      console.log(`Retaining file still used by ${count} objects`)
    }
  } catch (err) {
    console.warn(`Unable to perform file cleanup for ${fileId}: ${err}`)
  }
}

module.exports = {
  router,
  fileCleanupOnDelete
}
