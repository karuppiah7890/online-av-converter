const debug = require('debug')
const ffmpeg = require('fluent-ffmpeg')
const redis = require('redis')
const constants = require('../constants')
const status = constants.processingStatus

const UPLOADS_DIRECTORY = constants.UPLOADS_DIRECTORY
const DOWNLOADS_DIRECTORY = constants.DOWNLOADS_DIRECTORY

const log = debug('converter-ffmpeg:log')
log.log = console.log.bind(console)
const error = debug('converter-ffmpeg:error')

const redisLog = debug('converter-redis:log')
redisLog.log = console.log.bind(console)
const redisError = debug('converter-redis:error')

const client = redis.createClient('redis://redis')

client.on('error', (err) => {
  redisError(err)
})

let errorCode = 0

const convert = (args) => {
  const {
    inputFilename,
    outputFormat,
    videoBitrate,
    audioBitrate,
    seekInput,
    duration
  } = args

  const outputFilename = `${inputFilename}.${outputFormat}`
  client.hset([ inputFilename, 'outputFilename', outputFilename ], redis.print)

  const ffmpegTool =
  ffmpeg(`${UPLOADS_DIRECTORY}/${inputFilename}`)

  if (videoBitrate) { ffmpegTool.videoBitrate(videoBitrate) }
  if (audioBitrate) { ffmpegTool.audioBitrate(audioBitrate) }

  if (seekInput) { ffmpegTool.seekInput(seekInput) }
  if (duration) { ffmpegTool.duration(duration) }

  ffmpegTool.on('start', (commandLine) => {
    log(`Spawned ffmpeg with command: ${commandLine}`)
    client.hset([ inputFilename, 'status', status.processing ], redis.print)
  })
  .on('progress', (progress) => {
    if (progress && progress.percent) {
      log(`Processing: ${progress.percent}% done.`)
      if (errorCode === 1) {
        client.hset([ inputFilename, 'status', status.processing ], redis.print)
        errorCode = 0
      }
      client.hset([ inputFilename, 'progress', progress.percent ], redis.print)
    } else {
      error(`Progress is not defined`)
      client.hset([ inputFilename, 'status', status.error ], redis.print)
      errorCode = 1
    }
  })
  .on('error', (err, stdout, stderr) => {
    client.hset([ inputFilename, 'status', status.error ], redis.print)
    client.hset([ inputFilename, 'error', err.message ], redis.print)
    errorCode = 1
    error(`Cannot process video: ${err.message}`)
    error(`Stderr of ffmpeg: ${stderr}`)
    log(`Stdout of ffmpeg: ${stdout}`)
  })
  .on('end', (stdout, stderr) => {
    log('Transcoding succeeded !')
    client.hset([ inputFilename, 'status', status.finished ], redis.print)
    client.hset([ inputFilename, 'progress', '100' ], redis.print)
  })
  .save(`${DOWNLOADS_DIRECTORY}/${outputFilename}`)
}

module.exports = convert
