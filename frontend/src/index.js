const $ = require('jquery')
const status = require('../../constants').processingStatus
const serverUrl = 'http://converter.karuppiah7890.me'
const apiServerUrl = 'http://apiconverter.karuppiah7890.me'

$(document).ready(() => {
  $('#form').submit((event) => {
    event.preventDefault()
    let timeRegExp = new RegExp(/^\d{2}:\d{2}:\d{2}$/)
    if (!timeRegExp.test($('#fromTime').val())) {
      alert('Format for "From time" is hh:mm:ss')
      return
    }
    if (!timeRegExp.test($('#toTime').val())) {
      alert('Format for "To time" is hh:mm:ss')
      return
    }
    // TODO: Check if a file is selected
    upload()
  })
})

function upload () {
  $('.upload-progress').show() // show upload progress

  const form = $('#form')[0]
  console.log(form)
  const data = new FormData(form)
  console.log(data)
  $('#form :input').prop('disabled', true) // disable form completely

  $.ajax({
    xhr: () => {
      let xhr = new window.XMLHttpRequest()

      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) {
          let percentComplete = evt.loaded / evt.total
          percentComplete = parseInt(percentComplete * 100)
          console.log(`Upload progess: ${percentComplete}%`)
          $('#upload-progress').attr('aria-valuenow', percentComplete)
          $('#upload-progress').attr('style', `width: ${percentComplete}%`)

          if (percentComplete === 100) {
            console.log(`Upload complete!`)
          }
        }
      }, false)

      return xhr
    },
    url: `${apiServerUrl}/upload`,
    method: 'POST',
    contentType: false,
    processData: false,
    data: data,
    success: (response) => {
      console.log('/upload API call response: ', response)
      $('.upload-progress').hide()
      $('.process-progress').show()
      showProcessingProgress(response.inputFilename)
    },
    error: (err) => {
      alert(`Error occurred while uploading`)
      console.log(err)
    }
  })
}

function showProcessingProgress (inputFilename) {
  let data = {
    inputFilename: inputFilename
  }
  console.log('Checking process info by sending input data: ', data)

  $.ajax({
    url: `${apiServerUrl}/info`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      console.log('/info API call response: ', response)

      if (response.status === status.error) {
        alert('An error occurred while processing the file')
        console.error('Error occurred while processing file', response.error)
        return
      }

      let percentComplete = Number(response.progress)

      $('#process-progress').attr('aria-valuenow', percentComplete)
      $('#process-progress').attr('style', `width: ${percentComplete}%`)

      if (percentComplete === 100) {
        console.log(`Processing complete!`)
        $('.process-progress').hide()
        $('.download').show()
        $('#download').click(() => {
          window.location.href = `${serverUrl}/download/${response.outputFilename}`
        })
        return
      }

      setTimeout(() => {
        showProcessingProgress(inputFilename)
      }, 2000)
    },
    error: function (err) {
      alert(`Error occurred while getting processing info.`)
      console.log(err)
    }
  })
}
