var https = require('https');
var fs = require('fs');
var request = require('http-request');
var logger = require('../utils/logger');

function reddit(conf){
	var t = this;
	this.t = this;
	this.redditData = {};
	this.rawRedditData = {};
	this.subreddit = conf.subreddit;
	this.listing = conf.listing.toLowerCase();
	this.limit = conf.limit;
	this.refresh = conf.refresh;
	this.getImages = getImages;
	
	if (!fs.existsSync('public/images/reddit')){
		fs.mkdirSync('public/images/reddit');
	}
	
	if(Array.isArray(this.subreddit)){
		for(var s in this.subreddit){
			if (!fs.existsSync('public/images/reddit/'+this.subreddit[s].toLowerCase())){
				fs.mkdirSync('public/images/reddit/'+this.subreddit[s].toLowerCase());
			}
		}
	} else {
		if (!fs.existsSync('public/images/reddit/'+this.subreddit.toLowerCase())){
			fs.mkdirSync('public/images/reddit/'+this.subreddit.toLowerCase());
		}
	}
	
	this.refreshData = function(cb){
		var t = this;
		this.getImages(function(data,raw){
			t.redditData = data;
			t.rawRedditData = raw;
			
			if(data.images){
                var downCount = 0;
				for(var i in data.images){
					var image = data.images[i];

					image.headers = {
						accept: '*/*'
					};

					image.maxRedirects = 30;

					var dest = 'public/images/reddit/'+image.subreddit+'/'+image.file;
                    try{
                        fs.accessSync(dest, fs.F_OK);
                        logger.debug("%s already exists.  Not downloading.",dest);
                        downCount++;
                        if(downCount === data.images.length){
                            cleanDir(data.images);
                        }
                    } catch(e){
                        download(image,dest,function(img,dst){
                            downCount++;
                            if(downCount === data.images.length){
                                cleanDir(data.images);
                            }
                        });
                    }
                    
				}				
			}
		
			if(cb && data)cb(true);
			if(cb && !data)cb(false);
			if(!cb && data)return true;
			if(!cb && !data)return false;
		});
	};
	
	this.refreshData();
	
	this.interval = setInterval(function(){
		t.refreshData();
	},this.refresh*1000);
	
};
function cleanDir(images){
	var dir,sub,image,file,old;
    var subDirs = fs.readdirSync('public/images/reddit/');
    var subs = [];
	for(var i in images){
		old = true;
		image = images[i];
		sub = image.subreddit;
        if(subs.indexOf(sub) === -1){
            subs.push(sub);
        }
		dir = 'public/images/reddit/'+sub;
		var files = fs.readdirSync(dir);
		var cnt = 0;
		if(files){
			
			for(var f in files){
				file = files[f];
				old = true;
				var cnt2=0;
				for(var a in images){
					if(file === images[a].file){
						old = false;
					}

					if(old && cnt2 == (images.length-1)){
						logger.debug("Removing ye old file %s",file);
                        try{
                            fs.accessSync(dir+'/'+file,fs.F_OK);
                            fs.unlink(dir+'/'+file);
                        } catch(e){
                            
                        }
                        
					}
					cnt2++;
				}
				cnt++;
			}
		}
	}
    for(var s in subDirs){
        if(subs.indexOf(subDirs[s]) === -1){
            //There's a subreddit directory that doesn't need to exist probably due to removing it from config.
            fs.unlink('public/images/reddit/'+subDirs[s]+'/');
            logger.debug("Removing subreddit directory %s because no downloaded image is from that subreddit.",subDirs[s]);
        }
    }
}
reddit.prototype.getImageData = function(filename,cb){
	var t = this;
	if(t.redditData.images){
		for(var i in t.redditData.images){
			var image = t.redditData.images[i];
			if(filename === image.file){
				if(cb)cb(image);
				return image;
			}
		}
	}
	if(cb)cb({});
	return {};
};

reddit.prototype.getRandomImage = function(sub,cb){
	if(this.redditData.images){
		var image = this.redditData.images[Math.floor(Math.random()*this.redditData.images.length)];
		while(image.subreddit !== sub){
			
			image = this.redditData.images[Math.floor(Math.random()*this.redditData.images.length)];
		}
		if(cb)cb(image);
		return image;
	} else {
		if(cb)cb({});
		return {};
	}
};

