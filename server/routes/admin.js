var express = require('express');
var router = express.Router();
var db;

router.use(function(req,res,next){
    db = req.app.get('db');
    next();
});

/* GET */
router.get('/', function(req, res, next) {
	var options = {
        root: 'public/admin'
    };
    var fileName = 'index.html';
    
    res.sendFile(fileName, options, function (err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        } else {
			console.log('Sent:', fileName);
        }
    });
	
});

router.get('/:setting', function(req,res,next){
    db.getSettings(req.params.setting,function(doc){
        res.json(doc);
    });
});
module.exports = router;