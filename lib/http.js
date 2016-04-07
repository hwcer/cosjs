var domain = require('domain');
var express = require('express');

exports = module.exports = function(port,handle){
    var app = require('express')();
    app.set('x-powered-by',false);

    app.static = function(root,options ){
        app.use(express.static(root,options ));
    }

    app.server = function(method,key,root){
        http_server_route.apply(app,arguments);
    }

    app.loader = http_module_loader;

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
    var app = this;
    var arr = Array.from(arguments);
    if(arr.length == 2){
        arr.unshift('all');
    }
    app[arr[0]](arr[1] + '*', function (req, res, next) {
        app.loader(req, res, arr[2], req.params[0]);
    });
}




//模块加载器
var http_module_loader = function(req,res,root,name){
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
    var d = domain.create();
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

