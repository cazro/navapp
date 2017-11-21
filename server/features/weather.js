var http = require('http');
var fs = require('fs');
var request = require('http-request');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var logger = require('../utils/logger');

var weather = function(conf){
	this.t = this;
	var t = this;
	this.alerts = 
	{
		alerts:[],
		slide:{}
	};
	this.key = conf.key;
	this.state = conf.state;
	this.city = conf.city;
	this.mapUrl = "http://api.wunderground.com/api/"+this.key+"/animatedradar/q/"+this.state+"/"+this.city+".gif?newmaps=1&smooth=1&width=1080&height=1080&radius=75&noclutter=1&reproj.automerc&rainsnow=1&timelabel=1&timelabel.x=10&timelabel.y=20";
	this.alertJsonUrl = "http://api.wunderground.com/api/"+this.key+"/geolookup/alerts/q/"+this.state+"/"+this.city+".json";
	this.webcamsUrl = "http://api.wunderground.com/api/"+this.key+"/webcams/q/"+this.state+"/"+this.city+".json";
    this.refresh = conf.refresh;
	this.getAlerts = getAlerts;
	this.download = download;
	this.weatherDir = 'public/images/weather/';
	this.weatherMapPath = this.weatherDir+'weatherMap.gif';
    this.weatherCamPath = this.weatherDir+'weatherCam.jpg';
    
    if (!fs.existsSync(this.weatherDir)){
		fs.mkdirSync(this.weatherDir);
	}
    
	this.refreshData = function(cb){
		var t = this;
		this.getAlerts(function(alerts){
            t.alerts = {
                alerts: [],
                slide: {}
            };
			if(alerts){
				t.alerts.alerts = alerts;
				t.download(function(res){
                    if(res){
                        t.alerts.slide = {
                            name: 'Weather',
                            sourceType: 'weather',
                            source: 'weather',
                            camid:t.webcam.camid,
                            camDesc: (t.webcam.neighborhood?t.webcam.neighborhood:t.webcam.city),
                            weatherMapPath: t.weatherMapPath.split('public/')[1],
                            weatherCamPath: t.weatherCamPath.split('public/')[1]
                        };
                    }
                    
                });
            }
			logger.debug("Emitting weather info.");
            t.emit('alert',t.alerts);
			if(cb)cb(t.alerts);
			if(!cb)return t.alerts;
		});
	};

	this.refreshData();
	
	this.interval = setInterval(function(){
		t.refreshData();
	},this.refresh*1000);
	
};
var getAlerts = function(cb){
	var t = this;
	http.get(t.alertJsonUrl,function(res){
		var statusCode = res.statusCode;
		var body='';
		var error;

		if (statusCode != 200){
			error = new Error('Request Failed.\n Status Code: '+statusCode);
		}

		if(error){
			logger.error(error.message);
			res.resume();
			return;
		}

		res.on('data',function(chunk){
			body += chunk;
		});

		res.on('end',function(){

			logger.debug("Received alerts from wunderground");
			try{
				body = JSON.parse(body);
			} catch (e){
				logger.error(e);
			}

			if(body.alerts && body.alerts.length){

				logger.info("Detected bad weather");
				logger.info("There %s %d weather %s",(body.alerts.length===1?"is ":"are "),body.alerts.length,(body.alerts.length===1?"alert.":"alerts."));
				
				body.alerts.forEach(function(alert,ind,all){
					logger.info("Alert %d: %s",parseInt(ind+1),alert.description);
					logger.info(alert.message);
				});
				
				if(cb){
					cb(body.alerts);
				} else {
					return body.alerts;
				}
				
			} else {
				logger.info("No bad weather.");
				
				if(cb){
					cb(false);
				} else {
					return false;
				}
			}
		});  
	}).on('error',function(e){

		logger.error('ERROR: '+e.message);

		if(cb){
			cb(false);
		} else {
			return false;
		}
	});
};

var download = function(cb){
	var t = this;
	logger.debug("Downloading weather gif");
	var weatherMapPath = this.weatherMapPath;
    var weatherCamPath = this.weatherCamPath;
    
	var data = {
		url:t.mapUrl
	};
    
	request.get(data,weatherMapPath,function(err,res){
		if(err){
			logger.error(err);
		} else {
			logger.debug("Downloaded file %s",res.file);
		}
	});
    
    http.get(t.webcamsUrl,function(res){
		var statusCode = res.statusCode;
		var body='';
		var error;
        
		if (statusCode != 200){
			error = new Error('Request Failed.\n Status Code: '+statusCode);
		}

		if(error){
			logger.error(error.message);
			res.resume();
			return;
		}

		res.on('data',function(chunk){
			body += chunk;
		});

		res.on('end',function(){
            logger.debug("Received webcams from wunderground");
			try{
				body = JSON.parse(body);
			} catch (e){
				logger.error(e);
			}
            
            if(body.webcams && body.webcams.length){
          
                t.webcam = body.webcams[Math.floor(Math.random()*body.webcams.length)];
                var data = {
                    url:t.webcam.CURRENTIMAGEURL
                };
                
                request.get(data,weatherCamPath,function(err,res){
                    if(err){
                        logger.error(err);
                        t.webcam = body.webcams[Math.floor(Math.random()*body.webcams.length)];
                        var data = {
                            url:t.webcam.CURRENTIMAGEURL
                        };

                        request.get(data,weatherCamPath,function(err,res){
                            if(err){
                                logger.error(err);
                            } else {
                                logger.debug("Downloaded file %s",res.file);
                            }
                            if(cb)cb(true);
                        });
                    } else {
                        logger.debug("Downloaded file %s",res.file);
                        if(cb)cb(true);
                    }
                    
                });
            }
        });
    }).on('error',function(e){

		logger.error('ERROR: %s',e.message);

		if(cb){
			cb(false);
		} else {
			return false;
		}
	});
};

util.inherits(weather, EventEmitter);

module.exports = weather;
