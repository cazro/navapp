var express = require('express');
var router = express.Router();
var Config = require('../models/alert');
var mongoose = require('mongoose');
var config = require('config');
var dbConfig = config.get('mongodb');
mongoose.Promise = require('bluebird');
var db = mongoose.connection;
mongoose.connect('mongodb://'+dbConfig.host+':'+dbConfig.port+'/'+dbConfig.db);

db.on('open',function(){
	console.log("MongoDB connection open for admin");
});

db.on('error',console.error);

/* GET alerts listing. */
router.get('/', function(req, res, next) {
	Config.find().then(function(alerts){
		res.json(alerts);
	}).catch(function(err){
		console.error(err);
		res.send(err);
	});
	
});
