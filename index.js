//全局配置
var config = require('./config');
var library  = require('./lib/library');
var dataset = new library.dataset(config);

exports.set      = dataset.set;
exports.http     = require('./lib/http').create;
exports.config   = config;
exports.cluster = require('./lib/cluster');
exports.library = library;
