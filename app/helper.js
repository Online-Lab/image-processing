var AWS = require('aws-sdk')
var request = require('request')
var fs = require('fs')
var im = require('imagemagick')
var crypto = require('crypto')

var randlib = require('./rand.lib')
var settings = require('./settings')
var params = require('./params')

var s3 = new AWS.S3()

var checksum = function(str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex')
}
var pack = function(bytes) {
    var chars = [];
    for(var i = 0, n = bytes.length; i < n;) {
        chars.push(((bytes[i++] & 0xff) << 8) | (bytes[i++] & 0xff));
    }
    return String.fromCharCode.apply(null, chars);
}
var unpack = function(str) {
    var bytes = [];
    for(var i = 0, n = str.length; i < n; i++) {
        var char = str.charCodeAt(i);
        bytes.push(char >>> 8, char & 0xFF);
    }
    return bytes;
}

// Origin class

function Origin (origin) {
    this.url = encodeURI(origin)
    this.ext = '.' + this.url.split('.').pop()
    this.protocol = this.url.split(":")[0]

    this.etag = ''

    this.target = ''
    this.retUrl = ''

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
Origin.prototype.generateThumb = function(imparams, target, callback, ret){
    var $this = this

    var temp = fs.createWriteStream($this.tempfilename)

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
}
//


Origin.prototype.getTarget = function(imparams, etag) {
    this.target = imparams + '/' + etag + this.ext
    return this.target
}
Origin.prototype.getRetUrl = function() {
    this.retUrl =  this.protocol + "://s3-" + params.AWS_REGION + ".amazonaws.com/" +  params.AWS_BUCKET + '/' + this.target
    return this.retUrl
}


// S3 type
Origin.prototype.processS3 = function(headResponse, imparams, callback) {
    // overrides
    var $this = this

    var target = $this.getTarget(imparams, $this.etag)
    var ret = $this.getRetUrl()

    s3.headObject({ Bucket: params.AWS_BUCKET, Key: target }, function(err, data){
        if (err){ // if thumb not exists
            $this.generateThumb(imparams, target, callback, ret)
        } else { // if thumb exists, return it
            callback(encodeURI(ret));
        }
    })
}
//

// Usual type
Origin.prototype.processUsual = function(headResponse, imparams, callback) {
    // overrides
    var $this = this

    var bytesFromStart = 512
    var bytesBeforeEnd = 512

    var contentLength = parseFloat(headResponse.headers['content-length'])

    var range = 'bytes=' + (
        (contentLength > bytesFromStart + bytesBeforeEnd) ? (
            '0-' + bytesFromStart + ',' + (contentLength - 1 - bytesBeforeEnd) + '-' + (contentLength - 1)
        ) : (
            (contentLength > bytesFromStart) ? (
                '0-' + bytesFromStart
            ) : (
                '0-' + (contentLength - 1)
            )
        )
    )

    request({method: 'GET', uri: $this.url, headers: {Range: range}}, function(error, response, body) { // get some bytes to generate hash

        var hash = checksum(pack(response))

        var target = $this.getTarget(imparams, hash)
        var ret = $this.getRetUrl()

        s3.headObject({ Bucket: params.AWS_BUCKET, Key: target }, function(err, data){
            if (err){ // if thumb not exists
                $this.generateThumb(imparams, target, callback, ret)
            } else { // if thumb exists, return it
                callback(encodeURI(ret));
            }
        })
    });
}
//

// end Origin class

exports.Origin = Origin