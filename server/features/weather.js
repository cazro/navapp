var http = require('http');
var fs = require('fs');
var request = require('http-request');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

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
    
	this.refreshData = function(cb){
		var t = this;
		this.getAlerts(function(alerts){
            
			if(alerts){
				t.alerts = {
                    alerts: alerts,
                    slide: {}
                };
				
			} else {
				t.alerts = {
					alerts:[],
					slide:{}
				};
			}
            
            t.download(function(res){
                if(res){
                    t.alerts.slide = {
                        name: 'Weather',
                        sourceType: 'weather',
                        camid:t.webcam.camid,
                        camDesc: (t.webcam.neighborhood?t.webcam.neighborhood:t.webcam.city),
                        weatherMapPath: t.weatherMapPath.split('public/')[1],
                        weatherCamPath: t.weatherCamPath.split('public/')[1]
                    };
                }
                console.log("Emitting weather info from weather.js.");
                t.emit('alert',t.alerts);
            });
            
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
			console.error(error.message);
			res.resume();
			return;
		}

		res.on('data',function(chunk){
			body += chunk;
		});

		res.on('end',function(){

			console.log("Received alerts from wunderground");
			try{
				body = JSON.parse(body);
			} catch (e){
				console.error(e);
			}

			if(body.alerts && body.alerts.length){

				console.log("Detected bad weather");
				console.log("There "+(body.alerts.length===1?"is ":"are ")+body.alerts.length+" weather "+(body.alerts.length===1?"alert.":"alerts."));
				
				body.alerts.forEach(function(alert,ind,all){
					console.log("Alert "+parseInt(ind+1)+": "+alert.description);
					console.log(alert.message);
				});
				
				if(cb){
					cb(body.alerts);
				} else {
					return body.alerts;
				}
				
			} else {
				console.log("No bad weather.");
				//fs.access('public/images/weather.gif',function(err){
				//	if(!err) fs.unlink('public/images/weather.gif');
				//});
				if(cb){
					cb(false);
				} else {
					return false;
				}
			}
		});  
	}).on('error',function(e){

		console.error('ERROR: '+e.message);

		if(cb){
			cb(false);
		} else {
			return false;
		}
	});
};

var download = function(cb){
	var t = this;
	console.log("Downloading weather gif");
	var weatherMapPath = this.weatherMapPath;
    var weatherCamPath = this.weatherCamPath;
    
	var data = {
		url:t.mapUrl,
		progress: function(current,total){
			console.log("Downloaded "+current+" out of "+total);
		}
	};
    
	request.get(data,weatherMapPath,function(err,res){
		if(err){
			console.error(err);
		} else {
			console.log("Downloaded file "+res.file);
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
			console.error(error.message);
			res.resume();
			return;
		}

		res.on('data',function(chunk){
			body += chunk;
		});

		res.on('end',function(){
            console.log("Received webcams from wunderground");
			try{
				body = JSON.parse(body);
			} catch (e){
				console.error(e);
			}
            
            if(body.webcams && body.webcams.length){
          
                t.webcam = body.webcams[Math.floor(Math.random()*body.webcams.length)];
                var data = {
                    url:t.webcam.CURRENTIMAGEURL
                };
                
                request.get(data,weatherCamPath,function(err,res){
                    if(err){
                        console.error(err);
                        t.webcam = body.webcams[Math.floor(Math.random()*body.webcams.length)];
                        var data = {
                            url:t.webcam.CURRENTIMAGEURL
                        };

                        request.get(data,weatherCamPath,function(err,res){
                            if(err){
                                console.error(err);
                            } else {
                                console.log("Downloaded file "+res.file);
                            }
                            if(cb)cb(true);
                        });
                    } else {
                        console.log("Downloaded file "+res.file);
                        if(cb)cb(true);
                    }
                    
                });
            }
        });
    }).on('error',function(e){

		console.error('ERROR: '+e.message);

		if(cb){
			cb(false);
		} else {
			return false;
		}
	});
};

util.inherits(weather, EventEmitter);

module.exports = weather;
