const PORT = 8080
const debug = require('debug')
const amqplib = require('amqplib')
const express = require('express')
const multer = require('multer')
const redis = require('redis')
const bodyParser = require('body-parser')
const constants = require('../constants')
const examineFile = require('./examineFile')
const processInput = require('./processInput')

const status = constants.processingStatus

const ALLOWED_MIME_TYPES = constants.ALLOWED_MIME_TYPES
const UPLOADS_DIRECTORY = constants.UPLOADS_DIRECTORY
const MAX_FILE_SIZE = 1000 * 1000 * 100 // file size in bytes

const log = debug('server:log')
log.log = console.log.bind(console)
const error = debug('server:error')

const redisLog = debug('server-redis:log')
redisLog.log = console.log.bind(console)
const redisError = debug('server-redis:error')

// Redis client creation
const client = redis.createClient('redis://redis')

client.on('error', (err) => {
  redisError(err)
})

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIRECTORY)
  },
  filename: (req, file, cb) => {
    cb(null, `video-${Date.now()}`)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    files: 1,
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    // Check mimetype with just the extension of the file
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  }
})

// RabbitMQ host URL
const rabbitmqHostUrl = 'amqp://rabbitmq'

const app = express()

app.use(bodyParser.json()) // for parsing JSON body in POST requests
app.use(bodyParser.urlencoded({ extended: true })) // for parsing url encoded form data in POST requests

// Check if the API server is alive and ready to serve requests
app.get('/alive', (req, res) => {
  res.json({
    data: 'Yes, I am alive!'
  })
})

app.post('/upload', upload.single('file'), examineFile, processInput, (req, res, next) => {
  // req.file is the file object with metadata
  // req.body will hold the text fields
  const {
    file,
    body
  } = req

  log(file)
  const open = amqplib.connect(rabbitmqHostUrl)
  const q = 'tasks'
  // Task Producer
  open.then((conn) => {
    let ok = conn.createChannel()
    return ok.then((ch) => {
      ch.assertQueue(q)
      ch.sendToQueue(q, Buffer.from(JSON.stringify(body, null, 2)))
    })
  })
  .then((result) => {
    if (result) { log(result) }
    client.hset([ body.inputFilename, 'status', status.idle ], redis.print)
    client.hset([ body.inputFilename, 'progress', '0' ], redis.print)

    res.json({
      inputFilename: body.inputFilename
    })
  })
  .catch((err) => {
    next(err)
  })
})

app.post('/info', (req, res, next) => {
  let {
    inputFilename
  } = req.body

  const invalidInputError = new Error('Invalid or no video filename')
  invalidInputError.clientError = true

  if (!inputFilename) {
    next(invalidInputError)
    return
  }

  client.hgetall([ inputFilename ], (err, result) => {
    if (err) {
      redisError(err)
      next(err)
    }
    res.json(result)
  })
})

app.use((err, req, res, next) => {
  error(err)
  if (err.clientError) {
    res.status(400).json({
      error: err.message
    })
  } else {
    res.status(500).json({
      error: err.message
    })
  }
})

app.listen(PORT, () => {
  log(`Running at port ${PORT}`)
})

require('./worker')
