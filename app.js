var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var logger = require('morgan');
var say = require('say');
var WorkQueue = require('mule').WorkQueue;
var config = require('config');
require( "console-stamp" )( console, { pattern : "dd/mm/yyyy HH:MM:ss.l" } );

var routes = require('./server/routes/index');
var NavApp = require('./server/index');
var DB = require('./server/utils/db');
var db = null;

if(config.get('features.webAdmin')){
	db = new DB.Mongo(config.get('settings.feature.webAdmin.db'));
} else {
	db = new DB.File(config);
}

var features = db.getFeatures();
var settings = db.getSettings();

var navapp = new NavApp(db);

server.listen(settings.server.port || 3000);

io.on('connection',navapp.sockHandler);

app.use('/user_images',express.static(path.join(__dirname,'user_images')));
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
// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  console.log(err);
});

if(features.speech){
	console.log("Text-to-Speech is enabled");
	
	var speechSettings = settings.speech;
}

function speak(text){
	say.speak(text,speechSettings.voice,speechSettings.speed);
}

function exit(err){
    console.log(err);
    process.exit();
}
