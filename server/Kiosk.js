var fs = require('fs');
var Reddit = require('./features/reddit');
var Weather = require('./features/weather');
var clients = {};
var util = require('util');
var scope;

function NavApp(config,io){
	this.io = io;
	this.config = config;
	scope = this;
	this.reddit;
	this.weather;
	
	console.dir(this.config.getFeatures());
	console.dir(this.config.getSettings("features"));
	
	if(this.config.getFeatures('reddit'))
		this.reddit = new Reddit(this.config.getSettings("features").reddit);

	if(this.config.getFeatures('weather')){
		this.weather = new Weather(this.config.getSettings('features').weather);
		this.weather.setMaxListeners(0);
		this.weather.on('alert',function(data){
			console.log("Caught weather alert emit.");
			io.emit('alert',data);
		});
	}
	
	this.sockHandler = sockHandler;
	io.on('connection',this.sockHandler);

	io.on('disconnect',function(socket){
		socket.removeListener('connection');
		console.log("Received disconnect in app.js");
	});
	
	io.sockets.setMaxListeners(100);
	
}

var sockHandler = function(socket){
	var t = scope;
	console.log("Client connected to socket...");
	
	clients[socket.id] = socket;
	
	var currentSlide = {
		index: 0
	};
	var refreshData = function(cb){
		t.config.slideLength(function(length){
			if(currentSlide.index < 0) currentSlide.index = length-1;
			if(currentSlide.index >= length) currentSlide.index = 0;
			
			t.config.getSlide(currentSlide.index,function(slide){
				
				t.popSlide(slide,function(filledSlide){
					currentSlide.data = filledSlide;
					if(cb)cb();
				});
			});
		});
	};
	
	var info = {
		kiosk: {
			name: t.config.getSettings("kiosk.name"),
			seconds: t.config.getSettings("kiosk.seconds")
		},
		slide:currentSlide,
		alerts:(t.weather?t.weather.alerts:{alerts:[]})
	};
	
	refreshData(function(){
		console.log("Sending initial info");
		console.dir(info);
		socket.emit('init',info);
	});

	socket.on('clientInfo',function(data){
		clients[socket.id].clientInfo = data;
		console.log("Received client info from "+socket.id+". Data:");
		console.dir(data);
	});
	
	socket.on('getNextSlide',function(data){
		currentSlide.index += 1;
		refreshData(function(){
			console.log("Sending next slide to "+socket.id);
			console.log("Slide info");
			console.dir(info.slide);
			console.log("There "+(info.alerts.alerts.length===1?"is ":"are ")+info.alerts.alerts.length+" weather "+(info.alerts.alerts.length===1?"alert.":"alerts."));
			if(info.alerts.alerts){
				info.alerts.alerts.forEach(function(alert,ind,all){
					console.log("Alert "+parseInt(ind+1)+": "+alert.description);
				
				});
			}
			socket.emit('nextSlide',info);
		});
	});

	socket.on('getPrevSlide',function(data){
		currentSlide.index -= 1;
		socket.emit('prevSlide',info);
	});
	
	 socket.on('disconnect', function () {
		console.log('user disconnected - '+socket.id);
	
		delete clients[socket.id];
	 });
};

NavApp.prototype.popSlide = function(slide,cb){

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
				console.error(err);
				if(cb)cb({});
				return {};
			}
			if(cb)cb(slide);
			return slide;
		});
	}
	else if(slide.sourceType === 'reddit' && t.config.getFeatures('reddit')){
		t.reddit.getRandomImage(function(slide){
			if(cb)cb(slide);
			return slide;
		});
			
	} else {
		if(cb)cb({});
		return {};
	}
};

module.exports = NavApp;