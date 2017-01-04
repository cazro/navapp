var express = require('express');
var app = express();
var server = require('http').Server(app);

require( "console-stamp" )( console, { pattern : "dd/mm/yyyy HH:MM:ss.l" } );

var io = require('socket.io')(server);
var path = require('path');
var logger = require('morgan');
var fs = require('fs');
var routes = require('./routes/index');
var http = require('http');
var httpReq = require('http-request');
var https = require('https');

var say = require('say');
var rawjs = require('raw.js');
var WorkQueue = require('mule').WorkQueue;

var config = require('config');

var features = config.get('features');
var settings = config.get('settings');

var appPath = process.cwd()+'/';
var imgStore = appPath+'public/images/';

var fwDir = true;
var paused = false;

console.log("CWD: "+process.cwd());
console.log('NODE_CONFIG_DIR: ' + config.util.getEnv('NODE_CONFIG_DIR'));
console.log(settings);

if(features.rpi){
    console.log("Running on Raspberry Pi");
    var gpio = settings.gpio;
    
    var GPIO =              require("onoff").Gpio,
        buttonLeft =        new GPIO(gpio.buttonBack, 'in','both'),
        buttonPause =       new GPIO(gpio.buttonPause, 'in','both'),
        buttonRight =       new GPIO(gpio.buttonForward, 'in','both'),
        ledLeft =           new GPIO(gpio.ledBack, 'out'),
        ledPause =          new GPIO(gpio.ledPause, 'out'),
        ledRight =          new GPIO(gpio.ledForward, 'in');
    
} else {
	console.log("Raspberry Pi features are disabled");
}

if(features.weather){
    console.log("Weather checking is enabled");
    var weatherSettings = settings.weather;
    var gifStore = imgStore+weatherSettings.directory;
	var visualAlerts = ['HUR','TOR','TOW','WRN','SEW','WIN','FLO','WAT','SVR','SPE','HWW'];
} else {
	console.log("Weather checking is disabled");
}

if(features.reddit){
    console.log("Reddit is enabled");
	
	var redditApp = new rawjs("IBA Reddit pic grabber");
	var procQueue = new WorkQueue('./resize.js');
    var redditSettings = settings.reddit;
    var redditStore = imgStore+redditSettings.directory;
    var redditUrls = [];
	var redditData = {};
	var redditListings = ['hot','top','new','controversial','random'];
	
	var imgClientID = "264c7647c10eaaa";
	
	var validExt = ['jpg','jpeg','png','gif'];
	var imgurDoms = ['imgur.com','i.imgur.com'];
	
	var imgur = require('imgur')(imgClientID);
} else {
	console.log("Reddit is disabled");
}

if(features.speech){
	console.log("Text-to-Speech is enabled");
	
	var speechSettings = settings.speech;
}
var seconds = settings.seconds;
var kioskUrls = settings.urls;
var ind = 0;
var badWeather = false;
var weatherInfo = '';
var reddit = false;
var busy = false;
var clientHeight = 1600;
var clientWidth = 1080;

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
});

console.log("Number of kioskUrls: "+kioskUrls.length);

io.on('connection', function(socket){
	
    console.log("Client connected...");
    
	
    socket.emit('test', 
    {
        paused:paused,
        fwDir:fwDir
    });
    
    socket.emit('weatherInfo',
    {
        bad:function(){
            if(weatherInfo !== ''){
                return false;
            } else {
                return true;
            }
        },
        info:weatherInfo
    });
    
    socket.on('ctest',function(data){
        console.log('Client has frame height of '+data.height+' and a width of '+data.width);
        clientHeight = ''+data.height;
        clientWidth = ''+data.width;
        sendSource({but:"No",url:kioskUrls[ind]});
    });
    
    socket.on('sourceRequest',function(fn){
        console.log("Source Requested");
        sendSource({but:"No",url:kioskUrls[ind]});
    });
});

// Interval to check the weather
if(features.weather){
	setTimeout(function(){
		getWeather();
	},15*1000);
	
    setInterval(function(){
        getWeather(); 
    },weatherSettings.refresh*1000);
}

//Interval to check reddit for pics
if(features.reddit){
	checkReddit();
	setTimeout(function(){
		getReddit();
	},20*1000);
	
    setInterval(function(){
        getReddit();   
    },redditSettings.refresh*1000);//1000000 is about 16 minutes.
}

// Interval to change the page on the kiosk
var watchdog = watchdogInterval();

