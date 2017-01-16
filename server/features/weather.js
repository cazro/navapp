var http = require('http');
var fs = require('fs');
var request = require('http-request');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var weather = function(conf){
	this.t = this;
	this.alerts = {alerts:[]};
	this.key = conf.key;
	this.state = conf.state;
	this.city = conf.city;
	this.zipcode = conf.zipcode;
	this.mapUrl = "http://api.wunderground.com/api/"+this.key+"/animatedradar/q/"+this.zipcode+".gif?newmaps=1&smooth=1&width=1080&height=1080&radius=75&noclutter=1&reproj.automerc&rainsnow=1&timelabel=1&timelabel.x=10&timelabel.y=20";
	this.alertJsonUrl = "http://api.wunderground.com/api/"+this.key+"/geolookup/alerts/q/"+this.state+"/"+this.city+".json";
	this.refresh = conf.refresh;
	this.getAlerts = function(t,cb){

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

				console.log("Received response from wunderground");
				try{
					body = JSON.parse(body);
				} catch (e){
					console.error(e);
				}

				if(body.alerts && body.alerts.length){

					t.alerts.alerts = body.alerts;

					console.log("Detected bad weather");
					console.log("There "+(body.alerts.length===1?"is ":"are ")+body.alerts.length+" weather "+(body.alerts.length===1?"alert.":"alerts."));

					if(cb){
						cb(t.alerts);
					} else {
						return t.alerts;
					}
					t.emit('alert',t.alerts);
				} else {
					console.log("No bad weather.");
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
	
	this.download = function(){
		var t = this;
		console.log("Downloading weather gif");
		var dest = 'public/images/weather.gif';
		fs.access(dest,function(err){
			if(!err) fs.unlink('public/images/weather.gif');
		});


		var data = {
			url:t.mapUrl,
			progress: function(current,total){

				console.log("Downloaded "+current+" out of "+total);

			}
		};

		fs.access(dest, fs.F_OK,function(err){

			if(err){
				request.get(data,dest,function(err,res){
					if(err){
						console.error(err);

					} else {

						console.log("Downloaded file "+res.file);
					}
				});
			} else {
				console.log(dest+" already exists.  Not downloading.");

			}
		});

	};
	this.refreshData = function(cb){
		var t = this.t;
		t.getAlerts(function(alerts){
			console.log("Weather alerts: "+ alerts);
			if(alerts){
				t.alerts = alerts;
				t.download(t);
			} else {
				t.alerts = {alerts:[]};
			}

			if(cb)cb(t.alerts);
		});
	};

	this.refreshData(function(alerts){
		var t = this.t;
		
		this.interval = setInterval(this.refreshData,this.refresh);
	});
	
};

util.inherits(weather, EventEmitter);

module.exports = weather;
