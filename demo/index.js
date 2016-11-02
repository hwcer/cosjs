var cosjs = require('../index');
var config = require('./config');
//===================HTTP cluster========================//
cosjs.http(config.http.port,config.http.shell);
//===================socket cluster========================//
cosjs.socket(config.socket);
//===================socket cluster========================//
cosjs.start();