const express = require('express')
const debug = require('debug')
const mime = require('mime')
const constants = require('../constants')
const timediff = require('timediff')

const log = debug('processInput:log')
log.log = console.log.bind(console)
const error = debug('processInput:error')

const ALLOWED_MIME_TYPES = constants.ALLOWED_MIME_TYPES

const padZeros = (string) => {
  if (string.length < 2) {
    string = `0${string}`
  }
  return string
}

const timeDifference = (fromTime, toTime) => {
  const dummyDate = '1995-12-26'

  let duration = timediff(`${dummyDate} ${fromTime}`, `${dummyDate} ${toTime}`, 'HmS')

  let {
      hours,
      minutes,
      seconds
  } = duration

  if (hours < 0 || minutes < 0 || seconds < 0) { return null }

  let hoursString = String(hours)
  let minutesString = String(minutes)
  let secondsString = String(seconds)

  hoursString = padZeros(hoursString)
  minutesString = padZeros(minutesString)
  secondsString = padZeros(secondsString)

  return `${hoursString}:${minutesString}:${secondsString}`
}

const processInput = express.Router()

// Check mimetype with the contents of the file
processInput.use((req, res, next) => {
  const inputFilename = req.file.filename

  let {
    outputFormat,
    videoBitrate,
    audioBitrate,
    fromTime,
    toTime
  } = req.body

  let seekInput, duration
  let timeRegExp = new RegExp(/^\d{2}:\d{2}:\d{2}$/)

  const invalidInputError = new Error('Bad input')
  invalidInputError.clientError = true

  if (!outputFormat) {
    next(invalidInputError)
    return
  } else {
    let mimeType = mime.lookup(outputFormat)
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      error(`${mimeType} mime type output format not allowed!`)
      next(invalidInputError)
      return
    }
  }

  if (videoBitrate) {
    if (isNaN(videoBitrate)) {
      next(invalidInputError)
      return
    }
  }

  if (audioBitrate) {
    if (isNaN(audioBitrate)) {
      next(invalidInputError)
      return
    }
  }

  if (fromTime) {
    if (!timeRegExp.test(fromTime)) {
      next(invalidInputError)
      return
    }
    seekInput = fromTime
  }

  if (toTime) {
    if (!timeRegExp.test(toTime)) {
      next(invalidInputError)
      return
    }

    if (!fromTime) {
      fromTime = '00:00:00'
      seekInput = fromTime
    }

    let calculatedDuration = timeDifference(fromTime, toTime)

    if (!calculatedDuration) {
      next(invalidInputError)
      return
    }

    duration = calculatedDuration
  }

  req.body = {
    inputFilename: inputFilename,
    outputFormat: outputFormat,
    videoBitrate: videoBitrate,
    audioBitrate: audioBitrate,
    seekInput: seekInput,
    duration: duration
  }

  next()
})

module.exports = processInput
