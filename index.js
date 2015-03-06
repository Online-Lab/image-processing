var express = require('express')
var AWS = require('aws-sdk')
var fs = require('fs')
var request = require('request')
var zlib = require('zlib')
var im = require('imagemagick')
var app = express()

//app libs
var settings = require('./app/settings')
var randlib = require('./app/rand.lib')


//app config
app.set('port', (process.env.PORT || 5000))
app.set('aws_bucket', process.env.AWS_BUCKET)

AWS.config.update({accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY})
AWS.config.update({region: process.env.AWS_REGION})
// end app config


app.use(express.static(__dirname + settings.publicdir))


// resize by percent
app.get('/s3/resize/:percent/*', function(req, res) {
  var s3 = new AWS.S3()

  var rand = randlib.get() //random thumb filename
  var tempfilename = settings.tmpdir + rand
  var temp = fs.createWriteStream(tempfilename)
  var origin = req.params[0]

  //request(origin).pipe(temp)
  /*request(origin, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      temp.write(response.body);
      temp.end();
      
      
    }
  });*/

  request({method: 'HEAD', uri: origin}).on('response', function(response) {
    var etag  = response.headers.etag.replace(/['"]+/g, '')
    var target = 's3/resize/' + req.params.percent + '/' + etag

    s3.getObject({ Bucket: app.get('aws_bucket'), Key: target }, function(err, data) {

      if (err){ // if thumb not exists

        request({method: 'GET', uri: origin}).on('response', function(response) { // get original
          var r = response.pipe(temp).on('finish', function(){ // on save
            im.convert([tempfilename, '-resize', '25x120', tempfilename + '_1'],
              function(err, stdout){
                if (err) throw err;
                  console.log('stdout:', stdout);
                var fileStream = fs.createReadStream(tempfilename + '_1');
                fileStream.on('open', function () {
                  var s3 = new AWS.S3();
                  s3.putObject({
                    Bucket: app.get('aws_bucket'),
                    Key: target,
                    Body: fileStream
                  }, function (err) { if (err) { throw err; } });
                });
              }
            );

          })
          
        })


      } else {
        console.log(data)
      }
    })

    res.send(etag)
  })

//response.pipe(temp)



/*
  var params = {
    Bucket: app.get('aws_bucket'),
    Key: '',
  };
  s3.getObject(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
*/

  

})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
