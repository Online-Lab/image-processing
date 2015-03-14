var AWS = require('aws-sdk')
var request = require('request')
var fs = require('fs')
var im = require('imagemagick')

var randlib = require('./rand.lib')
var settings = require('./settings')
var params = require('./params')

var s3 = new AWS.S3()

// Origin class

function Origin (origin) {
    this.url = encodeURI(origin)
    this.ext = '.' + this.url.split('.').pop()
    this.protocol = this.url.split(":")[0]

    this.etag = ''

    this.s3Target = ''
    this.s3retUrl = ''

    this.generateRand = function(){
        return settings.tmpdir + randlib.get() + this.ext
    }

    this.tempfilename = this.generateRand()
    this.resizedfilename = this.generateRand()
}
// some helpers
Origin.prototype.HEAD = function(callback) {
    request({method: 'HEAD', uri: this.url}).on('response', callback);
}
Origin.prototype.getETag = function(response){
    this.etag = (response.headers.etag || '').replace(/['"]+/g, '')
    return this.etag
}
//


// S3 type
Origin.prototype.getS3Target = function(imparams, etag) {
    this.s3Target = 's3/resize/' + imparams + '/' + etag + this.ext
    return this.s3Target
}
Origin.prototype.getS3RetUrl = function() {
    this.s3retUrl =  this.protocol + "://s3-" + params.AWS_REGION + ".amazonaws.com/" +  params.AWS_BUCKET + '/' + this.s3Target
    return this.s3retUrl
}
Origin.prototype.processS3 = function(imparams, callback) {
    // overrides
    var $this = this

    var target = $this.getS3Target(imparams, $this.etag)
    var ret = $this.getS3RetUrl()

    var temp = fs.createWriteStream($this.tempfilename)


    s3.headObject({ Bucket: params.AWS_BUCKET, Key: target }, function(err, data){
        if (err){ // if thumb not exists
            request({method: 'GET', uri: $this.url}).on('response', function(response) { // get original
                var r = response.pipe(temp).on('finish', function(){ // on save
                    im.convert([$this.tempfilename, '-resize', imparams, $this.resizedfilename], function(err, stdout){
                        var fileStream = fs.createReadStream($this.resizedfilename);
                        fileStream.on('open', function () {
                            s3.putObject({
                                Bucket: params.AWS_BUCKET,
                                Key: target,
                                Body: fileStream
                            }, function (err) {
                              if (err) { throw err; }
                              callback(encodeURI(ret));
                            });
                        });
                    });
                });
            });
        } else { // if thumb exists, return it
            callback(encodeURI(ret));
        }
    })
}
//

// Usual type
Origin.prototype.processUsual = function(imparams, callback) {
    // overrides
    var $this = this

    callback(encodeURI($this.url));
}
//

// end Origin class

exports.Origin = Origin