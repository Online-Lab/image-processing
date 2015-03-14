var express = require('express')
var AWS = require('aws-sdk')
var app = express()

//app libs and settings
var settings = require('./app/settings')
var params = require('./app/params')
var helper = require('./app/helper')

//app config
app.set('port', (process.env.PORT || 5000))

AWS.config.update({accessKeyId: params.AWS_ACCESS_KEY_ID, secretAccessKey: params.AWS_SECRET_ACCESS_KEY})
AWS.config.update({region: params.AWS_REGION})
// end app config

app.use(express.static(__dirname + settings.publicdir))


// resize by percent
app.get('/get/percent/:value/*', function(req, res) {
  res.redirect(encodeURI('/get/' + req.params.value + '%/' + req.params[0]))
})

// resize
app.get('/get/:params/*', function(req, res) {

  var origin = new helper.Origin(req.params[0])
  var imparams = req.params.params

  var processByUrl = function(response) {
    try{
      origin.processUsual(response, imparams, function(retUrl){
        res.redirect(retUrl)
      })
    } catch (exception_var) {
      console.log(exception_var);
    }
  }
  var processUsual = function(response) {
    try{
      origin.processUsual(response, imparams, function(retUrl){
        res.redirect(retUrl)
      })
    } catch (exception_var) {
      console.log(exception_var);
      processByUrl()
    }
  }
  var processS3 = function(response) {
    try{
      origin.processS3(response, imparams, function(retUrl){
        res.redirect(retUrl)
      })
    } catch (exception_var) {
      console.log(exception_var);
      processUsual()
    }
  }

  origin.HEAD(function(response) {
    
    var etag  = origin.getETag(response)

    if (etag) {
      processS3(response)
    } else if (response.headers['content-length']) { // amazon image with hash in headers
      processUsual(response)
    } else {
      processByUrl(response)
    }
  })  

})


app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
