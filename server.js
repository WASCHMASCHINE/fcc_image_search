'use strict';
var mongo = require('mongodb').MongoClient;
var express = require('express');
var request = require('request');


var app = express();
require('dotenv').load();

function insertSearchQueryIntoDatabase(lastSearchQueryObject){
	console.log(process.env.MONGO_URI);
	mongo.connect(process.env.MONGO_URI, function(err, db) {
		if (err) throw err;
		var urls = db.collection('imageSearches');
		urls.insert(lastSearchQueryObject, function(err,data){
		if (err) throw err;
		db.close();
		});
	});
}

//https://www.googleapis.com/customsearch/v1?key=SERVER_KEY&cx=CUSTOM_SEARCH_ID&q=flower&searchType=image&alt=json

app.get('/api/imagesearch/*', function(req, res){
	var timestamp = new Date();
	var searchTerm = req.params[0];
	var offset = req.query['offset']; // could be undefined
	if (offset == undefined) offset = 10;
	
	var requestUrl = 'https://www.googleapis.com/customsearch/v1?key=' + process.env.GOOGLE_SEACH_API_KEY + '&cx='+ process.env.GOOGLE_SEARCH_ENGINE + '&q=' + searchTerm + '&searchType=image&alt=json'
	// http://blog.modulus.io/node.js-tutorial-how-to-use-request-module
	request(requestUrl, function (error, response, body) {
    	if (!error && response.statusCode == 200) {
    		var imageSearchJsonObj = JSON.parse(body);
    		var newJsonArr = [];
        	for (var i=0; i < imageSearchJsonObj.items.length && i < offset; ++i){
        		newJsonArr.push({"url":imageSearchJsonObj.items[i].link,
        						"snippet": imageSearchJsonObj.items[i].snippet,
        						"thumbnail": imageSearchJsonObj.items[i].image.thumbnailLink,
        						"context": imageSearchJsonObj.items[i].image.contextLink});
        	}
        	insertSearchQueryIntoDatabase({"term":searchTerm, "when":timestamp});
        	res.end(JSON.stringify(newJsonArr));
    	}
	});
});

app.get('/api/latest/imagesearch/', function(req, res){
	 mongo.connect(process.env.MONGO_URI, function(err, db) {
		if (err) throw err;
		var imageSearches = db.collection('imageSearches'); /*  */
		var sortById = {'_id': -1}
		imageSearches.find({}, { _id: 0 }).sort(sortById).toArray(function(err, items) {
			console.log(items);
				if (err) throw err;
                	res.end(JSON.stringify(items));
             });
	});
});

var port = process.env.PORT || 8080;
app.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});