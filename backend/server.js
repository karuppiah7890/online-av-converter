const PORT = 8080
const debug = require('debug')
const amqplib = require('amqplib')
const express = require('express')
const multer = require('multer')

const log = debug('server:log')
log.log = console.log.bind(console)
const error = debug('server:error')

const upload = multer({ dest: `${__dirname}/uploads/` })

const url = 'amqp://rabbitmq'

const app = express()

// Check if the API server is alive and ready to serve requests
app.get('/alive', (req, res) => {
  res.json({
    status: 'success'
  })
})

app.post('/upload', upload.single('file'), (req, res) => {
  // req.file is the file object with metadata
  // req.body will hold the text fields
  log(req.file)
  const open = amqplib.connect(url)
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
      status: 'success'
    })
  })
  .catch((err) => {
    error('got error : %s', err)
    res.send(500).json({
      status: 'error',
      error: err.message
    })
  })
})

app.listen(PORT, () => {
  log(`Running at port ${PORT}`)
})

require('./worker')
