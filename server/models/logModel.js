var config = require('config');

var logModel = {
    format : "[{{timestamp}}] [{{title}}] {{message}} (in {{file}}:{{line}})",
    dateformat : "dd/mm/yyyy HH:MM:ss.L",
    level: config.get("settings.server.logLevel"),
    inspectOpt: {
        showHidden: false,
        depth: null
    },
    preprocess: function(data){
        data.title = data.title.toUpperCase();
    }
};

module.exports = logModel;