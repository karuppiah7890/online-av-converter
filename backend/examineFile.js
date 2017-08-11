const express = require('express')
const debug = require('debug')
const mmm = require('mmmagic')
const constants = require('../constants')

const log = debug('examineFile:log')
log.log = console.log.bind(console)
const error = debug('examineFile:error')

const ALLOWED_MIME_TYPES = constants.ALLOWED_MIME_TYPES
const UPLOADS_DIRECTORY = constants.UPLOADS_DIRECTORY

const Magic = mmm.Magic
const magic = new Magic(mmm.MAGIC_MIME_TYPE)

const examineFile = express.Router()

// Check mimetype with the contents of the file
examineFile.use((req, res, next) => {
  const {
    file
  } = req
  const invalidFileError = new Error('Invalid or no file found')
  invalidFileError.clientError = true

  if (!file) {
    log('No file was uploaded!')
    next(invalidFileError)
    return
  }

  magic.detectFile(`${UPLOADS_DIRECTORY}/${file.filename}`, (err, mimeType) => {
    if (err) {
      error(err)
      next(err)
    } else if (ALLOWED_MIME_TYPES.includes(mimeType)) {
      log(`Mime Type of the uploaded video ${file.filename} is ${mimeType} and it's ALLOWED`)
      next()
    } else {
      log(`Mime Type of the uploaded video ${file.filename} is ${mimeType} and it's NOT ALLOWED`)
      next(invalidFileError)
    }
  })
})

module.exports = examineFile
