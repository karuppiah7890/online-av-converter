const $ = require('jquery')

$(document).ready(() => {
  $('#form').submit((event) => {
    event.preventDefault()
    upload()
  })
})

function upload () {
  const form = $('#form')[0]
  const data = new FormData(form)
  $.ajax({
    xhr: () => {
      var xhr = new window.XMLHttpRequest()

      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) {
          var percentComplete = evt.loaded / evt.total
          percentComplete = parseInt(percentComplete * 100)
          console.log(percentComplete)

          if (percentComplete === 100) {
            console.log(`Upload complete!`)
          }
        }
      }, false)

      return xhr
    },
    url: 'http://api.converter.karuppiah7890.dev:8080/upload',
    method: 'POST',
    contentType: false,
    processData: false,
    data: data,
    dataType: 'json',
    success: (result) => {
      console.log(result)
    },
    error: (err) => {
      console.log(err)
    }
  })
}
