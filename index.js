//全局函数
var http = require('./lib/http');
var fork = require('./lib/fork');

//全局配置
var config = require('./config');
var library = require('./lib/library');
var dataset = new library.dataset(config);

exports.set = dataset.set;
exports.http = http.create;
exports.fork = fork.add;
exports.start = fork.start;
exports.config = config;
exports.library = library;

