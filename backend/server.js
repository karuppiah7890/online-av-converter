const PORT = 8080
const debug = require('debug')
const amqplib = require('amqplib')
const express = require('express')
const multer = require('multer')
const redis = require('redis')
const bodyParser = require('body-parser')
const mmm = require('mmmagic')

const Magic = mmm.Magic
const magic = new Magic(mmm.MAGIC_MIME_TYPE)

const UPLOADS_DIRECTORY = `${__dirname}/uploads`

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

// multer storage config for filtering / storing uploaded files

const ALLOWED_MIME_TYPES = ['video/mp4']

// Check mimetype with the contents of the file
const isValidFile = (file, cb) => {
  magic.detectFile(`${UPLOADS_DIRECTORY}/${file.filename}`, (err, mimetype) => {
    if (err) {
      error(err)
      cb(null, false)
    }
    if (ALLOWED_MIME_TYPES.includes(mimetype)) {
      log(`Mime Type of the uploaded video ${file.filename} is ${mimetype} and it's allowed`)
      cb(null, true)
    } else {
      log(`Mime Type of the uploaded video ${file.filename} is ${mimetype} and it's NOT allowed`)
      cb(null, false)
    }
  })
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIRECTORY)
  },
  filename: function (req, file, cb) {
    cb(null, `video-${Date.now()}`)
  }
})

const upload = multer({
  storage: storage,
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

app.use(bodyParser.json())  // for parsing JSON body in POST requests
app.use(bodyParser.urlencoded()) // for parsing url encoded form data in POST requests

// Check if the API server is alive and ready to serve requests
app.get('/alive', (req, res) => {
  res.json({
    data: 'Yes, I am alive!'
  })
})

app.post('/upload', upload.single('file'), (req, res) => {
  // req.file is the file object with metadata
  // req.body will hold the text fields
  if (!req.file) {
    res.status(400).json({
      error: 'Invalid or no file found'
    })
    return
  }
  isValidFile(req.file, (err, result) => {
    if (err) { error(err) }
    if (!result) {
      res.status(400).json({
        error: 'Invalid or no file found'
      })
      return
    }
    log(req.file)
    req.body.inputFilename = req.file.filename
    const open = amqplib.connect(rabbitmqHostUrl)
    const q = 'tasks'
    // Task Producer
    open.then((conn) => {
      let ok = conn.createChannel()
      return ok.then((ch) => {
        ch.assertQueue(q)
        ch.sendToQueue(q, Buffer.from(JSON.stringify(req.body, null, 2)))
      })
    })
    .then((result) => {
      if (result) { log(result) }
      res.json({
        inputFilename: req.file.filename
      })
    })
    .catch((err) => {
      error(err)
      res.send(500).json({
        error: err.message
      })
    })
  })
})

app.post('/info', (req, res) => {
  client.hgetall([ req.body.inputFilename ], (err, result) => {
    if (err) {
      redisError(err)
      res.status(500).json({
        error: err.message
      })
      return
    }
    res.json(result)
  })
})

app.listen(PORT, () => {
  log(`Running at port ${PORT}`)
})

require('./worker')