reddit.prototype.getHotImages = function(cb){
	var t = this;
    getImages(this.subreddit,this.limit,'hot',function(data,raw){
		t.redditData = data;
		t.rawRedditData = raw;
        if(cb){
            cb(data);
        } else {
            return data;
        }
    });
};

reddit.prototype.getNewImages = function(cb){
	var t = this;
    getImages(this.subreddit,this.limit,'new',function(data,raw){
		t.redditData = data;
		t.rawRedditData = raw;
        if(cb){
            cb(data);
        } else {
            return data;
        }
    });
};

reddit.prototype.getTopImages = function(cb){
	var t = this;
    getImages(this.subreddit,this.limit,'top',function(data,raw){
		t.redditData = data;
		t.rawRedditData = raw;
        if(cb){
            cb(data);
        } else {
            return data;
        }
    });
};

reddit.prototype.getRandomImages = function(cb){
	var t = this;
    getImages(this.subreddit,this.limit,'random',function(data,raw){
		t.redditData = data;
		t.rawRedditData = raw;
        if(cb){
            cb(data);
        } else {
            return data;
        }
    });
};

reddit.prototype.getControversialImages = function(cb){
	var t = this;
    getImages(this.subreddit,this.limit,'controversial',function(data,raw){
		t.redditData = data;
		t.rawRedditData = raw;
        if(cb){
            cb(data);
        } else {
            return data;
        }
    });
};
function checkFile(image,dest,cb){
	
	fs.access(dest, fs.F_OK,function(err){
		if(err){
			if(cb)cb(image,dest);
		} else {
			logger.debug("%s already exists.  Not downloading.",dest);
			if(cb)cb(false);
		}
	});
	
}
var download = function(image,dest,cb){
	
	request.get(image,dest,function(err,res){
		if(err){
			logger.error("ERROR with Reddit request.get");
			logger.error(err);
			logger.error(image);

		} else {

			logger.debug("Downloaded file %s",res.file);
			if(cb)cb(image,dest);
		}
	});

};

var getImages = function(cb){
    var redditData = {images:[]};
    var rawRedditData = {};
	var sub;
	var t = this;
	
    if(Array.isArray(this.subreddit)){
		sub = this.subreddit.join('+');
	} else {
		sub = this.subreddit;
	}

    var options = {
        hostname : "www.reddit.com",
        path : "/r/"+sub+"/"+this.listing+"/.json?limit="+this.limit
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
            logger.error(err.message);			
        });

        res.on('data',function(chunk){
            body += chunk;
        });

        if (error) {

            logger.error(error.message);
            //logger.info(res);
            res.resume();
            return;
        }
        res.on('end',function(){

            logger.debug("Received response from Reddit");

            try{
                body = JSON.parse(body);
            } catch (e){
               // logger.info(body);
                logger.error(e);
            }

			rawRedditData = body.data;
			
            if(body.data && body.data.children){
                logger.debug("Reddit success!");
                logger.debug("Getting the %s listings from subreddit %s",t.listing,sub);

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
								
                                redditData.images.push(
                                {
                                    id:image.id,
                                    imageType:imageType,
									file:image.id+imageType,
									sourceType:'reddit',
									source:'images/reddit/'+data.subreddit.toLowerCase()+'/'+image.id+imageType,
									subreddit:data.subreddit.toLowerCase(),
                                    name:data.title,
                                    url:url
                                });
                            }
                        } else {
                            logger.debug("Data Object in child doesn't contain preview image urls.");
                        }
                    }
                }
				
                if(cb){
                    cb(redditData,rawRedditData);
                } else {
                    return redditData,rawRedditData;
                }
            } else {

                logger.error('No Data returned.');
                if(cb){
                    cb(false);
                } else {
                    return false;
                }
            }
        });
    }).on('error',function(e){
        logger.error('ERROR: %s',e.message);
        if(cb){
            cb(false);
        } else {
            return false;
        }
    }).end();
};


module.exports = reddit;