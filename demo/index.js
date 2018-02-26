
var cosjs = require('../');
var config = require('./develop');
cosjs.fork('worker',config.root+'/process/worker');
cosjs.server(config);
cosjs.start();