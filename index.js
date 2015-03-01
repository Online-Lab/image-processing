var express = require('express');
var app = express();
var AWS = require('aws-sdk');

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.send('Hello World!');
});

app.get('/resize/:percent/*', function(req, res) {
  var original = req.params[0];
  res.send('OK');
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
