require('./lib/library');
exports = module.exports = require('./lib/cluster');

exports.pool = require('./lib/pool');
exports.task = require('./lib/task');
//将HTTP服务器加入到群集中
exports.http = function(port,key,num,handle){
    var http = require('./lib/http');
    var server = http();
    server.set('x-powered-by',false);
    exports.http.handle = http.handle;
    exports.http.loader = http.loader;
    exports.http.session = require('./lib/session');
    if(arguments.length<1){
        return server;
    }
    var cpus = require('os').cpus().length;
    exports.fork( key||'http', num || cpus , function(){
        if( typeof handle == 'function'){
            handle(server,function(){  server.listen(port);  });
        }
        else{
            server.listen(port);
        }
    });

    return server;
}