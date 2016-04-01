var route = require('./route');
var express = require('express');

exports = module.exports = function(port,handle){
    var app = require('express')();
    app.set('x-powered-by',false);
    app.use(http_socket_error);
    app.static = function(root,options ){
        app.use(express.static(root,options ));
    }
    app.server = function(method,key,root){
        http_server_route.apply(app,arguments);
    }

    if( typeof handle == 'function' ){
        handle.call(app,function(){
            app.listen(port);
        });
    }
    else{
        var options = handle || {};
        for(var k in options){
            app.set(k,options[k]);
        }
        app.listen(port);
    }
}



var http_server_route = function(){
    var arr = Array.from(arguments);
    if(arr.length == 2){
        arr.unshift('all');
    }
    this[arr[0]](arr[1] + '*', function (req, res, next) {
        route.loader(res, arr[2], req.params[0], req, res );
    });
}


var http_socket_error = function(req,res,next){
    res.error = function(code,message){
        res.status(code).end(message);
    }
    next();
}