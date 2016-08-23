var express = require('express');
var app = express();
var server = require('http').Server(app);
var cp = require('child_process');
require( "console-stamp" )( console, { pattern : "dd/mm/yyyy HH:MM:ss.l" } );

var io = require('socket.io')(server);
var path = require('path');
var logger = require('morgan');
var fs = require('fs');
var routes = require('./routes/index');
var http = require('http');
var httpReq = require('http-request');

var config = require('config');
console.log("CWD: "+process.cwd());
console.log('NODE_CONFIG_DIR: ' + config.util.getEnv('NODE_CONFIG_DIR'));
var features = config.get('features');
var settings = config.get('settings');
var appPath = process.cwd()+'/';
var imgStore = appPath+'public/images/';

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
    var fwDir = true;
    var paused = false;
}

if(features.weather){
    console.log("Weather checking is enabled");
    var weatherSettings = settings.weather;
    var gifStore = imgStore+weatherSettings.directory;
   
}

if(features.reddit){
    console.log("Reddit is enabled");
	
    var rawjs = require('raw.js');
	var redditApp = new rawjs("IBA Reddit pic grabber");
	
	var WorkQueue = require('mule').WorkQueue;
	var procQueue = new WorkQueue('./resize.js');
	
    var redditSettings = settings.reddit;
    var redditStore = imgStore+redditSettings.directory;
    var redditUrls = [];
	var redditListings = ['hot','top','new','controversial','random'];
}

var seconds = settings.seconds;
var urls = settings.urls;
var ind = 0;
var badWeather = false;
var weatherInfo = '';
var reddit = false;
var busy = false;
var clientHeight;
var clientWidth;

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

console.log("Number of urls: "+urls.length);

checkReddit();

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
        sendSource({but:"No",url:urls[ind]});
    });
    
    socket.on('sourceRequest',function(fn){
        console.log("Source Requested");
        sendSource({but:"No",url:urls[ind]});
    });
});

// Interval to change the page on the kiosk
var watchdog = watchdogInterval();

// Interval to check the weather
if(features.weather){
    setInterval(function(){
        getWeather(); 
    },weatherSettings.refresh*1000);
}

//Interval to check reddit for pics
if(features.reddit){
	setTimeout(function(){
		getReddit();
	},30*1000);
	
    setInterval(function(){
        getReddit();   
    },redditSettings.refresh*1000);//1000000 is about 16 minutes.
}

