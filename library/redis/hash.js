"use strict"
const redis   = require('./index');
const format  = require('../format');

module.exports = class redis_hash extends redis{
    constructor(opts,prefix,FormatOpts){
        super(opts,prefix);
        this._FormatOpts = FormatOpts||null;
    }

    get(key) {
        var field ,next = 1,callback
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
        var value,next = 2,callback = this.callback;
        if(typeof arguments[next] !== 'function'){
            value = arguments[next];
            next++;
        }
        if(typeof arguments[next] === 'function') {
            callback = arguments[next];
        }
        var rkey = this.rkey(key);
        var redis = this.connect();
        if (typeof(field) === 'object') {
            var rows = {};
            for (var k in field) {
                rows[k] = typeof key[k] === 'object' ? redis.toString(field[k]) : field[k];
            }
            redis.hmset(rkey, rows, callback);
        }
        else {
            if (typeof(value) === 'object') {
                value = redis.toString(value);
            }
            redis.hset(rkey, field, value, callback);
        }
    }
    // field,callback
    del(key){
        var next = 1,field,callback = this.callback;

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
            var rkey = this.rkey(key);
            var redis = this.connect();
            redis.hdel(rkey, field, callback);
        }
    }

    incr(key,field,value,callback) {
        var rkey = this.rkey(key);
        var redis = this.connect();
        redis.hincrby(rkey,field,value,callback||this.callback);
    }
    //id,[key],callback
    exists(key){
        var next = 1,field,callback=this.callback;
        if(typeof arguments[next] != 'function'){
            field = arguments[next];
            next ++;
        }
        callback = arguments[next];
        if (field) {
            var rkey = this.rkey(key);
            var redis = this.connect(true);
            redis.hexists(rkey, field, callback);
        }
        else {
            super.exists(key, callback);
        }
    }
}

function hget(key, field, callback) {
    var rkey = this.rkey(key);
    var redis = this.connect(true);
    redis.hget(rkey, field, (err, ret) =>{
        if (err || !ret ) {
            return callback(err, ret);
        }
        if(this._FormatOpts){
            var valType = (typeof this._FormatOpts === 'object' && this._FormatOpts[field]) ? this._FormatOpts[field]['type'] : this._FormatOpts;
            var val = format.parse(ret, valType)
        }
        else{
            var val = ret;
        }
        return callback(null, val );

    });
}

function hmget(key, field, callback) {
    var rkey = this.rkey(key);
    var redis = this.connect(true);
    redis.hmget(rkey, field, (err, ret)=> {
        if (err || !ret) {
            return callback(err, ret);
        }
        var data = {};
        for(let i in field){
            let k = field[i];
            if(ret[i] !== null){
                data[k] = ret[i];
            }
        }
        if(this._FormatOpts){
            format(data,this._FormatOpts);
        }
        return callback(null, data);
    });
}

function hgetall(key, callback) {
    var rkey = this.rkey(key);
    var redis = this.connect(true);
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

