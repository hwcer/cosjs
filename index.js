exports = module.exports = require('./lib/cluster');



//启动HTTP服务器,num
exports.http = function(opts){
    if(!arguments.length) {
        return require('cosjs.http')();
    }
    var key = opts.key || 'http';
    var nums = opts.worker || require('os').cpus().length;
    for(var i=0;i<nums;i++){
        exports.fork(key,forkHttp,opts);
    }
}


exports.socket = function(opts){
    if(!arguments.length){
        return require('cosjs.socket');
    }
    if(opts.gateway){
        exports.fork('gateway',forkSocket,'gateway',opts.gateway,opts);
    }
    opts.connector.forEach(function(ccfg){
        exports.fork('connector',forkSocket,'connector',ccfg,opts);
    })
    var worker = opts.worker || [];
    worker.forEach(function(ccfg){
        exports.fork('worker',forkSocket,'worker',ccfg,opts);
    })
}


exports.library = require('cosjs.library');



function forkHttp(opts){
    var app = require('cosjs.http')();
    if(opts.shell){
        shell.call(app,opts.shell);
    }
    //server
    if(opts.server){
        var arr = Array.isArray(opts.server) ? opts.server : [opts.server];
        arr.forEach(function(cfg){
            var root = [opts.root,cfg.handle].join('/');
            var route = cfg.route;
            app.server(route,root,cfg);
        });
    }
    //static
    if(opts.static){
        var arr = Array.isArray(opts.static) ? opts.static : [opts.static];
        arr.forEach(function(cfg){
            var root = [opts.root,cfg.handle].join('/');
            var route = cfg.route;
            app.static(route,root,cfg);
        });
    }
    app.listen(opts.port);
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