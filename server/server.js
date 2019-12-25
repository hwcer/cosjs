"use strict";
const express          = require('express');
const cosjs_loader     = require('cosjs.loader');
const cosjs_handle     = require('./handle');
const cosjs_library    = require('cosjs.library');
const cosjs_message    = require('./message');
const cosjs_session    = require('cosjs.session');

const package_types = ["json","jsonp","view"];

module.exports = function cosjs_server(){
    let app = express();
    app.set('x-powered-by',false);
    app.server = function(root,option,...args){
        option = Object.freeze(option||{});
        let route    = option['route']||'*';
        let method   = option['method'] || 'all';
        let server_ins_bind   = route_server(app,root,option);
        let route_call_bind   = [method,route].concat(args);
        return server_ins_bind.route.apply(server_ins_bind,route_call_bind);
    };
    app.defineHandlePrototype = defineHandlePrototype;
    return app;
};

function defineHandlePrototype(name,func){
    if(typeof name == 'object'){
        for(let k in name){
            defineHandlePrototype(k,name[k]);
        }
    }
    else{
        cosjs_handle.prototype[name] = func;
    }
}

function gateway(req,res,next){
    let handle_agent,usrAgent = cosjs_handle(this,req,res);
    let HandlePrototype = this.defineHandlePrototype();
    if(HandlePrototype){
        Object.defineProperties(usrAgent,HandlePrototype);
    }

    if(typeof this.option['handle'] === 'function' ){
        handle_agent = this.option['handle'];
    }
    else {
        let path;
        if(this.namespace){
            path = ['/',this.namespace,usrAgent['path']].join('');
        }
        else{
            path = usrAgent['path'];
        }
        handle_agent = this.loader.parse(path);
    }
    if( typeof handle_agent !== 'function'  ){
        return next();
    }
    //Promise
    Promise.resolve().then(()=>{
        if( usrAgent.session && usrAgent.session['level'] >= 0 ){
            return usrAgent.session.start();
        }
    }).then(()=>{
        if(typeof this["_event_start"] === 'function'){
            return this["_event_start"].call(usrAgent);
        }
    }).then(()=>{
        return handle_agent.call(usrAgent);
    }).then(ret=>{
        return cosjs_message.call(usrAgent,null,ret)
    }).catch(err=>{
        return cosjs_message.call(usrAgent,err);
    }).then(data=>{
        let [err,ret] = data;
        //其他格式不需要message package包装
        if(package_types.indexOf(usrAgent.output) < 0){
            if( err && !usrAgent.status ){
                this.status = 500;
            }
            return Promise.resolve((err && err !== 'error') ? err : ret);
        }
        else{
            return Promise.resolve().then(()=>{
                let message_package = this['_event_finish'] || default_message;
                return message_package.call(usrAgent,err,ret);
            }).then((data)=>{
                return usrAgent.output === 'view' ? usrAgent.render(data) :data;
            });
        }
    }).then(ret=>{
        return handle_finish.call(usrAgent,ret);
    }).catch(e=>{
        usrAgent.res.status(500);
        usrAgent.res.type('text');
        usrAgent.res.send(String(e)).end();
    }).finally(()=>{
        if( usrAgent.session ){
            usrAgent.session.close();
        }
    })
}

function default_message(err,ret){
    return {"err":err,"ret":ret||''};
}


function handle_finish(data){
    if(this.status){
        this.res.status(this.status);
    }
    let output = this.output;
    switch(output){
        case 'download':
            this.res.download(data);
            break;
        case 'redirect':
            this.res.redirect(data);
            break;
        case 'jsonp':
            this.res.type(output);
            this.res.jsonp(data);
            break;
        default:
            this.res.type(output);
            this.res.send(data);
            break;
    }
    if(this.debug){
        console.log("debug",this.path,JSON.stringify(data))
    }
}



function route_server(app,root,option){
    if (!(this instanceof route_server)) {
        return new route_server(app,root,option);
    }
    this.option    = option;
    this.subpath   = option.subpath ||0;                 //截取req.path.substr(subpath)   req.path.substr(subpath[0],subpath[1])为handle路径
    this.namespace = '';                                 //PATH 名字空间

    if( cosjs_loader.is(root) ){
        this.loader = root;
    }
    else{
        this.loader    = cosjs_loader(root);
    }
    //SESSION
    var _server_session_config,_server_handle_prototype;
    Object.defineProperty(this, "session", {
        set:function(opts){
            if(_server_session_config){
                Object.assign(_server_session_config,opts);
            }
            else {
                _server_session_config = Object.assign({},cosjs_session.config,opts);
            }
        },
        get:function () {
            return _server_session_config;
        }
    });
    //为 handle 设置默认属性
    Object.defineProperty(this, "defineHandlePrototype", {
        value:function (name,func) {
            if(arguments.length < 2){
                return _server_handle_prototype;
            }
            if(!_server_handle_prototype){
                _server_handle_prototype = {};
            }
            _server_handle_prototype[name] = {"value":func,"configurable":false,"enumerable":true,"writable":false};
        },
    })

    this.on = function(name,func){
        let arr = ['start','finish'];
        if(arr.indexOf(name) < 0 ){
            return false;
        }
        let key = ['','event',name].join('_');
        Object.defineProperty(this,key,{ value: func, writable: false, enumerable: false, configurable: false, });
    }


    this.route = function(method,route,...args){
        let handle_call_bind  = gateway.bind(this);
        args.push(handle_call_bind);
        args.unshift(route);
        app[method].apply(app,args);
        return this;
    }
}