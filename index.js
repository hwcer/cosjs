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
    var shell = opts.shell;
    if(opts.gateway){
        var name = opts.gateway.name || 'gateway';
        var setting = opts.gateway;
        exports.fork(name,forkGateway,shell,name,setting,opts.emitter);
    }
    opts.socket.forEach(function(setting){
        var root = opts.root;
        var name = setting.name || 'socket';
        exports.fork(name,forkSocket,shell,name,root,setting,opts.emitter);
    })
}


function forkHttp(opts){
    var app = require('cosjs.http')();
    if(opts['shell']){
        forkShell.call(app,opts['shell'],opts);
    }
    app.listen(opts['port']);
}

function forkSocket(shell,name,root,setting,emitter){
    var app = require('cosjs.socket').socket(root,setting,emitter);
    if(shell){
        forkShell.call(app,shell,name,setting);
    }
}

function forkGateway(shell,name,setting,emitter){
    var app = require('cosjs.socket').gateway(setting,emitter);
    if(shell){
        forkShell.call(app,shell,name,setting);
    }
}

function forkShell(handle){
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