// Interrupts for button presses.
if(features.rpi){
    buttonLeft.watch(function(err,value){

        if(err) exit(err);

        if(value){

            console.log("Left button pressed");
            paused = false;
            fwDir = false;
            
            ind--;
            if(ind === kioskUrls.length){
                ind = 0;
            } else if(ind === -1){
                ind = kioskUrls.length-1;
            }
            if(ind === 0){
                changeReddit();
            }

            ledLeft.setDirection('in');
            ledRight.setDirection('out');
            ledPause.setDirection('out');
            
            clearInterval(watchdog);
            sendSource({but:'Left',url:kioskUrls[ind]});
            watchdog = watchdogInterval();

        }
    });

    buttonRight.watch(function(err,value){
        if(err) exit(err);

        if(value){
            console.log("Right button pressed");
            
            paused = false;
            fwDir = true;
            
            ind++;
            if(ind === kioskUrls.length){
				ind = 0;
            } else if(ind === -1){
				ind = kioskUrls.length-1;
            }
            
            if(ind === 0){
                changeReddit();
            }
  
            ledLeft.setDirection('out');
            ledRight.setDirection('in');
            ledPause.setDirection('out');
            
            clearInterval(watchdog);
            sendSource({but:'Right',url:kioskUrls[ind]});
            watchdog = watchdogInterval();
        }
    });

    buttonPause.watch(function(err,value){
        if(err) exit(err);

        if(value) {
            
            paused = !paused;
            
            console.log("Pause button pressed");
            console.log("Slidshow is "+(paused?"now":"not")+" paused.");
            
            ledLeft.setDirection('out');
            ledRight.setDirection('out');
            ledPause.setDirection('in');

            if(!paused && fwDir){
                
                ind++;
                
                ledLeft.setDirection('out');
                ledRight.setDirection('in');
                ledPause.setDirection('out');
                if(ind >= kioskUrls.length){
                    ind = 0;
                } else if(ind <= -1){
                    ind = kioskUrls.length-1;
                }
                if(ind === 0){

                    changeReddit();

                }
                
                sendSource({but:'Unpause',url:kioskUrls[ind]});
                
            }
            else if(!paused && !fwDir){
                
                ind--;
                if(ind >= kioskUrls.length){
                    ind = 0;
                } else if(ind <= -1){
                    ind = kioskUrls.length-1;
                }
                if(ind === 0){

                    changeReddit();

                }
                ledLeft.setDirection('in');
                ledRight.setDirection('out');
                ledPause.setDirection('out');
                
                
                sendSource({but:'Unpause',url:kioskUrls[ind]});
                
            } else if(paused){
                
               
                pause();
                
            }
        }
    });
}

function changeReddit(){
    if(features.reddit){
        if(redditUrls.length){
            var url = randElement(redditUrls);
			var splitUrl = url.split('/');
			var file = splitUrl[splitUrl.length-1];
			
            if(reddit){
                kioskUrls.splice(0,1,url);
                console.log("Replacing first kioskUrls element with new random Reddit pic. "+url);
            } else {

                console.log("Inserting random Reddit pic at beginning of kioskUrls array. " +url);
                kioskUrls.splice(0,0,url);
				reddit = true;
            }
			
			if(redditData[file] && features.speech && ind === 0){
				console.log("Converting the following to speech: "+redditData[file] );
				speak(redditData[file]);
			}
        }
    }
}

function checkReddit(){
	if(features.reddit){
		fs.readdir(redditStore,function(err,files){
			if(!err){
				if(files.length){
					console.log("Found Reddit pics in directory." +redditStore);
					redditUrls = [];
					for(var i in files){

						redditUrls.push('images/'+redditSettings.directory+files[i]);
						console.log("Pushing images/"+redditSettings.directory+files[i]+" to redditUrls array");
	
					}
				}
			} else {
				console.error(err);
			}
		});
	}
}

