var express = require('express');
var router = express.Router();
var logger = require('tracer').console(require('../models/logModel'));

/* GET home page. */
router.get('/', function(req, res, next) {
    var options = {
        root: 'public'
    };
    var fileName = 'index.html';
    
    res.sendFile(fileName, options, function (err) {
        if (err) {
            logger.error(err);
            res.status(err.status).end();
        } else {
			logger.debug("Sent: %s", fileName);
        }
    });
});

module.exports = router;
