"use strict"
//基于redis的缓存
const redis = require('./index');


module.exports = class redis_string extends redis{

    constructor(RedisKey,PrefixChar) {
        super(RedisKey,PrefixChar);
    }

    get(key, callback) {
        let rkey  = this.rkey(key);
        let redis = this.connect(true);
        if (Array.isArray(rkey)) {
            redis.mget(rkey, callback);
        }
        else {
            redis.get(rkey, callback);
        }
    }

    set(key, val) {
        let next=2,expire, callback = this.callback;
        if(typeof arguments[next] === 'number'){
            expire = arguments[next];
            next++;
        }
        if(typeof arguments[next] === 'function'){
            callback = arguments[next];
        }
        //获取CONN
        let redis = this.connect();
        if (typeof(key) === 'object') {
            let data = {};
            for (let k in key) {
                let rk = this.rkey(k);
                data[rk] = typeof key[k] === 'object' ? JSON.stringify(key[k]) : key[k];
            }
            redis.mset(data, callback);//expire
        }
        else {
            if (typeof(val) === 'object') {
                val = JSON.stringify(val);
            }
            let rkey = this.rkey(key);
            if(expire){
                let time = Date.now();
                let ttl = (expire >= time) ? parseInt((expire - time)/1000) : expire;
                redis.setex( rkey, ttl, val, callback);
            }
            else{
                redis.set( rkey, val, callback);
            }
        }
    }



    incr(key,val,callback) {
        callback = callback || this.callback;
        let rkey  = this.rkey(key);
        let redis = this.connect();
        redis.incrby(rkey,val,callback);
    }

    decr(key,val,callback) {
        callback = callback || this.callback;
        let rkey  = this.rkey(key);
        let redis = this.connect();
        redis.decr(rkey,val,callback);
    }
};

