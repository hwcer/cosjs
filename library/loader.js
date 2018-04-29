"use strict";
const fs = require('fs');
//模块加载器


function loader(path,safe){
    if (!(this instanceof loader)) {
        return new loader(path,safe);
    }
    this.ext = ['.js','.json','.node'];
    this._safeMode     = safe|| false;
    this._pathCache   = new Set();
    this._moduleCache = {};
    this.addPath(path);
}

module.exports = loader;

loader.prototype.require = function(name){
    if(name[0] !== '/'){
        name = '/' + name;
    }
    if( !this._moduleCache[name] ){
        return null;
    }
    let file = this._moduleCache[name];
    let mods = require(file);
    return mods;
}


loader.prototype.parse = function(name){
    if( !name || name.length <=1 ){
        return false;
    }
    if(name.indexOf('/') < 0){
        name = ['/',name,'/'].join('');
    }
    let i = name.lastIndexOf('/');
    let mod = this.require(name.substr(0,i));
    if(!mod){
        return false;
    }
    let key = name.substr(i+1);
    if(!key){
        return mod;
    }
    else {
        return mod[key] || null;
    }
}

//重新加载
loader.prototype.reload = function(){
    for(let k in this._moduleCache){
        let id = require.resolve(this._moduleCache[k]);
        if(id){
            delete require.cache[id];
        }
    }
}


loader.prototype.addPath = function(path) {
    if(!path){
        return;
    }
    if(this._pathCache.has(path)){
        return;
    }
    this._pathCache.add(path);
    getFiles.call(this, path);
}

loader.prototype.forEach = function(callback){
    for(let k in this._moduleCache){
        callback(k,this._moduleCache[k]);
    }
}

function getFiles(root,dir) {
    dir = dir||'/';
    let stats, path = root + dir;
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
    let files = fs.readdirSync(path);
    if(!files || !files.length){
        return;
    }
    files.forEach( (name)=>{
        filesForEach.call(this,root,dir,name);
    })
}


function filesForEach(root,dir,name){
    let FSPath = require('path');
    let realPath = FSPath.resolve([root,dir,name].join('/'));
    let realName = dir+name;
    let stats = fs.statSync(realPath);
    if (stats.isDirectory()) {
        return getFiles.call(this,root,realName+'/');
    }

    let ext = FSPath.extname(name);
    if(this.ext.indexOf(ext) >=0){
        let api = realName.replace(ext,'');
        if( this._safeMode && this._moduleCache[api] ){
            console.log('file['+api+'] exist');
        }
        else{
            this._moduleCache[api] = realPath;
        }
    }
}