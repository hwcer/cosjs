var express = require('express');
var cluster = require('./cluster');
//将HTTP服务器加入到群集中
exports = module.exports = function(port,key,num,handle){
    var app = require('express')();
    app.set('x-powered-by',false);
    app.static = function(root,options ){
        app.use(express.static(root,options ));
    }
    app.server = function(method,key,root){
        http_server_route.apply(app,arguments);
    }

    if(arguments.length<1){
        return app;
    }
    var cpus = require('os').cpus().length;
    cluster.fork( key||'http', num || cpus , function(){
        if( typeof handle == 'function'){
            handle(app,function(){  app.listen(port);  });
        }
        else{
            app.listen(port);
        }
    });

    return app;
}



exports.handle = function(req,res,root,name){
    if(name.substr(-1,1)=='/'){
        name = name.substr(0,name.length - 1);
    }
    var arr = name.split('/');
    if(arr.length>1){
        var fun = arr.pop();
        var file = [root].concat(arr).join('/');
    }
    else{
        var fun = null;
        var file = [root  , name].join('/');
    }

    exports.loader(req,res,file,fun);
}

exports.loader = function(req,res,file,fun){
    try{
        var mod = require(file);
    }
    catch(e){
        return res.status(404).end('module not exist');
    }

    if( !fun ){
        var method = mod;
    }
    else{
        var method = mod[fun] || false;
    }
    if( typeof method != 'function'  ){
        return res.status(404).end('module function not exist');
    }
    var d = require('domain').create();
    d.on('error', function (err) {
        var msg = err.stack || err;
        console.log(msg);
        res.status(500).end(msg);
        cluster.restart();
    });
    d.add(req);
    d.add(res);
    d.run(function () {
        method(req,res);
    });
}

exports.session = require('./session');


var http_server_route = function(){
    var arr = Array.from(arguments);
    if(arr.length == 2){
        arr.unshift('all');
    }
    this[arr[0]](arr[1] + '*', function (req, res, next) {
        exports.handle(req, res, arr[2], req.params[0]);
    });
}