var http = require('http');
var fs = require('fs');
var request = require('http-request');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var weather = function(conf){
	var t = this;
	t.alerts = {alerts:[]};
	t.key = conf.key;
	t.state = conf.state;
	t.city = conf.city;
	t.zipcode = conf.zipcode;
	t.mapUrl = "http://api.wunderground.com/api/"+t.key+"/animatedradar/q/"+t.zipcode+".gif?newmaps=1&smooth=1&width=1080&height=1080&radius=75&noclutter=1&reproj.automerc&rainsnow=1&timelabel=1&timelabel.x=10&timelabel.y=20";
	t.alertJsonUrl = "http://api.wunderground.com/api/"+t.key+"/geolookup/alerts/q/"+t.state+"/"+t.city+".json";
	t.refresh = conf.refresh;
	
	t.refreshData();
	
	t.interval = t.startRefresh();
	
};

util.inherits(weather, EventEmitter);

weather.prototype.download = function(){
	var t = this;
	console.log("Downloading weather gif");
	var dest = '../../public/images/weather.gif';
	fs.access(dest,function(err){
		if(!err) fs.unlink('../../public/images/weather.gif');
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
weather.prototype.getAlerts = function(cb){
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

weather.prototype.getMapUrl = function(cb){
	var t = this;
    if(cb){
        cb(t.mapUrl);
    } else {
        return t.mapUrl;
    }
};

weather.prototype.refreshData = function(cb){
	var t = this;
	getAlerts(function(alerts){
		if(alerts){
			t.alerts = alerts;
			t.download();
		} else {
			t.alerts = {alerts:[]};
		}
		
		if(cb)cb(t.alerts);
	});
};

weather.prototype.startRefresh = function(cb){
	var t = this;
	if(cb){
		cb(setInterval(t.refreshData,t.refresh));
	} else {
		return setInterval(t.refreshData,t.refresh);
	}
};
module.exports = weather;
