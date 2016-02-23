var express = require('express');
var library = require('./lib/library');
exports = module.exports = require('./lib/cluster');

['route','pool','task','dataset','redis','mongodb','session'].forEach(function(k){
    exports[k] = require('./lib/'+k);
});


//将HTTP服务器加入到群集中
exports.http = function(port,key,num,fun){
    var app = require('express')();
    //fork http server
    exports.fork( key|| 'http', num || require('os').cpus().length , function(){
        app.listen(port||80);
        if(typeof fun == 'function'){
            fun();
        }
    });
    return app;
}

exports.static = express.static;