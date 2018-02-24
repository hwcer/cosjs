
var cosjs = require('../');
var config = require('./develop');
cosjs.http(config);
cosjs.cluster.fork('worker',config.root+'/process/worker');
cosjs.start();