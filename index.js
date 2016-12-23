var cpus = require('os').cpus().length;
exports = module.exports = require('./lib/cluster');
exports.library = require('cosjs.library');
//启动HTTP服务器,num
exports.http = function(port,shell,fnum){
    if(!arguments.length){
        return require('cosjs.http');
    }
    if(typeof arguments[0] === 'object'){
        var opts = arguments[0];
    }
    else{
        var opts = {"port":arguments[0]||80,"shell":arguments[1]||null,"fnum":arguments[2]||0};
    }

    var name = opts['name'] || 'http', fnum = opts['fnum'] || cpus;

    for(var i=0;i<fnum;i++){
        exports.fork(name,forkHttp,opts);
    }
}


exports.socket = function(opts){
    if(!arguments.length){
        return require('cosjs.socket');
    }
    if(opts.gateway){
        var name = opts.gateway.name || 'gateway';
        exports.fork(name,forkGateway,opts.gateway);
    }
    opts.socket.forEach(function(setting){
        var name = opts.gateway.name || 'socket';
        exports.fork(name,forkSocket,setting);
    })
}


function forkHttp(opts){
    var app = require('cosjs.http')();
    if(opts['shell']){
        shell.call(app,opts['shell'],opts);
    }
    app.listen(opts['port']);
}

function forkSocket(opts){
    var app = require('cosjs.socket').socket(opts);
    if(opts.shell){
        shell.call(app,opts.shell,opts);
    }
}

function forkGateway(opts){
    var gateway = require('cosjs.socket').gateway(opts);
    if(opts.shell){
        shell.call(gateway,opts.shell,opts);
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