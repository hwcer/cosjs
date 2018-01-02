const cpus = require('os').cpus().length;
const cluster = require('./cluster');

exports.pool    = require('./pool');
exports.start    = cluster.start;
exports.cluster = cluster;


//启动HTTP服务器,num
exports.http = function(opts){
    var server = require('./server/index');
    var name = opts['name'] || 'http', fnum = opts['fnum'] || cpus;
    Array.prototype.unshift.call(arguments,server.http);
    Array.prototype.unshift.call(arguments,name);
    for(var i=0;i<fnum;i++){
        cluster.fork.apply(cluster,arguments);
    }
}

exports.https = function(opts){
    var server = require('./server/index');
    var name = opts['name'] || 'https', fnum = opts['fnum'] || cpus;
    Array.prototype.unshift.call(arguments,server.https);
    Array.prototype.unshift.call(arguments,name);
    for(var i=0;i<fnum;i++){
        cluster.fork.apply(cluster,arguments);
    }
}


exports.server = function(){
    return require('./server/index');
}


exports.library = require('./library');




