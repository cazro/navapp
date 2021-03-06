var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var morgan = require('morgan');
var logger = require('./server/utils/logger');
var config = require('config');

var routes = require('./server/routes/index');
var Kiosk = require('./server/Kiosk');
var DB = require('./server/utils/db');
var db = null;

if(config.get('features.webAdmin')){
	db = new DB.Mongo(config.get('settings.feature.webAdmin.db'));
} else {
	db = new DB.File(config);
}

var settings = db.getSettings();

var kiosk = new Kiosk(db,io);

server.listen(settings.server.port || 3000);

//io.on('connection',new NavApp(db).sockHandler);

app.use('/user_images',express.static('user_images'));
app.use(morgan('dev'));
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
  logger.error(err);
});

function exit(err){
    logger.error(err);
    process.exit();
}
