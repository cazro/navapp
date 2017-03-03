var https = require('https');
var fs = require('fs');
var request = require('http-request');

function reddit(conf){
	var t = this;
	this.t = this;
	this.redditData = {};
	this.rawRedditData = {};
	this.subreddit = conf.subreddit.toLowerCase();
	this.listing = conf.listing.toLowerCase();
	this.limit = conf.limit;
	this.refresh = conf.refresh;
	this.getImages = getImages;
	
	if (!fs.existsSync('public/images/reddit')){
		fs.mkdirSync('public/images/reddit');
	}
	
	if(Array.isArray(this.subreddit)){
		for(var s in this.subreddit){
			if (!fs.existsSync('public/images/reddit/'+this.subreddit[s])){
				fs.mkdirSync('public/images/reddit/'+this.subreddit[s]);
			}
		}
	} else {
		if (!fs.existsSync('public/images/reddit/'+this.subreddit)){
			fs.mkdirSync('public/images/reddit/'+this.subreddit);
		}
	}
	
	this.refreshData = function(cb){
		var t = this;
		this.getImages(function(data,raw){
			t.redditData = data;
			t.rawRedditData = raw;
			
			if(data.images){
				for(var i in data.images){
					var image = data.images[i];

					image.headers = {
						accept: '*/*'
					};

					image.maxRedirects = 30;

					var dest = 'public/images/reddit/'+image.subreddit+'/'+image.file;
					checkFile(image,dest,function(image,dest){
						if(image){
							download(image,dest,function(img,dst){
								
							});
						}
					});
					
				}
				
				cleanDir(data.images);
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
	for(var i in images){
		old = true;
		image = images[i];
		sub = image.subreddit;
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
						console.log("Removing ye old file "+file);
						fs.unlink(dir+'/'+file);
					}
					cnt2++;
				}
				cnt++;
			}
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

reddit.prototype.getRandomImage = function(cb){
	if(this.redditData.images){
		var image = this.redditData.images[Math.floor(Math.random()*this.redditData.images.length)];
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
			console.log(dest+" already exists.  Not downloading.");
			if(cb)cb(false);
		}
	});
	
}
var download = function(image,dest,cb){
	
	request.get(image,dest,function(err,res){
		if(err){
			console.error("ERROR with Reddit request.get");
			console.error(err);
			console.error(image);

		} else {

			console.log("Downloaded file "+res.file);
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
            console.error(err.message);			
        });

        res.on('data',function(chunk){
            body += chunk;
        });

        if (error) {

            console.log(error.message);
            //console.dir(res);
            res.resume();
            return;
        }
        res.on('end',function(){

            console.log("Received response from Reddit");

            try{
                body = JSON.parse(body);
            } catch (e){
               // console.dir(body);
                console.error(e);
            }

			rawRedditData = body.data;
			
            if(body.data && body.data.children){
                console.log("Reddit success!");
                console.log("Getting the "+t.listing+" listings from subreddit "+sub);

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
                            console.log('Data Object in child doesn\'t contain preview image urls.');
                        }
                    }
                }
				
                if(cb){
                    cb(redditData,rawRedditData);
                } else {
                    return redditData,rawRedditData;
                }
            } else {

                console.error('No Data returned.');
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
    }).end();
};


module.exports = reddit;