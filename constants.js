module.exports = {
  ALLOWED_MIME_TYPES: ['video/mp4'],
  UPLOADS_DIRECTORY: `${__dirname}/backend/uploads`,
  DOWNLOADS_DIRECTORY: `${__dirname}/backend/downloads`,
  processingStatus: {
    idle: 'IDLE',
    processing: 'PROCESSING',
    error: 'ERROR',
    finished: 'FINISHED'
  }
}
