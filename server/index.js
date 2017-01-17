var fs = require('fs');
var Reddit = require('./features/reddit');
var Weather = require('./features/weather');
var scope;

function NavApp(config,io){
	this.io = io;
	this.config = config;
	scope = this;
	
	console.dir(this.config.getFeatures());
	console.dir(this.config.getSettings("features"));
	
	if(this.config.getFeatures('reddit'))
		this.reddit = new Reddit(this.config.getSettings("features").reddit);

	if(this.config.getFeatures('weather'))
		this.weather = new Weather(this.config.getSettings('features').weather);
	
	this.sockHandler = sockHandler;
	
	io.on('connection',this.sockHandler);
}

var sockHandler = function(socket){
	var t = scope;
	console.log("Client connected to socket...");
	
	var currentSlide = {
		index: 0
	};
	currentSlide.refreshData = function(cb){
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
		slide:currentSlide
	};
	
	currentSlide.refreshData(function(){
		console.log("Sending initial info");
		console.log(info);
		socket.emit('init',info);
	});
	
	if(t.weather){
		t.weather.on('alert',function(data){
			socket.broadcast.emit('alert',data);
		});
	}

	socket.on('getNextSlide',function(data){
		currentSlide.index += 1;
		currentSlide.refreshData(function(){
			console.log("Sending next slide");
			console.dir(currentSlide);
			socket.emit('nextSlide',info);
		});
	});

	socket.on('getPrevSlide',function(data){
		currentSlide.index -= 1;
		socket.emit('prevSlide',info);
	});
	
	 socket.on('disconnect', function () {
		scope.io.emit('user disconnected');
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