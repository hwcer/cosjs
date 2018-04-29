"use strict"
const format  = require('../library/format');
const cosjs_redis   = require('./index');

module.exports = class redis_hash extends cosjs_redis{
    constructor(opts,prefix,FormatOpts){
        super(opts,prefix);
        this._FormatOpts = FormatOpts||null;
    }

    get(key) {
        let field ,next = 1,callback
        if(typeof arguments[next] !== 'function'){
            field  = arguments[next];
            next++;
        }
        callback = arguments[next];

        if ( !field  ) {
            hgetall.call(this,key,callback);
        }
        else if (Array.isArray(field)) {
            hmget.call(this, key, field, callback);
        }
        else {
            hget.call(this,key, field, callback);
        }
    }

    set(key,field) {
        let value,next = 2,callback = this.callback;
        if(typeof arguments[next] !== 'function'){
            value = arguments[next];
            next++;
        }
        if(typeof arguments[next] === 'function') {
            callback = arguments[next];
        }
        let rkey = this.rkey(key);
        let redis = this.connect();
        if (typeof(field) === 'object') {
            let rows = {};
            for (let k in field) {
                rows[k] = typeof field[k] === 'object' ? cosjs_redis.toString(field[k]) : field[k];
            }
            redis.hmset(rkey, rows, callback);
        }
        else {
            if (typeof(value) === 'object') {
                value = cosjs_redis.toString(value);
            }
            redis.hset(rkey, field, value, callback);
        }
    }
    // field,callback
    del(key){
        let next = 1,field,callback = this.callback;

        if(typeof arguments[next] !== 'function'){
            field = arguments[next];
            next ++;
        }
        if(typeof arguments[next] === 'function'){
            callback = arguments[next];
        }
        if( !field ){
            super.del(key,callback);
        }
        else {
            let rkey = this.rkey(key);
            let redis = this.connect();
            redis.hdel(rkey, field, callback);
        }
    }

    incr(key,field,value,callback) {
        let rkey = this.rkey(key);
        let redis = this.connect();
        redis.hincrby(rkey,field,value,callback||this.callback);
    }
    //id,[key],callback
    exists(key){
        let next = 1,field,callback=this.callback;
        if(typeof arguments[next] != 'function'){
            field = arguments[next];
            next ++;
        }
        callback = arguments[next];
        if (field) {
            let rkey = this.rkey(key);
            let redis = this.connect(true);
            redis.hexists(rkey, field, callback);
        }
        else {
            super.exists(key, callback);
        }
    }
}

function hget(key, field, callback) {
    let rkey = this.rkey(key);
    let redis = this.connect(true);
    redis.hget(rkey, field, (err, ret) =>{
        if (err || !ret ) {
            return callback(err, ret);
        }
        let val;
        if(this._FormatOpts){
            let valType = (typeof this._FormatOpts === 'object' && this._FormatOpts[field]) ? this._FormatOpts[field]['type'] : this._FormatOpts;
            val = format.parse(ret, valType)
        }
        else{
            val = ret;
        }
        return callback(null, val );

    });
}

function hmget(key, field, callback) {
    let rkey = this.rkey(key);
    let redis = this.connect(true);
    redis.hmget(rkey, field, (err, ret)=> {
        if (err || !ret) {
            return callback(err, ret);
        }
        let data = {};
        for(let i in field){
            let k = field[i];
            if(ret[i] !== null){
                data[k] = ret[i];
            }
        }
        if(Object.keys(data).length===0){
            return callback(null, null);
        }
        if(this._FormatOpts){
            format(data,this._FormatOpts);
        }
        return callback(null, data);
    });
}

function hgetall(key, callback) {
    let rkey = this.rkey(key);
    let redis = this.connect(true);
    redis.hgetall(rkey, (err, ret)=>{
        if (err || !ret ) {
            return callback(err, ret);
        }
        if(Object.keys(ret).length===0){
            return callback(null, null);
        }
        if(this._FormatOpts){
            format(ret,this._FormatOpts,true);
        }
        return callback(null, ret);
    })
}

