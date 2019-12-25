"use strict";
const cpus    = require('os').cpus().length;
const cluster = require('./lib/cluster');
const library  = require('cosjs.library');

exports.fork    = cluster.fork;
exports.start   = cluster.start;

exports.pool       = require('./lib/pool');
exports.cluster    = cluster;
//启动HTTP服务器,num
exports.http = function(opts){
    let server = require('./server');
    let protocol = opts['https']?"https":"http";
    let clustername = opts['name'] || protocol, fnum = opts['fnum'] || cpus;
    Array.prototype.unshift.call(arguments,server[protocol]);
    Array.prototype.unshift.call(arguments,clustername);
    for(let i=0;i<fnum;i++){
        cluster.fork.apply(null,arguments);
    }
}
