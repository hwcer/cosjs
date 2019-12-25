"use strict";
const cosjs_library         = require('cosjs.library');
const cosjs_promise         = cosjs_library.require('promise');
const cosjs_session         = require('cosjs.session');
const cosjs_types           = {"get":["query"],"post":["body"],"cookie":["cookies"],"all":['params','query','body','cookies']};


function handle(server,req,res){
    if (!(this instanceof handle)) {
        return new handle(server,req,res);
    }
    this.status = 0;
    Object.defineProperty(this,'req',     { value: req,  writable: false, enumerable: false, configurable: false, });
    Object.defineProperty(this,'res',     { value: res,  writable: false, enumerable: false, configurable: false, });
    Object.defineProperty(this,'get',     { value: handle_getdata.bind(this,server), writable: false, enumerable: true, configurable: false, });
    Object.defineProperty(this,'path',    { value: handle_subpath.call(this,server), writable: false, enumerable: true, configurable: false, });
    Object.defineProperty(this,'output',  { value: server['option']['output'] || 'html', writable: true, enumerable: true, configurable: false, });
    let _handle_session;
    Object.defineProperty(this, "session", {
        get:function () {
            if( !_handle_session && server.session ){
                _handle_session = cosjs_session(this,server.session);
            }
            return _handle_session;
        }
    });
}

module.exports = handle;

//中断操作
handle.prototype.error = function(){
    if( arguments[0] instanceof cosjs_promise.error || arguments[0] instanceof Error ){
        return Promise.reject( arguments[0] );
    }
    let err,ret
    if(arguments.length <= 1 && typeof arguments[0] !=='object'){
        err='error';ret=arguments[0];
    }
    else {
        let arr = Array.from(arguments);
        err=arr.shift();ret = arr.join(',');
    }

    return Promise.reject(cosjs_promise.error(err,ret));
}
//中断操作,等同于this.error(null,ret)
handle.prototype.success = function(ret){
    return Promise.reject(cosjs_promise.error(null,ret));
}

handle.prototype.binary= function (name, data) {
    let arr = name.split('.');
    this.output = arr[1] || 'txt'
    this.res.set("Content-Length", data.length);

    let userAgent = (this.req.headers['user-agent']||'').toLowerCase();
    if(userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
        this.res.set('Content-Disposition', 'attachment; filename=' + [encodeURIComponent(arr[0]),arr[1]].join('.') );
    } else if(userAgent.indexOf('firefox') >= 0) {
        this.res.set('Content-Disposition', `attachment; filename*="utf8 ${[encodeURIComponent(arr[0]),arr[1]].join('.')}"` );
    } else {
        //safari等其他非主流浏览器只能自求多福了
        this.res.set('Content-Disposition', 'attachment; filename=' + [new Buffer(arr[0]).toString('binary'),arr[1]].join('.') );
    }
    return Promise.resolve(data);
}

handle.prototype.download = function (path) {
    this.output = 'download';
    return Promise.resolve(path);
}
handle.prototype.redirect = function(url){
    this.output = 'redirect';
    return Promise.resolve(url);
}


handle.prototype.render = function(data,view){
    view = view || this.view || this.path;
    let slen = view.length;
    let sub0 = view[0] === '/' ? 1 :0;
    let sub1 = view[slen-1] ==='/' ? (slen - 1 - sub0) : (slen - sub0);
    let path = view.substr(sub0,sub1);
    this.output = 'html';
    return this.promise.call(this.res,"render",path,data);
}


/////////////////////////////////////promise框架///////////////////////////////////
handle.prototype.promise = function(){
    return cosjs_promise.apply(this,arguments);
}
//获取参数
function handle_getdata(server, key, type, method) {
    method = method || server.option.method;
    let arr = cosjs_types[method] ? cosjs_types[method] : [method];
    let v = null ;
    for(let k of arr){
        let d = this.req[k]||{};
        if(key in d){
            v = d[key];
            break;
        }
    }
    if (type) {
        v = cosjs_library('format/parse',v, type);
    }
    return v;
}

function handle_subpath(server){
    let path,subpath = server.subpath;
    if(typeof subpath === 'function'){
        path = subpath.call(this);
    }
    else if(Array.isArray(subpath)){
        path = this.req.path.substr(subpath[0],subpath[1]);
    }
    else if(subpath) {
        path = this.req.path.substr(subpath);
    }
    else{
        path = this.req.path;
    }
    if(path[0] !== '/'){
        path = '/' + path;
    }
    return path;
}