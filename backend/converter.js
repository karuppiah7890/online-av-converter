const debug = require('debug')
const ffmpeg = require('fluent-ffmpeg')
const redis = require('redis')
const status = require('../constants').status

const UPLOADS_DIRECTORY = `${__dirname}/uploads`
const DOWNLOADS_DIRECTORY = `${__dirname}/downloads`

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
  const outputFilename = `${args.inputFilename}.${args.outputFormat}`
  client.hset([ args.inputFilename, 'status', status.idle ], redis.print)
  client.hset([ args.inputFilename, 'outputFilename', outputFilename ], redis.print)
  client.hset([ args.inputFilename, 'progress', '0' ], redis.print)

  ffmpeg(`${UPLOADS_DIRECTORY}/${args.inputFilename}`)
  .videoBitrate(args.videoBitrate)
  .audioBitrate(args.audioBitrate)
  .seekInput(args.seekInput)
  .duration(args.duration)
  .on('start', (commandLine) => {
    log(`Spawned ffmpeg with command: ${commandLine}`)
    client.hset([ args.inputFilename, 'status', status.processing ], redis.print)
  })
  .on('progress', (progress) => {
    if (progress && progress.percent) {
      log(`Processing: ${progress.percent}% done.`)
      if (errorCode === 1) {
        client.hset([ args.inputFilename, 'status', status.processing ], redis.print)
        errorCode = 0
      }
      client.hset([ args.inputFilename, 'progress', progress.percent ], redis.print)
    } else {
      error(`Progress is not defined`)
      client.hset([ args.inputFilename, 'status', status.error ], redis.print)
      errorCode = 1
    }
  })
  .on('error', (err, stdout, stderr) => {
    client.hset([ args.inputFilename, 'status', status.error ], redis.print)
    client.hset([ args.inputFilename, 'error', err.message ], redis.print)
    errorCode = 1
    error(`Cannot process video: ${err.message}`)
    error(`Stderr of ffmpeg: ${stderr}`)
    log(`Stdout of ffmpeg: ${stdout}`)
  })
  .on('end', (stdout, stderr) => {
    log('Transcoding succeeded !')
    client.hset([ args.inputFilename, 'status', status.finished ], redis.print)
    client.hset([ args.inputFilename, 'progress', '100' ], redis.print)
  })
  .save(`${DOWNLOADS_DIRECTORY}/${outputFilename}`)
}

module.exports = convert
