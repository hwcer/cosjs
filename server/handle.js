"use strict";
const cosjs_lib            = require('../library');
const cosjs_types           = {"get":["query"],"post":["body"],"cookie":["cookies"],"all":['params','query','body','cookies']};
const cosjs_format          = cosjs_lib.require('format').parse;
const cosjs_session         = require('./session');

function handle(server,req,res){
    if (!(this instanceof handle)) {
        return new handle(server,req,res);
    }
    Object.defineProperty(this,'req',     { value: req,  writable: false, enumerable: false, configurable: false, });
    Object.defineProperty(this,'res',     { value: res,  writable: false, enumerable: false, configurable: false, });
    Object.defineProperty(this,'server',  { value: server, writable: false, enumerable: false, configurable: false, });
    Object.defineProperty(this,'get',     { value: handle_getdata.bind(this,server), writable: false, enumerable: true, configurable: false, });
    Object.defineProperty(this,'path',    { value: handle_subpath.call(this), writable: false, enumerable: true, configurable: false, });
    Object.defineProperty(this,'output',  { value: server.option['output'] || 'html', writable: true, enumerable: true, configurable: false, });
    Object.defineProperty(this,'callback',{ value: handle_callback.bind(this,server), writable: false, enumerable: true, configurable: false, });
    if(server['_session_options']){
        Object.defineProperty(this,'session',{ value: cosjs_session(this,server['_session_options']), writable: false, enumerable: true, configurable: false, });
    }
};

module.exports = handle;

handle.prototype.status = function(code){
    this.res.status(code);
    return this;
}

handle.prototype.error = function(){
    let err,ret;
    if(arguments.length == 0 ){
        err = 'error',ret = 'unknown';
    }
    else if(arguments.length === 1 && typeof arguments[0] === "object"){
        err = arguments[0];ret = '';
    }
    else if(arguments.length === 1){
        err = 'error';ret = arguments[0];
    }
    else{
        err = arguments[0],ret = arguments[1];
    }
    this.callback(err,ret);
    return false;
}

handle.prototype.success = function(){
    this.callback(null,arguments[0]);
    return true;
}

handle.prototype.binary= function (name, data) {
    var arr = name.split('.');
    this.res.type(arr[1] || 'html');
    this.res.set("Content-Length", data.length);
    var filename = encodeURI(arr[0]) + '.'+arr[1];
    this.res.set("Content-Disposition", "attachment; filename=" + filename);
    this.res.send(data);
}

handle.prototype.render = function(data,view){
    view = view || this.view || this.path;
    var len = view.length;
    var sub0 = view[0] === '/' ? 1 :0;
    var sub1 = view[len-1] ==='/' ? (len - 1 - sub0) : (len - sub0);
    var path = view.substr(sub0,sub1);
    this.res.render(path,data,(err,ret)=>{
        if(err){
            this.res.end(err.message || err.stack || err.toString() );
        }
        else{
            this.res.end(ret);
        }
    });
}

handle.prototype.redirect = function(url){
    this.res.redirect(url);
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
    if ( v!==null && type) {
        v = cosjs_format(v, type);
    }
    return v;
};


function handle_finish(data,code){
    if(this.res.finished){
        return ;
    }
    if(code){
        this.res.status(code);
    }
    var output = this.output;
    if(output ==='view'){
        return this.render(data);
    }
    this.res.type(output);
    if(output === 'jsonp'){
        this.res.jsonp(data);
    }
    else{
        this.res.send(data);
    }
    this.res.end();

    if(this.debug){
        console.log("debug:",this.path,code,JSON.stringify(data))
    }
}


function handle_callback(server,error,ret) {
    let err;
    if(error && (error instanceof Error) ){
        err = error.message;ret = process.env.NODE_ENV === "production" ? error.code : error.stack;
    }
    else {
        err = error ? String(error) : null;
    }
    if(err && Array.isArray(ret)){
        ret = ret.join(",")
    }
    else if( err && typeof ret ==="object"){
        ret = String(ret);
    }

    if(typeof server._event_finish === 'function'){
        server._event_finish.call(this,err,ret,handle_finish.bind(this));
    }
    else{
        var data = {"err":err,"ret":ret||''};
        handle_finish.call(this,data);
    }
}

function handle_subpath(){
    let path,subpath = this.server.subpath;
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