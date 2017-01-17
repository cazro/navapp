var Config = require('../models/configModel');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var db = mongoose.connection;

var findLatest = function(selection,cb){
	Config.findOne().select(selection).sort({created:-1}).lean().exec(function(err, doc){
		if(err){
			console.error(err);
			if(cb)cb(false);
		} else {
			if(cb){
				cb(doc);
			} else {
				return doc;
			}
		}
	});
};
function Mongo(obj){
	this.host = obj.host;
	this.port = obj.port;
	this.db = obj.db;
	mongoose.connect('mongodb://'+this.host+':'+this.port+'/'+this.db);

	db.on('open',function(){
		console.log("MongoDB connection open for client");
	});

	db.on('error',console.error);
};
Mongo.prototype.getSlides = function(cb){
	findLatest('slides',function(doc){
		if(doc){
			if(cb){
				cb(doc);
			} else {
				return doc;
			}
		} else {
			if(cb){
				cb(false);
			} else {
				return false;
			}
		}
	});
};

Mongo.prototype.getSlide = function(index,callback){
	getSlides(function(doc){
		if(doc){
			if(callback)callback(doc[index]);
			return doc[index];

		} else {
			console.error(doc);
			if(callback)callback(doc);
			return doc;
		}
	});
};

Mongo.prototype.getSettings = function(section,cb){
	findLatest('settings'+(section?'.'+section:''),function(doc){
		if(!doc){
			console.error(doc);
			if(cb)cb(doc);
		} else {
			if(cb){
				cb(doc);
			} else {
				return doc;
			}
		}
	});
};

Mongo.prototype.getFeatures = function(section,cb){
	findLatest('features'+(section?'.'+section:''),function(doc){
		if(!doc){
			console.error(doc);
			if(cb)cb(doc);
			return false;
		} else {
			if(cb)cb(doc);
			return doc;
		}
	});
};

function File(config){
	var t = this;
	t.slideLength = function(cb){
		t.getSlides(function(slides){
			if(cb)cb(slides.length);
			return slides.length;
		});
	};
	t.config = config;
};

File.prototype.getSlides = function(callback){
	if(callback){
		callback(this.config.get("settings.kiosk.slides"));
	} else {
		return this.config.get("settings.kiosk.slides");
	}
	
};

File.prototype.getSlide = function(index,callback){
	this.getSlides(function(slides){
		if(slides){
			if(callback){
				callback(slides[index]);
			} else {
				return slides[index];
			}
		}
	});
};

File.prototype.getSettings = function(section,cb){
	if(cb){
		cb(this.config.get("settings"+(section?'.'+section:'')));
	} else {
		return this.config.get("settings"+(section?'.'+section:''));
	}
};

File.prototype.getFeatures = function(section,cb){
	if(cb)cb(this.config.get("features"+(section?'.'+section:'')));
	return this.config.get("features"+(section?'.'+section:''));
};

module.exports = {
	Mongo:Mongo,
	File:File
};