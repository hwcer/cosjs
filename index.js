exports = module.exports = require('cosjs.cluster');
exports.root = '';
//启动HTTP服务器,num
exports.http = function(opts,nums){
    if(!arguments.length) {
        return require('cosjs.http')();
    }
    var key = opts.key || 'http';
    var cpus = require('os').cpus().length;
    nums = nums || cpus;
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
    if(opts.shell){
        shell.call(app,opts.shell,opts);
    }
    //server
    if(opts.server){
        var arr = Array.isArray(opts.server) ? opts.server : [opts.server];
        arr.forEach(function(cfg){
            var root = [exports.root,cfg.handle].join('/');
            var route = cfg.route;
            app.server(route,root,cfg);
        });
    }
    //static
    if(opts.static){
        var arr = Array.isArray(opts.static) ? opts.static : [opts.static];
        arr.forEach(function(cfg){
            var root = [exports.root,cfg.handle].join('/');
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
        var model = cfg['model'] || key;
        shell.call(app,opts.shell,model,cfg);
    }
}

function shell(handle){
    var arr = Array.prototype.slice.call(arguments,1);
    var method = null;
    if(typeof handle == 'function' ){
        method = handle;
    }
    else{
        var file = [exports.root,handle].join('/');
        method = require(file);
    }
    if(typeof method == 'function' ){
        method.apply(this,arr);
    }
}