function cleanReddit(fileNames){
	fs.readdir(redditStore,function(err,files){
		if(!err){
			for(var f in files){
				if(fileNames.indexOf(files[f]) < 0){
					console.log("Old file: "+redditStore+files[f]+". Removing...");
					fs.unlink(redditStore+files[f]);
				}
			}
			checkReddit();
		}
	});
}
function getImg(data,dir,file,callback){
	var dest = dir+file;
	//var data = {};
	//data.url = url;
	fs.access(dest, fs.F_OK,function(err){
		
		if(err){
			httpReq.get(data,dest,function(err,res){
				if(err){
					console.error(err);
					busy = false;
					if(callback) callback(false,data);
					return false;
				} else {

					console.log("Downloaded file "+res.file);

					var resFile = res.file.split('/');
					resFile = resFile[resFile.length-1];

					var contentType = res.stream.headers['content-type'];
					var splitCT = contentType.split('/');

					if(splitCT.length >= 2){
						if(splitCT[0] === 'image'){
							if(splitCT[1] !== 'gif'){	
								resize(res.file);								
							}
						}
					}
					
					busy = false;
					if(callback) callback(resFile,data);
					return resFile;
				}
			});
		} else {
			busy = false;
			console.log(dest+" already exists.  Not downloading.");
			if(callback) callback(file,data);
			return file;
		}
	});
}
function getReddit(){

	var fileNames = [];
	redditData = {};
	
    busy = true;

	if(redditListings.indexOf(redditSettings.listing) !== -1){

		var options = {
			hostname : "www.reddit.com",
			port : 80,
			method: 'GET',
			path : "/r/"+redditSettings.subreddit+"/"+redditSettings.listing+"/.json?limit="+redditSettings.limit,
			headers: {
				'Content-Type':'applications/json'
			},
			family:4
		};
		
		var url = "https://"+options.hostname+options.path;
		
		https.get(url,function(res){
			
			var statusCode = res.statusCode;
			var body = '';
			var error;

			if(statusCode != 200){
				error = new Error('Request Failed.\n Status Code: '+statusCode+'\n URL: '+url+'\n Headers: '+JSON.stringify(res.headers));
			}

			res.on('error',function(err){
				console.error(err.message);
				busy = false;				
			});

			res.on('data',function(chunk){
				body += chunk;
			});
			
			if (error) {
				
				console.log(error.message);
				console.dir(res);
				// consume response data to free up memory
				res.resume();
				busy = false;
				return;
			}
			res.on('end',function(){

				console.log("Received response from Reddit");
				
				try{
					body = JSON.parse(body);
				} catch (e){
					console.dir(body);
					console.error(e);
				}
				
				if(body.data && body.data.children){
					console.log("Reddit success!");
					console.log("Getting the "+redditSettings.listing+" listings from subreddit "+redditSettings.subreddit);
					
					fs.readdir(redditStore,function(err,files){

						if(!err){

							for(var i in body.data.children){
								var child = body.data.children[i];
								if(child.kind === 't3'){

									var data = child.data;
									
									if(data.preview && data.preview.images){
										for(var img in data.preview.images){
											var image = data.preview.images[img];
											var imageType = '';
											var url = '';

											if(image.variants && image.variants.gif){
												imageType='.gif';
												url = image.variants.gif.source.url;
											} else {
												imageType='.jpg';
												url = image.source.url;
											}
											getImg({title:data.title,url:url},redditStore,image.id+imageType,function(file,obj){
												fileNames.push(file);
												redditData[file] = obj.title;

											});
										}
									} else {
										console.error('Data Object in child doesn\'t contain preview image urls.');
										console.dir(data);
										var urlSplit = data.url.split('/');
										var urlSplitEnd = urlSplit[urlSplit.length-1];
										var fileSplit = urlSplitEnd.split('.');
										if(imgurDoms.indexOf(data.domain) !== -1){
											
											imgAlbum(data,function(urls,thisdata){
												if(urls){
													for(var u in urls){
														getImg({title:thisdata.title,url:urls[u]},function(file,obj){
															fileNames.push(file);
															redditData[file] = obj.title;
														});
													}
												} else {
													imgSing(data,function(url,thisdata){
														getImg({title:thisdata.title,url:url},function(file,obj){
															fileNames.push(file);
															redditData[file] = obj.title;
														});
													});
												}
											});
											
										} else {
											if( fileSplit.length === 2){
												var ext = fileSplit[fileSplit.length-1];
												var name = fileSplit[0];
												if(ext === 'gif' || ext === 'jpg' || ext === 'png'){
													getImg({title:data.title,url:data.url},redditStore,name+'.'+ext,function(file,obj){
														fileNames.push(file);
														redditData[file] = obj.title;
													});
												}
											} else {
												
											}
										}
									}
								}
							}
							setTimeout(function(){
								
								console.log(redditData);
								cleanReddit(fileNames);
								
							},seconds*1000*(kioskUrls.length/2));
						} else {
							
							console.log("Reddit storage error");
							console.error(err);
							
						}

						busy = false;
					});
				} else {
					
					console.error('No Data returned.');
				}
				
				busy = false;
			});
			
			busy = false;
			
		}).on('error',function(e){
			
			busy = false;
			console.error('ERROR: '+e.message);
			
		}).end();
		
	} else {
		
		busy = false;
		console.log("Bad Reddit listing type. Must be one of:");
		console.log(redditListings);
		
	}						
	
}

