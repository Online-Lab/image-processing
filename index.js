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

// resize
app.get('/get/:params/*', function(req, res) {

  var origin = new helper.Origin(req.params[0])
  var imparams = req.params.params

  origin.HEAD(function(response) {
    
    var etag  = origin.getETag(response)

    if (!etag) { // usual image
      origin.processUsual(imparams, function(retUrl){
        res.redirect(retUrl)
      })      
    } else { // amazon image with hash in headers
      origin.processS3(imparams, function(retUrl){
        res.redirect(retUrl)
      })
    }
  })  

})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
