var fs = require('fs');
var Reddit = require('./features/reddit');
var Weather = require('./features/weather');

function NavApp(config){
	
	this.config = config;
	
	if(this.config.getFeatures('reddit'))
		this.reddit = new Reddit(this.config.getSettings("features"));

	if(this.config.getFeatures('weather'))
		this.weather = new Weather(this.config.getSettings('features'));

};
NavApp.prototype.sockHandler = function(socket){
	var t = this;
    console.log("Client connected to socket...");
	
	var currentSlide = {
		index: 0,
		data: popSlide(t.config.getSlide(index))
	};
	
    var info = {
		"kiosk": {
			name: t.config.getSettings("kiosk.name"),
			seconds: t.config.getSettings("kiosk.seconds")
		},
        "slide":currentSlide
    };
    
    socket.emit('init',info);
	
    t.weather.on('alert',function(data){
		socket.broadcast.emit('alert',data);
	});
	
    socket.on('getNextSlide',function(data){
		currentSlide.index += 1;
		socket.emit('nextSlide',info);
	});
	
	socket.on('getPrevSlide',function(data){
		currentSlide.index -= 1;
		socket.emit('prevSlide',info);
	});
};

NavApp.prototype.popSlide = function(slide){
	var t = this;
	var currentSlide = slide;
	
	if(currentSlide.sourceType === 'url') {
		
		return currentSlide;
	} 
	else if(currentSlide.sourceType === 'folder'){
		
		var folder = (currentSlide.source?'user_images/'+currentSlide.source+'/':'user_images/');
		
		fs.readdir(folder,function(err,files){
			if(!err){
				if(files){
					var file = files[Math.floor(Math.random()*files.length)];
					
					currentSlide.source = folder+file;
					currentSlide.name = currentSlide.name?currentSlide.name:currentSlide.source;
					
				} else {
					return {};
				}
			} else {
				console.error(err);
				return {};
			}
			
			return currentSlide;
		});
	}
	else if(currentSlide.sourceType === 'reddit' && t.config.getFeatures('reddit')){
		
		return t.reddit.getRandomImage();	
	} else {
		return {};
	}
};

module.exports = NavApp;