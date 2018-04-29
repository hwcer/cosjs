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
    get(key, callback) {
        let self = this;
        let hash  = this.rkey();
        let redis = this.connect(true);
        let result = function(err,ret){
            if(err){
                return self.error(err,callback);
            }
            let index = ret === null ? -1 : ret;
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
    set(key, val, callback) {
        callback = callback||this.callback;
        let hash  = this.rkey();
        let score = getTimeStampScore.call(this,val);
        let redis = this.connect();
        redis.zadd(hash,score,key, callback);
    }
    //删除排名
    del() {
        let next = 0,key,callback = this.callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next ++;
        }
        if(typeof arguments[next] === 'function'){
            callback = arguments[next] ;
        }

        let hash  = this.rkey();
        let redis = this.connect();
        if(key===null){
            redis.del(hash, callback);
        }
        else{
            redis.zrem(hash, key, callback);
        }
    }
    //获取值
    val(key, callback) {
        let hash  = this.rkey();
        let redis = this.connect(true);
        redis.zscore(hash, key, callback);
    }
    //递增值
    incr(key,val,callback) {
        callback = callback||this.callback;
        let redis = this.connect();
		if(!this.doomsday){
            let hash  = this.rkey();
			return redis.zincrby(hash, val,key,callback);
		}
		this.val(key,(err,ret)=>{
			if(err){
				return callback(err,ret);
			}
            let old = parseInt(ret)||0;
            let score = old +val;
			this.set(key,score,callback);
		});
    }
    size(callback){
        let hash  = this.rkey();
        let redis = this.connect(true);
        redis.zcard(hash, callback);
    }
    //按名次分段获取
    range(start,stop) {
        let next = 2,WITHSCORES,callback;
        if(typeof arguments[next] != 'function' ){
            WITHSCORES = arguments[next];
            next ++;
        }
        callback = arguments[next];
        let hash  = this.rkey();
        let redis = this.connect(true);

        let arr = [hash,start,stop];
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
    rangeByScore(min,max,WITHSCORES,limit, offset, count,callback) {
        let redis = this.connect(true);
        let arr = Array.from(arguments);
        arr.unshift(this.rkey())
        if(arr[2] && typeof arr[2] != 'function'){
            arr[2] == 'WITHSCORES';
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
    let suffix;
    if(this.order == 'desc'){
        let nowtime = parseInt(Date.now() / 1000 );
        let doomsday = parseInt(Date.parse(this.doomsday) / 1000 );
        suffix = doomsday - nowtime;
    }
    else{
        suffix = parseInt(Date.now() / 1000 );
    }

    return parseFloat([val,suffix].join('.'));
}
