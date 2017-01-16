var https = require('https');
var fs = require('fs');
var request = require('http-request');

function reddit(conf){
	var t = this;
	t.redditData = {};
	t.rawRedditData = {};
	t.subreddit = conf.subreddit;
	t.listing = conf.listing;
	t.limit = conf.limit;
	t.refresh = conf.refresh;
	
	t.refreshData();
	
	t.interval = t.startRefresh();
};

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

reddit.prototype.getRandomImage = function(cb){
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

reddit.prototype.download = function(cb){
	var t = this;
	if(t.redditData.images){
		for(var i in t.redditData.images){
			var image = t.redditData.images[i];
			var dest = 'public/images/'+image.subreddit+'/'+image.file;
			fs.access(dest, fs.F_OK,function(err){
		
				if(err){
					request.get(image,dest,function(err,res){
						if(err){
							console.error(err);
							
						} else {

							console.log("Downloaded file "+res.file);
						}
					});
				} else {
					console.log(dest+" already exists.  Not downloading.");
									
				}
			});
		}
	}
};

reddit.prototype.startRefresh = function(cb){
	var t = this;
	if(cb){
		cb(setInterval(t.refreshData,t.refresh));
	} else {
		return setInterval(t.refreshData,t.refresh);
	}
};

reddit.prototype.refreshData = function(cb){
	var t = this;
	getImages(t.subreddit,t.limit,t.listing,function(data,raw){
		t.redditData = data;
		t.rawRedditData = raw;
		t.download();
		if(cb && data)cb(true);
		if(cb && !data)cb(false);
	});
};

var getImages = function(subreddit,limit,listing,cb){
    var redditData = {images:[]};
    var rawRedditData = {};
	
    if(Array.isArray(subreddit)){
		subreddit = subreddit.join('+');
	}
	
    var options = {
        hostname : "www.reddit.com",
        port : 80,
        method: 'GET',
        path : "/r/"+subreddit+"/"+listing+"/.json?limit="+limit,
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
            res.resume();
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

			rawRedditData = body.data;
			
            if(body.data && body.data.children){
                console.log("Reddit success!");
                console.log("Getting the "+listing+" listings from subreddit "+subreddit);

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
									sourceType:'image',
									source:'images/reddit/'+data.subreddit+'/'+file,
									subreddit:data.subreddit,
                                    name:data.title,
                                    url:url
                                });
                            }
                        } else {
                            console.error('Data Object in child doesn\'t contain preview image urls.');
                            console.dir(data.url);

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