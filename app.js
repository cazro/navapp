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
    var gm = require('gm');
    var reddit = new rawjs("IBA Osha pic grabber");
    var redditSettings = settings.reddit;
    var oshaStore = imgStore+redditSettings.directory;
    var oshaUrls = [];
    
}

var seconds = settings.seconds;
var urls = settings.urls;
var ind = 0;
var badWeather = false;
var weatherInfo = '';
var osha = false;
var busy = false;
var clientHeight;
var clientWidth;
// uncomment after placing your favicon in /public
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
if(features.reddit){
    fs.readdir(oshaStore,function(err,files){
        if(!err){
            if(files.length){
                console.log("Found osha pics in directory." +oshaStore);
                for(var i in files){
                    
                    oshaUrls.push('images/osha/'+files[i]);
                    console.log("Pushing images/osha/"+files[i]+" to oshaUrls array");
                    resize(oshaStore+files[i],function(res,path){
                        if(res){
                            
                            path = path.split('/');
                            
                        } else {
                            fs.unlink(path);
                            path = path.split('/');
                            if(urls[0] === 'images/osha/'+path[path.length-1]){
                                changeOsha();
                            }
                        }
                    });
                    if(i == (files.length-1)){
                        changeOsha();
                    }
                }
            }
        }
    });
}

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
                
                if(alerts.length){
                    
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
                    if(needMap){
                        
                        console.log("Downloading weather gif");

                        sendWeather({bad:true,info:weatherInfo});
                        
                        var data = {
                            url:"http://api.wunderground.com/api/"+weatherSettings.key+"/animatedradar/q/"+weatherSettings.zipcode+".gif?newmaps=1&smooth=1&width="+clientHeight+"&height="+clientHeight+"&radius=75&noclutter=1&reproj.automerc&rainsnow=1&timelabel=1&timelabel.x=10&timelabel.y=20",
                            progress: function(current,total){

                                console.log("Downloaded "+current+" out of "+total);

                            }
                        };

                        getImg(data,gifStore+'weather.gif','weather');
                        
                    } else {
                        
                        busy = false;
                        
                        if(badWeather){
                            console.log("Removing weather gif");
                        
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
    },weatherSettings.refresh*1000);
}
//Interval to check reddit for Osha pics
if(features.reddit){
    setInterval(function(){
        
        busy = true;
        
        reddit = new rawjs("IBA Osha pic grabber");
        reddit.setupOAuth2(redditSettings.clientId, redditSettings.secret, "http://www.iba-protontherapy.com");

        var rOptions = {
            r:"osha",
            all:true,
            limit:30
        };
        reddit.hot(rOptions,function(err,res){
            if(!err){
                
                console.log("Reddit success!");
                
                fs.readdir(oshaStore,function(err,files){
                    if(!err){
                        for(var f in files){
                            
                            fs.unlink(oshaStore+files[f]);
                            
                            console.log("Removing "+files[f]+" from osha directory");
                        }
                    }
                });
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
                                    var splitFile = splitUrl[splitUrl.length-1].split('.');
                                    if(splitFile.length === 1){
                                        
                                        data.url = data.url+'.jpg';
                                        
                                        getImg(data,oshaStore+splitUrl[splitUrl.length-1]+'.jpg','unknown');
                                        
                                    } else if(splitFile.length === 2){
                                        
                                        var extension = splitFile[1];
                                        
                                        if(extension === 'jpg' || extension === 'gif' || extension === 'jpeg' || extension === 'png'){
                                            
                                            getImg(data,oshaStore+splitUrl[splitUrl.length-1],'jpg');
                                            
                                        } else if(extension === 'gifv'){
                                            
                                            var urlNoExt = data.url.split('gifv')[0];
                                            data.url = urlNoExt+'gif';
                                            
                                            getImg(data,oshaStore+splitFile[0]+'.gif','gif');
                                            
                                        }
                                    } else {
                                        console.log("Don't know what to do with the URL");
                                    } // Check is link is a direct link to the picture
                                } // if loop on the last url segment
                            } // Loop through the url split by '/'	
                        } // if link is from imgur
                    } // if result is a link
                } // for(res.children)
                //console.log("Osha URLs: "+oshaUrls);
                busy = false;
            } else {
                console.log("Reddit error");
            }
        });
    },redditSettings.refresh*1000);//1000000 is about 16 minutes.
}
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
                changeOsha();
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
                changeOsha();
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
                
                //watchdog = watchdogInterval();
                sendSource({but:'Unpause',url:urls[ind]});
                
            }
            else if(!paused && !fwDir){
                
                ind--;
                
                ledLeft.setDirection('in');
                ledRight.setDirection('out');
                ledPause.setDirection('out');
                
                //watchdog = watchdogInterval();
                sendSource({but:'Unpause',url:urls[ind]});
                
            } else if(paused){
                
                //clearInterval(watchdog);
                pause();
                
            }
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
function pause(){
    io.emit('Paused',{but:'Pause'});
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

            if(ind === urls.length || ind === -1){

                fs.readdir(oshaStore,function(err,files){
                    if(!err){
                        console.log("Clearing oshaUrls array.");
                        
                        oshaUrls.splice(0,oshaUrls.length);
                        oshaUrls.length = 0;
                        
                        for(var f in files){
                            oshaUrls.push('images/osha/'+files[f]);
                            console.log("Pushing "+files[f]+" to oshaUrls array");
                        }
                    }
                });
            }
            //checkInd(urls,ind);
            if(ind >= urls.length){
                ind = 0;
            } else if(ind <= -1){
                ind = urls.length-1;
            }
            if(ind === 0){
                changeOsha();
            }
            
            sendSource({but:"No",url:urls[ind]});
            //io.emit('newSource',{url:urls[ind]});
            
        }else{

        }
    },seconds * 1000);
};
function resize(path,fn){
    gm(path).size(function(err,size){
        if(err){
            console.log(err);
            if(fn) fn(false,path);
        }
    }).resize(1200,'>').resize(1200,'<').write(path,function(err){
        if(!err) {
            console.log("Resize done on "+path);
            if(fn) fn(true,path);
        } else {
            if(fn) fn(false,path);
        }
    });
}

function randElement(arr){
    var rand = Math.random() * arr.length;
    rand = Math.floor(rand);
    console.log("Random index is "+rand+" out of an array length of "+arr.length);
    return arr[rand];
}
function getImg(data,dest,type){
    httpReq.get(data,dest,function(err,res){
        if(err){
            console.error(err);
            busy = false;
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
                                
                            });
                        } else {
                            
                            resize(res.file);
                           
                        }
                    } else {
                        
                        fs.unlink(res.file);
                    }
                }
            } else if(type === 'weather'){
                
                busy = false;
                            
                if(!badWeather){

                    console.log("Pushing weather gif onto urls array");

                    urls.push('images/gif/weather.gif');

                    badWeather = true;

                }   
            }
        }
    });
    
}

function checkInd(array,index){
    
    
}
function changeOsha(){
    if(oshaUrls.length){
        var url = randElement(oshaUrls);
        if(osha){
            urls.splice(0,1,url);
            console.log("Replacing first urls element with new random osha pic. "+url);
        } else {

            console.log("Inserting random Osha pic at beginning of urls array. " +url);
            urls.splice(0,0,url);
            osha = true;
        }
    }
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
