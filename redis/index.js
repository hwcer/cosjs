"use strict"
const ioredis = require('ioredis');

class redis{
    constructor(opts,prefix){
        this._RedisConn   = redis_connect(opts);
        this._RedisMulti  = null;
        this._PrefixChar  = prefix||null;
        this._PrefixSplit = '|';
    }
    //获取封装后的真实KEY
    rkey(key){
        let arr = [];
        if(Array.isArray(this._PrefixChar)){
            arr = arr.concat(this._PrefixChar);
        }
        else if(this._PrefixChar){
            arr.push(this._PrefixChar);
        }
        if(Array.isArray(key)){
            arr = arr.concat(key);
        }
        else if(key){
            arr.push(key);
        }
        return arr.join(this._PrefixSplit);
    }
    save(callback) {
        callback = callback || this.callback;
        if(!this._RedisMulti){
            return callback('redisErr','use exec but multi empty');
        }
        this._RedisMulti.exec( (err,ret)=> {
            this._RedisMulti = null;
            return callback(err,ret);
        } );
    }
    multi(){
        if(!this._RedisMulti){
            this._RedisMulti = this._RedisConn.multi();
        }
        return this._RedisMulti;
    }
    //expire 时间戳(MS),或者秒
    expire(key,expire,callback){
        callback = callback || this.callback;
        let hash = this.rkey(key);
        let redis = this.connect();
        let time = Date.now();
        let cmd = expire >= time ? 'pexpireat':'expire';
        redis[cmd](hash, expire, callback);
    }

    ttl(key,callback){
        callback = callback || this.callback;
        let hash = this.rkey(key);
        let redis = this.connect();
        redis.ttl(hash, callback);
    }

    del(key,callback){
        callback = callback || this.callback;
        let hash = this.rkey(key);
        let redis = this.connect();
        redis.del(hash, callback);
    }

    exists(key,callback){
        callback = callback || this.callback;
        let hash = this.rkey(key);
        let redis = this.connect(true);
        redis.exists(hash, callback);
    }

    connect(read){
        if(read){
            return this._RedisConn;
        }
        else {
            return this._RedisMulti || this._RedisConn;
        }
    }

    callback(err,ret){
        return err ? false : ret;
    }

}

function redis_connect(opts,duplicate){
    let redis;
    if (  opts instanceof ioredis || opts instanceof (ioredis.Cluster)  ) {
        redis = duplicate ? opts.duplicate() : opts ;
    }
    else if(Array.isArray(opts)){
        redis = new ioredis.Cluster(opts);
    }
    else if(typeof opts === 'object' && Array.isArray(opts['cluster'])){
        redis = new ioredis.Cluster(opts['cluster'],opts['options']||{});
    }
    else if(typeof opts === 'object' ){
        redis = new ioredis(opts);
    }
    else{
        let url = 'redis://' + opts;
        redis = new ioredis(url);
    }
    if(redis && redis.listenerCount('error') < 1 ){
        redis.on('error',function(err){
            console.log('redis',err);
        });
    }
    return redis;
}

function redis_toString(val){
    if(val===null){
        return "";
    }
    if( val && typeof val.toJSON === 'function'){
        return val.toJSON();
    }
    else if(val && typeof val === 'object'){
        return JSON.stringify(val);
    }
    else{
        return val;
    }
}


module.exports = redis;
module.exports.connect = redis_connect;
module.exports.toString = redis_toString;