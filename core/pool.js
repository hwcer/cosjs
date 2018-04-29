"use strict";
const library = require('../library');

var pool_connect  = {};

//添加一个服务器到连接池中
exports.set = function(key,opts,connect,destroy){
    if(pool_connect[key]){
        throw new Error('pool['+key+'] exist');
    }
    return pool_connect[key] = new pool(key,opts,connect,destroy);
};
//请求连接
exports.get = function(key){
    if( !pool_connect[key] ){
        return false;
    }else {
        return pool_connect[key]['get']();
    }
};
//请求连接
exports.link = function(key,target){
    if( !pool_connect[target] ){
        return false;
    }
    return pool_connect[key] = pool_connect[target];
};
//请求连接,异步安全
exports.acquire = function(key,callback){
    if( !pool_connect[key] ){
        return callback('pool['+key+'] not exist');
    }else {
        return pool_connect[key]['acquire'](callback);
    }
};
//动态创建连接
exports.connect = function(key,callback){
    if( !pool_connect[key] ){
        callback('error','pool key['+key+'] not exist');
    }else {
        pool_connect[key]['connect'](callback);
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
    database_connect.call(this,function(){});
};

//请求分配一个现有连接
pool.prototype.get = function(){
    return this._databaseClient[0]||null;
};
//请求分配一个现有连接
pool.prototype.acquire = function(callback){
    if( this._databaseClient.length > 0 ){
        callback(null,this._databaseClient[0]);
    }
    else{
        database_connect.call(this,callback);
    }
};
//强制创建连接
pool.prototype.connect = function(callback){
    this._databaseConnect(this.opts,callback);
};


function database_connect(callback){
    this._databaseConnect(this.opts, (err,db)=>{
        if(err){
            return callback(err,db);
        }
        //高并发,已被创建
        if( this._databaseClient.length > 0){
            this._databaseDestroy(db);
        }
        else{
            this._databaseClient.push(db);
        }
        callback(null,this._databaseClient[0]);
    });
};

function redis_connect(opts,callback){
    let redis = library.require('redis').connect(opts);
    return callback(null,redis);
};


function mongodb_connect(opts,callback){
    library.require('mongodb').connect(opts,callback);
};
