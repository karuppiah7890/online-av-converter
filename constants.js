module.exports = {
  ALLOWED_MIME_TYPES: [ 'audio/x-aac', 'audio/mpeg', 'audio/ogg', 'audio/x-ms-wma', 'audio/x-m4a', 'audio/x-flac', 'audio/x-wav', 'video/mp4', 'video/x-msvideo', 'video/mpeg', 'video/quicktime', 'video/x-ms-wmv', 'video/x-matroska', 'video/x-m4v', 'video/webm', 'video/x-flv', 'video/3gpp' ],
  UPLOADS_DIRECTORY: `${__dirname}/backend/uploads`,
  DOWNLOADS_DIRECTORY: `${__dirname}/backend/downloads`,
  processingStatus: {
    idle: 'IDLE',
    processing: 'PROCESSING',
    error: 'ERROR',
    finished: 'FINISHED'
  }
}
