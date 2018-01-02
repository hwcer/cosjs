"use strict";
const domain           = require('domain');
const express          = require('express');
const cosjs_handle     = require('./handle');
const cosjs_cluster    = require('../cluster');
const cosjs_types      = {"get":["query"],"post":["body"],"all":['params','query','body']};

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
    var usrAgent = cosjs_handle(this,req,res,next);

    if(typeof this.option['handle'] === 'function' ){
        var handle = this.option['handle'];
    }
    else {
        var handle = this.loader.parse(usrAgent['path']);
    }
    if( typeof handle !== 'function'  ){
        return next();
    }

    Object.defineProperty(usrAgent,"_agent_handle_func",{ value: handle, writable: false, enumerable: false, configurable: false, });

    if(typeof this._event_start === 'function'){
        this._event_start.call(usrAgent,session_start.bind(this,usrAgent,next) );
    }
    else{
        session_start.call(this,usrAgent,next);
    }
};

function session_start(usrAgent,next,err,ret){
    if(err){
        return usrAgent.error(err,ret);
    }
    if( usrAgent.session && typeof usrAgent.session.start === 'function'){
        usrAgent.session.start(handle_start.bind(this,usrAgent,next) );
    }
    else{
        handle_start.call(this,usrAgent,next);
    }
};

function handle_start(usrAgent,next,err,ret){
    if(err){
        return usrAgent.error(err,ret);
    }

    var d = domain.create();
    var handle = usrAgent['_agent_handle_func'];

    d.on('error', next);
    d.add(usrAgent.req); d.add(usrAgent.res); d.add(this);d.add(usrAgent);
    d.run(() => {
        handle.call(usrAgent);
    });
}



function route_server(root,option){
    if (!(this instanceof route_server)) {
        return new route_server(root,option);
    }
    this.option    = option;
    this.loader    = require('../library/loader')(root);
    this.subpath   = option.subpath ||0;                 //截取req.path.substr(subpath)   req.path.substr(subpath[0],subpath[1])为handle路径
    //用户数据集合
    var m   = option['method'];
    this.dataset = cosjs_types[m] || cosjs_types['all'];
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
    var session = require('./session');
    var mergeOpts = Object.assign({},session.config,opts||{});
    if(mergeOpts['redis']){
        var redis = require('../library/redis/hash');
        mergeOpts['redis'] = new redis(mergeOpts.redis,mergeOpts.prefix);
    }
    if( !mergeOpts['guid'] && mergeOpts['secret'] ){
        mergeOpts['crypto'] = session.crypto(mergeOpts.secret,6);
    }
    Object.defineProperty(this,'_session_opts',{ value: mergeOpts, writable: false, enumerable: false, configurable: false, });
}