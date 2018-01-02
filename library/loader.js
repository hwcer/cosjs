"use strict";
var fs = require('fs');
//模块加载器


function loader(path,safe){
    if (!(this instanceof loader)) {
        return new loader(path,safe);
    }
    this.ext = ['.js'];
    this._safeMode     = safe|| false;
    this._pathCache   = new Set();
    this._moduleCache = {};
    this._handleCache = null;

    if(path) {
        this._pathCache.add(path);
        getFiles.call(this, path);
    }
}

module.exports = loader;

loader.prototype.require = function(name){
    if(name[0] !== '/'){
        name = '/' + name;
    }
    if( !this._moduleCache[name] ){
        return null;
    }
    var file = this._moduleCache[name];
    var mods = require(file);
    return mods;
}


loader.prototype.parse = function(name){
    if( !name || name.length <=1 ){
        return false;
    }
    if(name.indexOf('/') < 0){
        name = ['/',name,'/'].join('');
    }
    var i = name.lastIndexOf('/');
    var mod = this.require(name.substr(0,i));
    if(!mod){
        return false;
    }
    var key = name.substr(i+1);
    if(!key){
        return mod;
    }
    else {
        return mod[key] || null;
    }
}



loader.prototype.addPath = function(path) {
    if(this._pathCache.has(path)){
        return;
    }
    this._handleCache = null;
    this._pathCache.add(path);
    getFiles.call(this, path);
}


loader.prototype.handle = function(callback){
    if( !this._handleCache){
        this._handleCache = [];
        for(var k in this._moduleCache){
            var mods = require(this._moduleCache[k]);
            if(typeof mods === 'function'){
                this._handleCache.push(k+'/');
            }
            else{
                for(var m in mods){
                    if(typeof mods[m] === 'function'){
                        this._handleCache.push(k+'/'+m);
                    }
                }
            }
        }
    }
    for(let f of this._handleCache){
        callback(f);
    }
}

loader.prototype.module = function(callback){
    for(let k in this._moduleCache){
        callback(k,this._moduleCache[k]);
    }
}

function getFiles(root,dir) {
    dir = dir||'/';
    var self = this,stats;
    var path = root + dir;
    try {
        stats = fs.statSync(path);
    }
    catch (e){
        stats = null;
    }
    if(!stats){
        return;
    }
    if(!stats.isDirectory()){
        return;
    }
    var files = fs.readdirSync(path);
    if(!files || !files.length){
        return;
    }
    files.forEach(function (name) {
        filesForEach.call(self,root,dir,name);
    })
}


function filesForEach(root,dir,name){
    var self = this,FSPath = require('path');
    var realPath = FSPath.resolve([root,dir,name].join('/'));
    var realName = dir+name;
    var stats = fs.statSync(realPath);
    if (stats.isDirectory()) {
        return getFiles.call(self,root,realName+'/');
    }

    var ext = FSPath.extname(name);
    if(self.ext.indexOf(ext) >=0){
        var api = realName.replace(ext,'');
        if( self._safeMode && self._moduleCache[api] ){
            console.log('file['+api+'] exist');
        }
        else{
            self._moduleCache[api] = realPath;
        }
    }
}