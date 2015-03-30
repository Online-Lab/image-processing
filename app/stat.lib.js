var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
var params = require('./params');
var settings = require('./settings');
var moment = require('moment');

// Connection URL
var mongo_url = params.MONGO_URL;

var write = function(req){
    var obj = {
        moment: moment().format(),
        url: req.url,
        headers: req.headers 
    };

    MongoClient.connect(mongo_url, function(err, db) {
        assert.equal(null, err);
        var collection = db.collection(settings.mongo_collection);
        collection.insert(obj);
        db.close();
    });
};

exports.write = write