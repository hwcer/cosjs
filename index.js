//全局配置
var cosjs  = require('./lib/cosjs');
var config = require('./config');
var dataset = new cosjs.dataset(config);

exports.set     = dataset.set;
exports.lib     = cosjs;
exports.http    = require('./lib/http').create;
exports.config   = config;
exports.cluster = require('./lib/cluster');

