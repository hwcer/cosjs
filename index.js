//全局函数
require('./lib/cosjs');
var http = require('./lib/http');
var fork = require('./lib/fork');
//全局配置
var config = require('./config');
var dataset = new $.dataset(config);

exports.set = dataset.set;
exports.http = http.create;
exports.fork = fork.add;
exports.start = fork.start;
exports.config = config;