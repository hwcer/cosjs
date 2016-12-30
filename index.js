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
        var setting = opts.gateway;
        exports.fork(name,forkGateway,name,setting,opts);
    }
    opts.socket.forEach(function(setting){
        var name = setting.name || 'socket';
        exports.fork(name,forkSocket,name,setting,opts);
    })
}


function forkHttp(opts){
    var app = require('cosjs.http')();
    if(opts['shell']){
        forkShell.call(app,opts['shell'],opts);
    }
    app.listen(opts['port']);
}

function forkSocket(name,setting,opts){
    var app = require('cosjs.socket').socket(opts.root,setting,opts.emitter);
    if(opts.shell){
        forkShell.call(app,opts.shell,name,setting);
    }
    if(opts.trigger){
        app.trigger();
    }
}

function forkGateway(name,setting,opts){
    var app = require('cosjs.socket').gateway(setting,opts.emitter);
    if(opts.shell){
        forkShell.call(app,opts.shell,name,setting);
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