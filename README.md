
```sh

$ git clone git@github.com:adastreamer/image-processing.git
$ cd image-processing
$ npm install
$ npm install supervisor -g
$ AWS_ACCESS_KEY_ID=XXX AWS_SECRET_ACCESS_KEY=XXX AWS_REGION=XXX AWS_BUCKET=XXX supervisor index.js
```

1. http://localhost:5000/s3/resize/100x100/https://s3-eu-west-1.amazonaws.com/...
