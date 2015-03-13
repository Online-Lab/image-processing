var express = require('express')
var AWS = require('aws-sdk')
var fs = require('fs')
var request = require('request')
var zlib = require('zlib')
var im = require('imagemagick')
var app = express()

//app libs and settings
var settings = require('./app/settings')
var randlib = require('./app/rand.lib')
var params = require('./app/params')

//app config
app.set('port', (process.env.PORT || 5000))

AWS.config.update({accessKeyId: params.AWS_ACCESS_KEY_ID, secretAccessKey: params.AWS_SECRET_ACCESS_KEY})
AWS.config.update({region: params.AWS_REGION})
// end app config

app.use(express.static(__dirname + settings.publicdir))

// resize
app.get('/s3/resize/:params/*', function(req, res) {
  var s3 = new AWS.S3()

  var origin = encodeURI(req.params[0])
  var imparams = req.params.params

  var ext = '.' + origin.split('.').pop()
  var protocol = origin.split(":")[0]

  var tempfilename = settings.tmpdir + randlib.get() + ext
  var resizedfilename = settings.tmpdir + randlib.get() + ext
  var temp = fs.createWriteStream(tempfilename)

  request({method: 'HEAD', uri: origin}).on('response', function(response) {
    var etag  = response.headers.etag.replace(/['"]+/g, '')
    if (!etag) throw new Error('not s3 link')

    var target = 's3/resize/' + imparams + '/' + etag + ext
    var ret = protocol + "://s3-" + params.AWS_REGION + ".amazonaws.com/" +  params.AWS_BUCKET + '/' + target;

    s3.headObject({ Bucket: params.AWS_BUCKET, Key: target }, function(err, data) {
      if (err){ // if thumb not exists

        request({method: 'GET', uri: origin}).on('response', function(response) { // get original
          var r = response.pipe(temp).on('finish', function(){ // on save

            im.convert([tempfilename, '-resize', imparams, resizedfilename],
              function(err, stdout){
                if (err) throw err;
                  console.log('stdout:', stdout);
                var fileStream = fs.createReadStream(resizedfilename);
                fileStream.on('open', function () {
                  var s3 = new AWS.S3();
                  s3.putObject({
                    Bucket: params.AWS_BUCKET,
                    Key: target,
                    Body: fileStream
                  }, function (err) {
                    if (err) { throw err; }
                    res.redirect(encodeURI(ret))
                  });
                });
              }
            );

          })
          
        })

      } else { //if thumb exists, return it
        res.redirect(encodeURI(ret))
      }
    })
  })  

})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
