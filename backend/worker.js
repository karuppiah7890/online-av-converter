const debug = require('debug')
const amqplib = require('amqplib')
const convert = require('./converter')

const log = debug('worker:log')
log.log = console.log.bind(console)
const error = debug('worker:error')

const url = 'amqp://rabbitmq'

// Wait for sometime so that RabbitMQ starts, in case HiPE JIT Compiler usage is enabled
// It takes a minute or so in that case, for RabbitMQ to start
const STARTUP_MS = process.env.WORKER_STARTUP_SECONDS * 1000

setTimeout(() => {
  const open = amqplib.connect(url)
  open.then((conn) => {
  // Task Consumer
    let ok = conn.createChannel()
    return ok.then((ch) => {
      const q = 'tasks'

      ch.assertQueue(q)
      ch.consume(q, (msg) => {
        if (msg !== null) {
          const msgContent = msg.content.toString()

          log(`Content : ${msgContent}`)
          ch.ack(msg)

          const taskData = JSON.parse(msgContent)
          convert(taskData)
        }
      })
    })
  })
.then((result) => {
  if (result) { log(result) }
})
.catch((err) => {
  error(err)
})
}, STARTUP_MS)