// Interrupts for button presses.
if(features.rpi){
    buttonLeft.watch(function(err,value){

        if(err) exit(err);

        if(value){

            console.log("Left button pressed");
            paused = false;
            fwDir = false;
            
            ind--;
            if(ind === urls.length){
                ind = 0;
            } else if(ind === -1){
                ind = urls.length-1;
            }
            if(ind === 0){
                changeReddit();
            }

            ledLeft.setDirection('in');
            ledRight.setDirection('out');
            ledPause.setDirection('out');
            
            clearInterval(watchdog);
            sendSource({but:'Left',url:urls[ind]});
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
            if(ind === urls.length){
                    ind = 0;
            } else if(ind === -1){
                    ind = urls.length-1;
            }
            
            if(ind === 0){
                changeReddit();
            }
  
            ledLeft.setDirection('out');
            ledRight.setDirection('in');
            ledPause.setDirection('out');
            
            clearInterval(watchdog);
            sendSource({but:'Right',url:urls[ind]});
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
                if(ind >= urls.length){
                    ind = 0;
                } else if(ind <= -1){
                    ind = urls.length-1;
                }
                if(ind === 0){

                    changeReddit();

                }
                
                sendSource({but:'Unpause',url:urls[ind]});
                
            }
            else if(!paused && !fwDir){
                
                ind--;
                if(ind >= urls.length){
                    ind = 0;
                } else if(ind <= -1){
                    ind = urls.length-1;
                }
                if(ind === 0){

                    changeReddit();

                }
                ledLeft.setDirection('in');
                ledRight.setDirection('out');
                ledPause.setDirection('out');
                
                
                sendSource({but:'Unpause',url:urls[ind]});
                
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
            if(reddit){
                urls.splice(0,1,url);
                console.log("Replacing first urls element with new random Reddit pic. "+url);
            } else {

                console.log("Inserting random Reddit pic at beginning of urls array. " +url);
                urls.splice(0,0,url);
                reddit = true;
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
					for(var i in files){

						redditUrls.push('images/'+redditSettings.directory+files[i]);
						console.log("Pushing images/"+redditSettings.directory+files[i]+" to redditUrls array");
	
						if(i == (files.length-1)){
							changeReddit();
						}
					}
				} else {
					getReddit();
				}
			} else {
				console.error(err);
			}
		});
	}
}
function getImg(data,dir,file,type,fn){
	dest = dir+file;
	fs.access(dest, fs.F_OK,function(err){
		
		if(err){
			httpReq.get(data,dest,function(err,res){
				if(err){
					console.error(err);
					busy = false;
					if(fn) fn(false);
				} else {

					console.log("Downloaded file "+res.file);

					var imgFile = res.file.split('/');
					imgFile = imgFile[imgFile.length-1];

					if(type === 'jpg'){

						resize(res.file);

					} else if(type ==='unknown'){

						var contentType = res.stream.headers['content-type'];
						var splitCT = contentType.split('/');

						if(splitCT.length >= 2){
							if(splitCT[0] === 'image'){
								if(splitCT[1] === 'gif'){

									fs.rename(res.file,res.file.split('.')[0]+'.gif',function(){

										console.log("Changed to .gif from .jpg");

										resize(res.file.split('.')[0]+'.gif');
										
										if(fn) fn(file.split('.')[0]+'.gif');

									});
									
								} else {

									resize(res.file);
									if(fn) fn(file);
								}
							} else {

								fs.unlink(res.file);
								if(fn) fn(false);
							}
						} else {
							if(fn) fn(false);
						}
					}
					
					busy = false;
					if(fn) fn(file);
				}
			});
		} else {
			console.log(dest+" already exists.  Not downloading.");
			if(fn) fn(file);
		}
	});
}
function getReddit(){
    var temp = [];
	var fileNames = [];
    busy = true;

    redditApp = new rawjs("IBA picture grabber");
    redditApp.setupOAuth2(redditSettings.clientId, redditSettings.secret, "http://www.iba-protontherapy.com");

    var rOptions = {
        r: redditSettings.subreddit,
        all:true,
        limit:redditSettings.limit
    };
	if(redditListings.indexOf(redditSettings.listing) !== -1){
		redditApp[redditSettings.listing](rOptions,function(err,res){
			if(!err){

				console.log("Reddit success!");
				console.log("Getting the "+redditSettings.listing+" listings from subreddit "+redditSettings.subreddit);
				fs.readdir(redditStore,function(err,files){

					if(!err){

						for(var i in res.children){

							if(res.children[i].kind === 't3'){

								var data = res.children[i].data;

								if(data.domain === 'imgur.com' || data.domain === 'i.imgur.com'){

									var splitUrl = data.url.split('/');

									for(var s in splitUrl){

										if(splitUrl[s] === 'a' || splitUrl[s] === 'gallery'){

											break;
										}

										var len = splitUrl.length - 1;

										if(len == s){

											var fileName = splitUrl[splitUrl.length-1];


											var splitFile = fileName.split('.');

											if(splitFile.length === 1){

												data.url = data.url+'.jpg';
												fileNames.push(fileName+'.jpg');
												fileNames.push(fileName+'.gif');
												

												if(!inArray(fileName+'.jpg',files) && !inArray(fileName+'.gif',files)){
													fileName = fileName+'.jpg';
													getImg(data,redditStore,fileName,'unknown',function(retFile){
														if(retFile){
															temp.push('images/'+redditSettings.directory+retFile);
														}
													});
													
												} else {
													
													console.log("Reddit image already downloaded. "+fileName);
												}

											} else if(splitFile.length === 2){

												var extension = splitFile[1];

												if(extension === 'jpg' ||  extension === 'jpeg' || extension === 'png'){

													fileNames.push(fileName);

													if(!inArray(fileName,files)){
														getImg(data,redditStore,splitUrl[splitUrl.length-1],'jpg',function(retFile){
															if(retFile){
															
																temp.push("images/"+redditSettings.directory+retFile);
															}
														});
														
													}else {
														console.log("Reddit image already downloaded. "+fileName);
													}

												}
											}
											else {
												console.log("Don't know what to do with the URL");
											} // Check is link is a direct link to the picture


										} // if loop on the last url segment
									} // Loop through the url split by '/'	
								} // if link is from imgur
							} // if result is a link
						} // for(res.children)
						fs.readdir(redditStore,function(err,files){
							if(!err){
								for(var f in files){
									if(!inArray(files[f],fileNames)){
										fs.unlink(redditStore+files[f]);
									}
								}
							}
						});
					}
					redditUrls = temp;
				});           

			} else {
				console.log("Reddit error");
				console.error(err);
			}
			busy = false;
		});
	} else {
		console.log("Bad Reddit listing type. Must be one of:");
		console.log(redditListings);
	}
}

