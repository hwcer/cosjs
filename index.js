const cpus = require('os').cpus().length;

exports = module.exports = require('./lib/cluster');

exports.pool = require('./lib/pool');

exports.library = require('cosjs.library');
//启动HTTP服务器,num
exports.http = function(opts){
    let server = require('cosjs.server');
    let name = opts['name'] || "http", fnum = opts['fnum'] || cpus;
    Array.prototype.unshift.call(arguments,server.http);
    Array.prototype.unshift.call(arguments,name);
    for(var i=0;i<fnum;i++){
        exports.fork.apply(null,arguments);
    }
}
exports.https = function(opts){
    let server = require('cosjs.server');
    let name = opts['name'] || "https", fnum = opts['fnum'] || cpus;
    Array.prototype.unshift.call(arguments,server.https);
    Array.prototype.unshift.call(arguments,name);
    for(var i=0;i<fnum;i++){
        exports.fork.apply(null,arguments);
    }
}



if (!Object.values) Object.values = function(obj) {
    if (obj !== Object(obj))
        throw new TypeError('Object.values called on a non-object');
    var val=[],key;
    for (key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj,key)) {
            val.push(obj[key]);
        }
    }
    return val;
}





