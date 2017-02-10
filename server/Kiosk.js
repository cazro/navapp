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
	this.sockHandler = sockHandler;
	this.info;
	this.currentSlide;
	
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
			scope.info.alerts.alerts = data;
		});
	}
	this.currentSlide = {
		index: 0
	};
	this.refreshData = function(cb){
		config.slideLength(function(length){
			if(scope.currentSlide.index < 0) scope.currentSlide.index = length-1;
			if(scope.currentSlide.index >= length) scope.currentSlide.index = 0;
			
			config.getSlide(scope.currentSlide.index,function(slide){
				
				scope.popSlide(slide,function(filledSlide){
					scope.currentSlide.data = filledSlide;
					if(cb)cb();
				});
			});
		});
	};
	
	this.info = {
		kiosk: {
			name: config.getSettings("kiosk.name"),
			seconds: config.getSettings("kiosk.seconds")
		},
		slide:scope.currentSlide,
		alerts:(this.weather?this.weather.alerts:{alerts:[]})
	};

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
	
	t.refreshData(function(){
		console.log("Sending initial info");
		console.dir(t.info);
		socket.emit('init',t.info);
	});

	socket.on('clientInfo',function(data){
		clients[socket.id].clientInfo = data;
		console.log("Received client info from "+socket.id+". Data:");
		console.dir(data);
	});
	
	socket.on('getNextSlide',function(data){
		t.currentSlide.index += 1;
		t.refreshData(function(){
			console.log("Sending next slide to "+socket.id);
			console.log("Slide info");
			console.dir(t.info.slide);
			console.log("There "+(t.info.alerts.alerts.length===1?"is ":"are ")+t.info.alerts.alerts.length+" weather "+(t.info.alerts.alerts.length===1?"alert.":"alerts."));
			if(t.info.alerts.alerts){
				t.info.alerts.alerts.forEach(function(alert,ind,all){
					console.log("Alert "+parseInt(ind+1)+": "+alert.description);
				
				});
			}
			socket.emit('nextSlide',t.info);
		});
	});

	socket.on('getPrevSlide',function(data){
		t.currentSlide.index -= 1;
		socket.emit('prevSlide',t.info);
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