var config = require('config');

var logModel = {
    format : "[{{timestamp}}] [{{title}}] {{message}} (in {{file}}:{{line}})",
    dateformat : "dd/mm/yyyy HH:MM:ss.L",
    level: config.get("settings.server.logLevel")
};

module.exports = logModel;