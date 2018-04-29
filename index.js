"use strict";
const cpus    = require('os').cpus().length;
const cluster = require('./core/cluster');

exports.fork = cluster.fork;
exports.start = cluster.start;

exports.pool       = require('./core/pool');
exports.cluster   = cluster;
exports.library   = require('./library');
//启动HTTP服务器,num
exports.http = function(opts){
    let server = require('./server');
    let protocol = (opts['key'] && opts['cert'])?"https":"http";
    let clustername = opts['name'] || protocol, fnum = opts['fnum'] || cpus;
    Array.prototype.unshift.call(arguments,server[protocol]);
    Array.prototype.unshift.call(arguments,clustername);
    for(let i=0;i<fnum;i++){
        cluster.fork.apply(null,arguments);
    }
}