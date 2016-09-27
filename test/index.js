var root = __dirname;
var cosjs = require('cosjs');
cosjs.root = __dirname + '/process/';
cosjs.fork('http','http',80,root);
cosjs.start();