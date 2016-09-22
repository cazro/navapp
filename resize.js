/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var gm = require('gm');

process.on('message',function(data){
	
	gm(data.path).size(function(err,size){
		if(err){
			console.error(err);
			process.send(false);
		}
	}).resize(data.width,'>').resize(data.width,'<').write(data.path,function(err){
		if(!err) {
			console.log("Resized width to "+data.width+"px on "+data.path);
			process.send(true);
		} else {
			console.log("Resize Error");
			console.error(err);
			process.send(false);
		}
	});
	
});

process.send('READY');