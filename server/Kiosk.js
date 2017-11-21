var fs = require('fs');
var Reddit = require('./features/reddit');
var Weather = require('./features/weather');
var logger = require('./utils/logger');
var clients = {};
var util = require('util');
var scope,alerts;

function Kiosk(config,io){
	this.io = io;
	this.config = config;
	scope = this;
	this.reddit;
	this.weather;
	this.sockHandler = sockHandler;
	this.info;
	
	logger.debug("Features enabled/disabled:");
    logger.debug(this.config.getFeatures());
	logger.info("Kiosk Settings:");
    logger.info(this.config.getSettings());
	
	if(this.config.getFeatures('reddit'))
		this.reddit = new Reddit(this.config.getSettings("features").reddit);

	if(this.config.getFeatures('weather')){
		this.weather = new Weather(this.config.getSettings('features').weather);
        alerts = this.weather.alerts;
		this.weather.setMaxListeners(0);
		this.weather.on('alert',function(data){
			logger.debug("Caught weather alert emit.");
			io.emit('alert',data);
			scope.info.alerts = data;
            alerts = data;
		});
	}
	
	this.info = {
		kiosk: {
			name: config.getSettings("kiosk.name"),
			seconds: config.getSettings("kiosk.seconds")
		},
		alerts:(scope.weather?scope.weather.alerts:{alerts:[]})
	};

	io.on('connection',this.sockHandler);

	io.on('disconnect',function(socket){
		socket.removeListener('connection');
		logger.debug("Received disconnect in app.js");
	});
	
	io.sockets.setMaxListeners(100);
	
}

var sockHandler = function(socket){
	clients[socket.id] = socket;
	logger.info("Client %s has connected to the kiosk...",socket.id);
	
    var currentSlide = {
		index: 0
	};
	
	var info = {
		kiosk: scope.info.kiosk,
		alerts:(alerts?alerts:{alerts:[],slide:{}}),
		slide: currentSlide
	};
	
	var refreshData = function(cb){
		scope.config.slideLength(function(length){
			if(currentSlide.index < 0) currentSlide.index = length;
			if(currentSlide.index > length) currentSlide.index = 0;
			
            if(currentSlide.index === length && alerts.alerts.length){
                currentSlide.data = alerts.slide;
                if(cb)cb();
            }
            else if(currentSlide.index === length && !alerts.alerts.length){
                currentSlide.index = 0;
                scope.config.getSlide(currentSlide.index,function(slide){

                    scope.popSlide(slide,function(filledSlide){
                        currentSlide.data = filledSlide;
                        if(cb)cb();
                    });
                });
            } else {
                scope.config.getSlide(currentSlide.index,function(slide){

                    scope.popSlide(slide,function(filledSlide){
                        currentSlide.data = filledSlide;
                        if(cb)cb();
                    });
                });
            }
		});
	};
	
	refreshData(function(){
		logger.info("Sending initial kiosk description and slide to %s:", socket.id);
        logger.info(info);
		
		socket.emit('init',info);
	});

	socket.on('clientInfo',function(data){
		clients[socket.id].clientInfo = data;
		logger.debug("Received client info from %s. Data: %j",socket.id,data);
		
	});
	
	socket.on('getNextSlide',function(data){
		currentSlide.index += 1;
		refreshData(function(){
			logger.info("Sending next slide to %s",socket.id);
			logger.info("Slide info:");
            logger.info(info.slide);
			socket.emit('nextSlide',info);
		});
	});

	socket.on('getPrevSlide',function(data){
		currentSlide.index -= 1;
		socket.emit('prevSlide',info);
	});
	
	socket.on('disconnect', function () {
	   logger.debug('user disconnected - '+socket.id);

	   delete clients[socket.id];
	});
};

Kiosk.prototype.popSlide = function(slide,cb){

	var t = this;
	if(slide.sourceType === 'url') {
		if(cb)cb(slide);
		return slide;
	} 
	else if(slide.sourceType === 'folder'){
		var folder = 'user_images/'+slide.folder+'/';
		fs.readdir(folder,function(err,files){
			if(!err){
				if(files){
					var file = files[Math.floor(Math.random()*files.length)];
					
					slide.source = folder+file;
					slide.name = slide.name?slide.name:slide.folder;
					
				} else {
					if(cb)cb({});
					return {};
				}
			} else {
				logger.error(err);
				if(cb)cb({});
				return {};
			}
			if(cb)cb(slide);
			return slide;
		});
	}
	else if(slide.sourceType === 'reddit' && t.config.getFeatures('reddit')){
		t.reddit.getRandomImage(slide.source,function(slide){
			if(cb)cb(slide);
			return slide;
		});
			
	} else {
		if(cb)cb({});
		return {};
	}
};

module.exports = Kiosk;