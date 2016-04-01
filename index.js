
var library = require('./lib/library');
exports = module.exports = require('./lib/cluster');

//HTTP SERVER
exports.http = function(key,work,port,handle){
    var http = require('./lib/http');
    if(!work){
        work = require('os').cpus().length;
    }
    exports.fork( key||'http', work , function(){
        http(port,handle)
    });
}


//SOCKET SERVER
exports.socket = function(key,work,port,handle){
    var socket = require('./lib/socket');
    exports.fork( key||'socket', 1 , function(){
        socket(port,handle)}
    );
}


new Array("pool","task","route","buffer","session").forEach(function (name) {
    exports[name] = require('./lib/'+name);
});