function getWeather(){
    busy = true;
        
    http.get("http://api.wunderground.com/api/"+weatherSettings.key+"/geolookup/alerts/q/"+weatherSettings.zipcode+".json",function(res){

        var body='';

        res.on('data',function(chunk){
            body += chunk;
        });

        res.on('end',function(){

            console.log("Received response from wunderground");

            body = JSON.parse(body);
            var alerts = body.alerts;
            var needMap = false;

            if(alerts && alerts.length){

                console.log("Detected bad weather");
                console.log("There "+(alerts.length===1?"is ":"are ")+alerts.length+" weather "+(alerts.length===1?"alert.":"alerts."));

                var info = '';
                for(var i in body.alerts){
                    info += (i>0?', ':'')+body.alerts[i].description;
                    var type = body.alerts[i].type;
                    if(type === 'HUR' || type === 'TOR' || type === 'TOW' || type === 'WRN' || type === 'SEW' || type === 'WIN' || type === 'FLO' || type === 'WAT' || type === 'SVR' || type === 'SPE' || type === 'HWW'){
                        needMap = true;
                    }
                }

                weatherInfo = info;

                console.log(info);
				
				sendWeather({bad:true,info:weatherInfo});
				
                if(needMap){

                    console.log("Downloading weather gif");

                    var data = {
                        url:"http://api.wunderground.com/api/"+weatherSettings.key+"/animatedradar/q/"+weatherSettings.zipcode+".gif?newmaps=1&smooth=1&width="+clientHeight+"&height="+clientHeight+"&radius=75&noclutter=1&reproj.automerc&rainsnow=1&timelabel=1&timelabel.x=10&timelabel.y=20",
                        progress: function(current,total){

                            console.log("Downloaded "+current+" out of "+total);

                        }
                    };

                    if(getImg(data,gifStore+'weather.gif','weather')){
					
						if(!badWeather){

							console.log("Pushing weather gif onto urls array");

							urls.push('images/'+weatherSettings.directory+'weather.gif');

							badWeather = true;

						} 
					}
                } else {

                    busy = false;

					console.log("Bad weather does not require a map. ");
					
                    if(badWeather){
                        console.log("Removing weather gif.");

                        badWeather = false;

                        urls.pop();
                    }
                }

            } else {

                busy = false;

                if(badWeather){

                    console.log("Bad weather has passed.");
                    console.log("Removing weather gif");

                    badWeather = false;

                    urls.pop();

                    weatherInfo = '';

                    sendWeather({bad:false});

                } else {
                    console.log("There is no bad weather.");
                }
            }
            busy = false;
        });
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
//	var fork = cp.fork('./resize');
//	fork.send({'path':path});
//
//	fork.on('message',function(m){
//		if(m){
//			if(fn) fn(true,path);
//			fork.kill();
//		} else {
//			if(fn) fn(false,path);
//			fork.kill();
//		}
//		
//	});
	
	
	procQueue.enqueue({'path':path},function(result){
		
		if(result){
			if(fn) fn(true,path);
		} else {
			if(fn) fn(false,path);
		}
		
	});
}
function sendSource(data){
    console.log("Sending url "+data.url+" at index "+ind);
    io.emit('sourceChange',data);
}

function sendWeather(data){
    io.emit('weatherInfo',data);
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
           
            if(ind >= urls.length){
                ind = 0;
            } else if(ind <= -1){
                ind = urls.length-1;
            }
            if(ind === 0){
                
                changeReddit();
                
            }
            
            sendSource({but:"No",url:urls[ind]});
            
        }else{

        }
    },seconds * 1000);
}

function checkInd(array,index){
    
    
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
