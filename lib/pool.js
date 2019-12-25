"use strict";
const library = require('cosjs.library');
const pool_connect  = {};
//请求连接
exports.get = function(key){
    if( !pool_connect[key] ){
        return false;
    }else {
        return pool_connect[key]['get']();
    }
}
//添加一个服务器到连接池中
exports.set = function(key,opts,connect,destroy){
    if(pool_connect[key]){
        return Promise.reject('pool['+key+'] exist');
    }
    pool_connect[key] = new pool(key,opts,connect,destroy);
    return pool_connect[key]['acquire']();
}
//请求连接
exports.link = function(key,target){
    if( !pool_connect[target] ){
        return Promise.reject(`pool.link target(${target}) not exist`);
    }
    let ret = pool_connect[key] = pool_connect[target];
    return Promise.resolve(ret);
};
//请求连接,异步安全
exports.acquire = function(key){
    if( !pool_connect[key] ){
        return Promise.reject('pool['+key+'] not exist');
    }else {
        return pool_connect[key]['acquire']();
    }
};
//动态创建连接
exports.connect = function(key){
    if( !pool_connect[key] ){
        return Promise.reject('pool.connect key['+key+'] not exist');
    }else {
        return pool_connect[key]['connect']();
    }
};

/////////////////////////////////////////////////////////////////////////////////
exports.redis=function(key,opts) {
    return exports.set( key, opts, redis_connect, function(db){ db.quit() } );
};

exports.mongodb=function(key,opts) {
    return exports.set(  key, opts, mongodb_connect, function(db){  db.close() } );
};

/////////////////////////////////////////////////////////////////////////////////
function pool(key,opts,connect,destroy){
    this.key = key;
    this.opts = opts||{};
    this._databaseClient = [];
    this._databaseConnect = connect;
    this._databaseDestroy = destroy;
};

//请求分配一个现有连接
pool.prototype.get = function(){
    return this._databaseClient[0]||null;
};
//请求分配一个现有连接
pool.prototype.acquire = function(){
    if( this._databaseClient.length > 0 ){
        return Promise.resolve(this._databaseClient[0]);
    }
    else {
        return database_connect.call(this);
    }
}
//强制创建连接
pool.prototype.connect = function(){
    return this._databaseConnect(this.opts);
}


function database_connect(){
    return this._databaseConnect(this.opts).then(db=>{
        //高并发,已被创建
        if( this._databaseClient.length > 0){
            this._databaseDestroy(db);
        }
        else{
            this._databaseClient.push(db);
        }
        return db;
    });
}

function redis_connect(opts){
    let redis = require('cosjs.redis').connect(opts);
    return Promise.resolve(redis);
}


function mongodb_connect(opts){
    return require('cosjs.mongo').connect(opts);
}
