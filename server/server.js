"use strict";

const domain           = require('domain');
const express          = require('express');
const cosjs_handle     = require('./handle');
const cosjs_cluster    = require('../core/cluster');
const cosjs_library   = require('../library');

module.exports = function cosjs_server(){
    var app = express();
    app.set('x-powered-by',false);
    app.server = function(root,option){
        option = Object.freeze(option||{});
        var route    = option['route']||'*';
        var method   = option['method'] || 'all';
        var server_ins_bind   = route_server(root,option);
        var route_call_bind   = Array.from(arguments).slice(2);
        var handle_call_bind  = gateway.bind(server_ins_bind);
        route_call_bind.push(handle_call_bind);
        route_call_bind.unshift(route);
        app[method].apply(app,route_call_bind);
        return server_ins_bind;
    };

    app.defineHandlePrototype = defineHandlePrototype;

    return app;
};

function defineHandlePrototype(name,func){
    if(typeof name == 'object'){
        for(var k in name){
            defineHandlePrototype(k,name[k]);
        }
    }
    else{
        cosjs_handle.prototype[name] = func;
    }
}

function gateway(req,res,next){
    let handle,usrAgent = cosjs_handle(this,req,res);
    if(typeof this.option['handle'] === 'function' ){
        handle = this.option['handle'];
    }
    else {
        handle = this.loader.parse(usrAgent['path']);
    }
    if( typeof handle !== 'function'  ){
        return next();
    }

    let handle_domain = domain.create();
    handle_domain.on('error', function(err) {
        console.log(err.message, err.stack);
        usrAgent.error(err);
        cosjs_cluster.restart();
    });
    handle_domain.add(req);
    handle_domain.add(res);
    handle_domain.add(usrAgent);
    let agent_handle_func = function(){
        handle_domain.run(() => { handle.call(usrAgent);  });
    }
    session_start.call(usrAgent,agent_handle_func);
}

function session_start(func){
    if( this.session && typeof this.session.start === 'function'){
        this.session.start(events_start.bind(this,func) );
    }
    else{
        events_start.call(this,func);
    }
}

function events_start(func,err,ret){
    if(err){
        return this.error(err,ret);
    }
    if(typeof this.server._event_start === 'function'){
        this.server._event_start.call(this,handle_start.bind(this,func));
    }
    else{
        handle_start.call(this,func);
    }
};

function handle_start(func,err,ret){
    if(err){
        return this.error(err,ret);
    }
    func();
}



function route_server(root,option){
    if (!(this instanceof route_server)) {
        return new route_server(root,option);
    }
    this.option    = option;
    this.loader    = cosjs_library.require('loader')(root);
    this.subpath   = option.subpath ||0;                 //截取req.path.substr(subpath)   req.path.substr(subpath[0],subpath[1])为handle路径
}

route_server.prototype.on = function route_server_on(name,func){
    var arr = ['start','finish'];
    if(arr.indexOf(name) < 0 ){
        return false;
    }
    var key = ['','event',name].join('_');
    Object.defineProperty(this,key,{ value: func, writable: false, enumerable: false, configurable: false, });
}

route_server.prototype.session = function route_server_session(opts){
    let session = require('./session');
    let mergeOpts = Object.assign({},session["config"],opts||{});
    this.crypto = require('./crypto')(mergeOpts.secret);
    Object.defineProperty(this,'_session_options',{ value: mergeOpts, writable: false, enumerable: false, configurable: false, });
}