var mongoose = require('mongoose');
var Schema     = mongoose.Schema;
var ConfigSchema   = new Schema({
	features:{
		weather:Boolean,
		reddit:Boolean,
        speech:Boolean,
        webAdmin:Boolean
	},
	settings:{
		kiosk:{
			seconds: Number,
			slides:[
			{
				name:String,
				sourceType: String,
				source:String
			}]
		},
		features:{
			weather:{
				key: String,
				city: String,
				state: String,
				zipcode: String,
				refresh: Number
			},
			reddit:{
				subreddit: String,
				limit: Number,
				listing:String,
				refresh: Number
			},
			speech:{
				voice: String,
				speed: Number
			},
			webAdmin:{
				db: {
					host: String,
					port:  Number,
					db: String
				}
			}
		}
	},
	created: String
});

module.exports = mongoose.model('Config', ConfigSchema);