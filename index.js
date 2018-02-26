const cpus = require('os').cpus().length;

exports = module.exports = require('./lib/cluster');

exports.pool = require('./lib/pool');

exports.library = require('cosjs.library');
//启动HTTP服务器,num
exports.server = function(opts){
    let key = (opts['key'] && opts['cert']) ? "https" :"http";
    let server = require('cosjs.server');
    let name = opts['name'] || key, fnum = opts['fnum'] || cpus;
    Array.prototype.unshift.call(arguments,server[key]);
    Array.prototype.unshift.call(arguments,name);
    for(var i=0;i<fnum;i++){
        exports.fork.apply(null,arguments);
    }
}