function getWeather(){
    busy = true;
	
    http.get("http://api.wunderground.com/api/"+weatherSettings.key+"/geolookup/alerts/q/"+weatherSettings.state+"/"+weatherSettings.city+".json",function(res){
		var statusCode = res.statusCode;
        var body='';
		var error;
		
		if (statusCode !== 200){
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
            var alerts = body.alerts;
            var needMap = false;

            if(alerts && alerts.length){

                console.log("Detected bad weather");
                console.log("There "+(alerts.length===1?"is ":"are ")+alerts.length+" weather "+(alerts.length===1?"alert.":"alerts."));

                var info = '';
                for(var i in body.alerts){
                    info += (i>0?', ':'')+body.alerts[i].description;
                    var type = body.alerts[i].type;
                    if(visualAlerts.indexOf(type) !== -1){
                        needMap = true;
                    }
                }

                weatherInfo = info;

                console.log(weatherInfo);
				
				sendWeather({bad:true,info:weatherInfo});
				
				if(features.speech){
					speak(weatherInfo);
				}
				
                if(needMap){
					
                    console.log("Downloading weather gif");
					fs.access(gifStore+'weather.gif',function(err){
						if(!err) fs.unlink(gifStore+'weather.gif');
					});
					

                    var data = {
                        url:"http://api.wunderground.com/api/"+weatherSettings.key+"/animatedradar/q/"+weatherSettings.zipcode+".gif?newmaps=1&smooth=1&width="+clientHeight+"&height="+clientHeight+"&radius=75&noclutter=1&reproj.automerc&rainsnow=1&timelabel=1&timelabel.x=10&timelabel.y=20",
                        progress: function(current,total){

                            console.log("Downloaded "+current+" out of "+total);

                        }
                    };

                    getImg(data,gifStore,'weather.gif',function(file){
						if(!badWeather && file){

							console.log("Pushing weather gif onto kioskUrls array");

							kioskUrls.push('images/'+weatherSettings.directory+file);

							badWeather = true;

						} 
					});
		
                } else {

                    busy = false;

					console.log("Bad weather does not require a map. ");
					
                    if(badWeather){
                        console.log("Removing weather gif.");

						fs.access(gifStore+'weather.gif',function(err){
							if(!err) fs.unlink(gifStore+'weather.gif');
						});
						
                        badWeather = false;

                        kioskUrls.pop();
                    }
                }

            } else {

                busy = false;

                if(badWeather){

                    console.log("Bad weather has passed.");
                    console.log("Removing weather gif");
					
					fs.access(gifStore+'weather.gif',function(err){
						if(!err) fs.unlink(gifStore+'weather.gif');
					});
					
                    badWeather = false;

                    kioskUrls.pop();

                    weatherInfo = '';

                    sendWeather({bad:false});

                } else {
                    console.log("There is no bad weather.");
                }
            }
            busy = false;
        });
		
    }).on('error',function(e){
		busy = false;
		console.error('ERROR: '+e.message);
	});
}
function inArray(element,array){
	for(var i in array){
		if(array[i] === element){
			return true;
		}
	}
	return false;
}
function imgAlbum(data,cb){
	imgur.album(data.url,function(urls){
											
		if(cb)cb(urls,data);
	});
}
function imgGal(data,cb){
	imgur.gallery(data.url,function(urls){
											
		if(cb)cb(urls,data);
	});
}
function imgSing(data,cb){
	imgur.image(data.url,function(url){
		if(cb)cb(url,data);
	});
}

function pause(){
    io.emit('Paused',{but:'Pause'});
}

function randElement(arr){
    var rand = Math.random() * arr.length;
    rand = Math.floor(rand);
    console.log("Random index is "+rand+" out of an array length of "+arr.length);
    return arr[rand];
}

function resize(path,fn){

	procQueue.enqueue({'path':path,'width':clientWidth},function(result){
		
		if(result){
			if(fn) fn(true,path);
		} else {
			if(fn) fn(false,path);
		}
		
	});
}
function sendSource(data){
    console.log("Sending url "+data.url+" at index "+ind+" out of "+kioskUrls.length);
    io.emit('sourceChange',data);
}

function sendWeather(data){
    io.emit('weatherInfo',data);
}

function speak(text){
	say.speak(text,speechSettings.voice,speechSettings.speed);
}
function watchdogInterval(){
    
    return setInterval(function(){
        
        while(busy){
            setTimeout(function(){
                console.log("waiting for process to stop...");
            },1000);
        }
        console.log("Watchdog timer");
        if(!paused){
            if(fwDir){
                ind++;
            } else {
                ind--;
            }
           
            if(ind >= kioskUrls.length){
                ind = 0;
            } else if(ind <= -1){
                ind = kioskUrls.length-1;
            }
            if(ind === 0){
                
                changeReddit();
                
            }
            
            sendSource({but:"No",url:kioskUrls[ind]});
            
        }else{

        }
    },seconds * 1000);
}

function exit(err){
    console.log(err);
    buttonLeft.unexport();
    buttonRight.unexport();
    buttonPause.unexport();
    ledLeft.unexport();
    ledRight.unexport();
    ledPause.unexport();
    process.exit();
}

module.exports = app;
server.listen(3000);
