"use strict"
const cosjs_task      = require('./task');
const cosjs_redis    = require('./redis/hash');
const cosjs_mongodb   = require('./mongodb');


module.exports = class MRCache {
    constructor(Redis,Mongodb,DBName,CollName,FormatOpt) {
        this.limit   = 5;                            //批量get时,当数量大于limit时 直接从MONGODB中读取
        this.expire  = 0;                            //缓存时间,0-永远有效
        var PrefixChar = ['_MRC',DBName,CollName].join('|')
        this.redis    = new cosjs_redis(Redis,PrefixChar,FormatOpt );
        this.mongodb  = new cosjs_mongodb(Mongodb,DBName,CollName);
    }
    
    save(callback){
        this.redis.save((err,ret)=>{
            if(err){
                return callback(err,ret);
            }
            this.mongodb.save(callback);
        });
    }
    multi(){
        this.redis.multi();
        this.mongodb.multi();
    }
    
    get(id) {
        var key = null,next = 1,callback = this.redis.callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next++;
        }
        if(typeof arguments[next] === 'function') {
            callback = arguments[next]
        }
        if( id===null ){
            return this.mongodb.get(id,key,callback);
        }
        else if( Array.isArray(id) ){
            return mget.call(this,id,key,callback);
        }

        this.redis.get(id,key,(err,ret)=>{
            if(err){
                return callback(err,ret);
            }
            else if(ret){
                return callback(null,ret);
            }
            else{
                getDataFromMongodb.call(this,id,key,callback);
            }
        });
    }
//id,key,[val,callback]
    set(id,key) {
        var arr = Array.from(arguments);
        arr.unshift('set');
        update.apply(this,arr);
    }

    del(id) {
        var key = null,next = 1,callback=this.redis.callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next++;
        }
        if(typeof arguments[next] === 'function') {
            callback = arguments[next]
        }
        var DBDelResult = function(err,ret){
            if(err){
                return callback(err,ret);
            }
            this.redis.del(id,key,callback);
        }
        if(!key){
            this.mongodb.del(id,DBDelResult.bind(this));
        }
        else{
            this.mongodb.unset(id,key,DBDelResult.bind(this));
        }
    }
    //data,[option],callback,[ErrorReNum]
    add(data) {
        var callback = arguments[1] || this.redis.callback;
        if(!data['_id']){
            data['_id'] = this.mongodb.util.ObjectID();
        }
        var id = data['_id'].toString();
        this.mongodb.insert(data,(err,ret)=>{
            if(!err){
                addDataToRedis.call(this,id,data);
            }
            callback(err,ret);
        });
    }
    //id,key,[val,callback]
    incr(id, key) {
        var arr = Array.from(arguments);
        arr.unshift('incr');
        update.apply(this,arr);
    }

    page(){
        return this.mongodb.page.apply(this.mongodb,arguments);
    }

    insert(){
        this.add.apply(this,arguments);
    }
}

function mget(ids,key,callback){
    if(ids.length > this.limit ){
        return this.mongodb.get(ids,key,callback);
    }
    var data = {'rows':{},'key':key,'nocache':[],'callback':callback};
    var worker = mget_worker.bind(this,data);
    var result = mget_result.bind(this,data);
    var mgetTask = new cosjs_task(ids,worker,result);
    mgetTask.breakOnError = true;
    mgetTask.start();
}

function mget_worker(data,id,callback){
    this.redis.get(id,data['key'],function(err,ret){
        if(err){
            return callback(err,ret);
        }
        if(!ret){
            data['nocache'].push(id);
        }
        else{
            data['rows'][id] = ret;
        }
        return callback(null);
    });
}

function mget_result(data,err,ret){
    var callback = data['callback'];
    if(err){
        return callback(ret[0][0],ret[0][1]);
    }
    else if(data['nocache'].length ==0){
        return callback(null,data['rows']);
    }
    getDataFromMongodb.call(this,data['nocache'],data['key'], (e,r)=>{
        if(e) {
            return callback(e,r);
        }
        if(r){
            Object.assign(data["rows"],r);
        }
        return callback(null,data['rows']);
    });
}


function update(cmd,id,key){
    var val = null,next = 3,callback=this.redis.callback;
    if(typeof arguments[next] !== 'function'){
        val = arguments[next];
        next++;
    }
    if(typeof arguments[next] === 'function') {
        callback = arguments[next]
    }

    if( !id || typeof id == 'object'){
        return callback('error','MRCache.set arguments[id] typeof illegal');
    }
    //开启通道模式下,立即返回,需要自己检查缓存中数据是否存在
    if(this.redis._RedisMulti){
        this.redis[cmd](id,key,val);
        this.mongodb[cmd](id,key,val);
        return callback(null);
    }

    function update_result(err,ret){
        if(err){
            return callback(err,ret);
        }
        var query = this.mongodb.util.query(id);
        if(cmd === 'incr'){
            var update = {"$set":this.mongodb.util.values(key,ret)};
        }
        else{
            var update = {"$set":this.mongodb.util.values(key,val)};
        }
        var option = {multi:false,upsert:false};
        this.mongodb.update(query,update,option);
        callback(err,ret);
    }

    this.redis.exists(id,(err,ret)=>{
        if(err){
            return callback(err,ret);
        }
        if(ret){
            var resultBind = update_result.bind(this);
            this.redis[cmd](id, key, val, resultBind);
        }
        else {
            this.mongodb[cmd](id,key,val,callback);
        }
    })
}



function mergeObject(data,key){
    if(!key){
        return data;
    }
    else if(!Array.isArray(key)){
        return data[key]||false;
    }
    else{
        var v = {}
        for (var k of key) {
            if (k in data) {
                v[k] = data[k];
            }
        }
        return v;
    }
}


function addDataToRedis(id,key,val) {
    this.redis.set(id,key,val,(err,ret)=>{
        if(!err && this.expire){
            this.redis.expire(id,this.expire);
        }
    });
}

function getDataFromMongodb(id,keys,callback){
    var data;
    this.mongodb.get(id,null,(err,ret)=>{
        if(err || !ret){
            return callback(err,ret);
        }
        if(Array.isArray(id)){
            data = {};
            for(var k in ret){
                data[k] = mergeObject(ret[k],keys);
                addDataToRedis.call(this,k,ret[k]);
            }
        }
        else{
            data = mergeObject(ret,keys);
            addDataToRedis.call(this,id,ret);
        }

        return callback(err,data);
    });
}