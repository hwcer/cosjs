"use strict"
const redis = require('./index');

module.exports = class redis_zset extends redis{

    constructor(RedisKey,PrefixChar) {
        super(RedisKey,PrefixChar);
        this.order = 'desc';
        this.doomsday = false;
    }

    //是否在Score后面加时间标记避免重复
    stamp(stime){
        this.doomsday = stime||'2200-01-01';
    }
    //获取个人排名,-1:未上榜，0：开始
    get(name, key, callback) {
        var self = this;
        var hash  = this.rkey(name);
        var redis = this.connect(true);
        var result = function(err,ret){
            if(err){
                return self.error(err,callback);
            }
            var index = ret === null ? -1 : ret;
            callback(null,index);
        }
        if(this.order == 'desc'){
            redis.zrevrank(hash, key, result);
        }
        else{
            redis.zrank(hash, key, result);
        }
    }
    //设置SCORE
    set(name, key, val, callback) {
        callback = callback||this.callback;
        var hash  = this.rkey(name);
        var score = getTimeStampScore.call(this,val);
        var redis = this.connect();
        redis.zadd(hash,score,key, callback);
    }
    //删除排名
    del(name) {
        var next = 1,key,callback = this.callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next ++;
        }
        if(typeof arguments[next] === 'function'){
            callback = arguments[next] ;
        }

        var hash  = this.rkey(name);
        var redis = this.connect();
        if(key===null){
            redis.del(hash, callback);
        }
        else{
            redis.zrem(hash, key, callback);
        }
    }
    //获取值
    val(name,key, callback) {
        var hash  = this.rkey(name);
        var redis = this.connect(true);
        redis.zscore(hash, key, callback);
    }
    //递增值
    incr(name,key,val,callback) {
        callback = callback||this.callback;
        var redis = this.connect();
		if(!this.doomsday){
            var hash  = this.rkey(name);
			return redis.zincrby(hash, val,key,callback);
		}
		this.val(name,key,(err,ret)=>{
			if(err){
				return callback(err,ret);
			}
			var old = parseInt(ret)||0;
			var score = old +val;
			this.set(name,key,score,callback);
		});
		
        
    }
    size(name,callback){
        var hash  = this.rkey(name);
        var redis = this.connect(true);
        redis.zcard(hash, callback);
    }
    //按名次分段获取
    range(name,start,stop) {
        var next = 3,WITHSCORES,callback;
        if(typeof arguments[next] != 'function' ){
            WITHSCORES = arguments[next];
            next ++;
        }
        callback = arguments[next];
        var hash  = this.rkey(name);
        var redis = this.connect(true);

        var arr = [hash,start,stop];
        if(WITHSCORES){
            arr.push('WITHSCORES');
        }
        arr.push(callback);

        if(this.order === 'desc' ){
            redis.zrevrange.apply(redis, arr);
        }
        else{
            redis.zrange.apply(redis, arr);
        }
    }
    //按积分分段获取,ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]
    rangeByScore(name,min,max,WITHSCORES,limit, offset, count,callback) {
        var redis = this.connect(true);
        var arr = Array.from(arguments);
        arr[0] = this.rkey(arr[0]);
        if(arr[3] && typeof arr[3] != 'function'){
            arr[3] == 'WITHSCORES';
        }
        if(this.order === 'desc' ){
            redis.zrevrangebyscore.apply(redis,arr);
        }
        else{
            redis.zrangebyscore.apply(redis,arr);
        }
    }


};



function getTimeStampScore(val){
    if(!this.doomsday){
        return val;
    }
    if(this.order == 'desc'){
        var nowtime = parseInt(Date.now() / 1000 );
        var doomsday = parseInt(Date.parse(this.doomsday) / 1000 );
        var suffix = doomsday - nowtime;
    }
    else{
        var suffix = parseInt(Date.now() / 1000 );
    }

    return parseFloat([val,suffix].join('.'));
}
