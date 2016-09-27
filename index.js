exports = module.exports = require('cosjs.cluster');
//启动HTTP服务器,num
exports.http = function(opts,nums){
    if(!arguments.length) {
        return require('cosjs.http')();
    }
    var key = opts.key || 'http';
    nums = nums || require('os').cpus().length;
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


function forkHttp(opts){
    var app = require('cosjs.http')();
    //server
    if(opts.server){
        var arr = Array.isArray(opts.server) ? opts.server : [opts.server];
        arr.forEach(function(cfg){
            var root = [opts.root,cfg.handle].join('/');
            var route = cfg.route;
            app.server(route,root,cfg);
            if(opts.shell && cfg.name){
                var path = [opts.shell,cfg.name].join('/');
                shell.call(app,path,cfg);
            }
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
    if(opts.shell && cfg.name ){
        var path = [opts.shell,cfg.name].join('/');
        shell.call(app,path,cfg);
    }
}

function shell(handle,opts){
    var method = null;
    if(typeof handle == 'function' ){
        method = handle;
    }
    else{
        var file = require.resolve(handle);
        if(!file){
            return;
        }
        method = require(file);
    }
    if(typeof method == 'function' ){
        method.call(this,opts);
    }
}