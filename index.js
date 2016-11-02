var cpus = require('os').cpus().length;
exports = module.exports = require('./lib/cluster');
exports.library = require('cosjs.library');
//启动HTTP服务器,num
exports.http = function(port,spath){
    if(!arguments.length) {
        return require('cosjs.http')();
    }
    var key = 'http', nums = arguments[2] || cpus;

    for(var i=0;i<nums;i++){
        exports.fork(key,forkHttp,port,spath);
    }
}


exports.socket = function(opts){
    if(!arguments.length){
        return require('cosjs.socket');
    }
    if(opts.gateway){
        var name = opts.gateway.name || 'gateway';
        exports.fork(name,forkSocket,'gateway',opts.gateway,opts);
    }
    opts.connector.forEach(function(ccfg){
        var name = opts.gateway.name || 'connector';
        exports.fork(name,forkSocket,'connector',ccfg,opts);
    })
    var worker = opts.worker || [];
    worker.forEach(function(ccfg){
        var name = ccfg.name || 'worker';
        exports.fork(name,forkSocket,'worker',ccfg,opts);
    })
}


function forkHttp(port,spath){
    var app = require('cosjs.http')();
    if(spath){
        shell.call(app,spath);
    }
    app.listen(port);
}

function forkSocket(key,cfg,opts){
    var socket = require('cosjs.socket')(opts);
    var app = socket[key](cfg);
    if(opts.shell){
        shell.call(app,opts.shell,key,cfg);
    }
}

function shell(handle){
    var method = null;
    if(typeof handle == 'function' ){
        method = handle;
    }
    else{
        method = require(handle);
    }
    var args = Array.prototype.slice.call(arguments,1);
    if(typeof method == 'function' ){
        method.apply(this,args);
    }
}