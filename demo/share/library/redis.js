//基于redis的缓存
var pool = require('cosjs').pool;
var formatter = require('./formatter');

exports.hash = function(PoolKey,Prefix){
    return new redis_hash(PoolKey,Prefix);
}

exports.zset = function(PoolKey,Prefix){
    return new redis_zset(PoolKey,Prefix);
}

exports.string = function(PoolKey,Prefix){
    return new redis_string(PoolKey,Prefix);
}

var redis_key_func =  function (id) {
    if(Array.isArray(id)){
        var arr=[];
        id.forEach(function(k){
            arr.push([this._PrefixChar,k].join(this._PrefixSplit));
        });
        return arr;
    }
    else{
        return [this._PrefixChar,id].join(this._PrefixSplit) ;
    }
}

var redis_init_func = function(PoolKey,PrefixChar){
    this._PoolKey = PoolKey;
    this._PrefixChar = Array.isArray(PrefixChar) ? PrefixChar.join('|') : PrefixChar;
}


var redis_prototype_object = {};
Object.defineProperties(redis_prototype_object,{
    "_PoolKey": {enumerable: false, configurable: false,  writable: true, value: ""},
    "_PrefixChar": {enumerable: false, configurable: false,  writable: true, value: ""},
    "_PrefixSplit": {enumerable: false, configurable: false,  writable: true, value: "|"},

    "_RedisConn": {enumerable: false, configurable: false,  writable: true, value: null},
    "_RedisMulti":{enumerable: false, configurable: false,  writable: true, value: null},

    "conn": {
        enumerable: true, configurable: false, writable: false, value: function(callback){
            var self = this;
            if (self._RedisConn) {
                return callback(null, self._RedisConn);
            }
            pool.connect(self._PoolKey, function (err, ret) {
                if (err) {
                    return callback(err, ret);
                }
                self._RedisConn = ret;
                return callback(null, self._RedisConn);
            });
        }
    },
    "exec": {
        enumerable: true, configurable: false, writable: false, value: function (callback) {
            var self = this;
            if(!callback ){
                callback = Function.callback;
            }
            if(!self._RedisMulti){
                return callback('redisErr','use exec but multi empty');
            }
            self._RedisMulti.exec(callback);
        }
    },
    "multi": {
        enumerable: true, configurable: false, writable: false, value: function (callback) {
            var self = this;
            if(!callback ){
                callback = Function.callback;
            }
            if(self._RedisMulti){
                return callback(null, self._RedisMulti);
            }
            this.conn(function (err, ret) {
                if (err) {
                    return callback(err, ret);
                }
                self._RedisMulti = ret.multi();
                return callback(null, self._RedisMulti);
            });
        }
    },
    "expire":{
        enumerable: true, configurable: false, writable: false, value: function(id,expire,callback){
            var self = this;
            var connkey = self._RedisMulti ? 'multi' : 'conn';
            self[connkey](function(err,ret){
                if(err){
                    return callback(err,ret);
                }
                var time = new Date().getTime() / 1000;
                var cmd = expire >= time ? 'expireat':'expire';
                var key = redis_key_func.call(self,id);
                ret[cmd](key, expire, callback);
            });
        }
    },
    "exists":{
        enumerable: true, configurable: false, writable: false, value: function(id,key,callback){
            var self = this;
            if(arguments.length==2){
                key = null;
                callback = arguments[1];
            }
            this.conn(function(err,ret){
                if(err){
                    return callback(err,ret);
                }
                var hash = redis_key_func.call(self,id);
                if (!key) {
                    ret.exists(hash, callback);
                }
                else {
                    ret.hexists(hash, key, callback);
                }
            });
        }
    },
});

var redis_hash = function(PoolKey,Prefix) {
    "use strict"
    var self = this;
    redis_init_func.call(self,PoolKey,Prefix);

    this.format = false;

    this.get = function (id, key, callback) {
        if(arguments.length ==2){
            key = null;
            callback = arguments[1];
        }
        this.conn(function(err,conn){
            if (err) {
                return callback(err, conn);
            }
            var hash = redis_key_func.call(self,id);
            if (!key) {
                hgetall(conn,hash, callback);
            }
            else if (Array.isArray(key)) {
                hmget(conn, hash, key, callback);
            }
            else {
                hget(conn,hash, key, callback);
            }
        });
    }

    this.set = function (id, key, val, callback) {
        if(arguments.length==3){
            val = null;
            callback = arguments[2];
        }
        if(typeof callback != 'function'){
            callback = Function.callback;
        }
        var result = function (err, data) {
            if (err) {
                return callback(err, data);
            }
            return callback(false, data);
        }
        //获取CONN
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var hash = redis_key_func.call(self,id);
            if (typeof(key) === 'object') {
                var rows = {};
                for (var k in key) {
                    rows[k] = typeof key[k] === 'object' ? JSON.stringify(key[k]) : key[k];
                }
                conn.hmset(hash, rows, result);
            }
            else {
                if (typeof(val) === 'object') {
                    val = JSON.stringify(val);
                }
                conn.hset(hash, key, val, result);
            }
        });
    }

    this.del = function (id, key, callback) {
        if(arguments.length==2){
            key = null;
            callback = arguments[1];
        }
        if(typeof callback != 'function'){
            callback = Function.callback;
        }
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var hash = redis_key_func.call(self,id);
            if (key===null) {
                conn.del(hash, callback);
            }
            else if (Array.isArray(key)) {
                key.forEach(function (k) {
                    conn.hdel(hash, k);
                });
                callback(null, key.length);
            }
            else {
                conn.hdel(hash, key, callback);
            }
        });
    }

    this.incr = function (id, key,val,callback) {
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var hash = redis_key_func.call(self,id);
            conn.hincrby(hash,key,val,callback);
        });
    }

    var hget = function (conn,hash, key, callback) {
        conn.hget(hash, key, function (err, data) {
            if (err) {
                return callback(err, data);
            }
            else {
                return callback(false, data);
            }
        });
    }

    var hmget = function (conn,hash, key, callback) {
        conn.hmget(hash, key, function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            var data = {};
            for (var i in key) {
                var k = key[i];
                data[k] = ret[i];
            }
            if(self.format){
                formatter(data,self.format);
            }
            return callback(false, data);
        });
    }

    var hgetall = function (conn,hash, callback) {
        conn.hgetall(hash, function (err, data) {
            if (err) {
                return callback(err, data);
            }
            if(self.format){
                formatter(data,self.format);
            }
            return callback(false, data);
        })
    }
};

var redis_zset=function(PoolKey,Prefix) {
    "use strict"
    var self = this;
    redis_init_func.call(self,PoolKey,Prefix);
    this.order = 'desc';
    //获取个人排名,-1:未上榜，0：开始
    this.get = function (name, key, callback) {
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            var hash = redis_key_func.call(self,name);
            if(self.order == 'desc'){
                conn.zrevrank(hash, key, callback);
            }
            else{
                conn.zrank(hash, key, callback);
            }
        });
    }
    //设置val
    this.set = function (name, key, val, callback) {
        var hash = redis_key_func.call(self,name);
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            conn.zadd(hash, val,key, callback);
        });
    }
    //删除排名
    this.del = function (name,key, callback) {
        var hash = redis_key_func.call(self,name);
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            if(!key){
                conn.del(hash, callback);
            }
            else{
                conn.ZREM(hash, key, callback);
            }
        });
    }
    //获取值
    this.val = function (name,key, callback) {
        var hash = redis_key_func.call(self,name);
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            conn.zscore(hash, key, callback);
        });
    }
    //递增值
    this.incr = function (name,key,val,callback) {
        var hash = redis_key_func.call(self,name);
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            conn.zincrby(hash, val,key,callback);
        });
    }
    //按名次分段获取
    this.rangeByOrder = function (name,start,end,WITHSCORES,callback) {
        if(typeof WITHSCORES == 'function'){
            callback = WITHSCORES;
            WITHSCORES = null;
        }
        var hash = redis_key_func.call(self,name);
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            if(self.order == 'desc' && WITHSCORES){
                conn.zrevrange(hash, start, end, 'WITHSCORES',callback);
            }
            else if(self.order == 'desc' && !WITHSCORES){
                conn.zrevrange(hash, start, end, callback);
            }
            else if(self.order == 'asc' && WITHSCORES){
                conn.zrange(hash, start, end, 'WITHSCORES',callback);
            }
            else{
                conn.zrange(hash, start, end,callback);
            }
        });
    }
    //按积分分段获取
    this.rangeByScore = function (name,min,max,WITHSCORES,limit, offset, count,callback) {
        var args = Array.from(arguments);
        args[0] = redis_key_func.call(self,args[0]);
        var cb = args.pop();
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            if(self.order == 'desc' ){
                conn.zrevrangebyscore(args,cb);
            }
            else{
                conn.zrangebyscore(args,cb);
            }
        });
    }

    this.size = function(name,callback){
        var hash = redis_key_func.call(self,name);
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            else{
                conn.zcard(hash, callback);
            }
        });
    }
};

var redis_string = function(PoolKey,Prefix) {
    "use strict"
    var self = this;
    redis_init_func.call(self,PoolKey,Prefix);

    this.get = function (key, callback) {
        this.conn(function(err,conn) {
            if (err) {
                return callback(err, conn);
            }
            var rkey = redis_key_func.call(self,key);
            if (Array.isArray(rkey)) {
                conn.MGET(rkey, callback);
            }
            else {
                conn.GET(rkey, callback);
            }
        });
    }

    this.set = function (key, val) {
        if(arguments.length == 1){
            var expire = 0, callback = $.callback;
        }
        else if(arguments.length == 2){
            var expire = 0, callback = typeof val == 'function' ? val : $.callback;
        }
        else if(arguments.length == 3 ){
            var expire = 0, callback = arguments[2];
        }
        else if(arguments.length == 4 ){
            var expire = arguments[2], callback = arguments[3];
        }

        //获取CONN
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function(err,conn){
            if(err){
                return callback(err,conn);
            }
            if (typeof(key) === 'object') {
                var data = {};
                for (var k in key) {
                    var rk = redis_key_func.call(self,k);
                    data[rk] = typeof key[k] === 'object' ? JSON.stringify(key[k]) : key[k];
                }
                conn.MSET(data, callback);
            }
            else {
                if (typeof(val) === 'object') {
                    val = JSON.stringify(val);
                }
                var rkey = redis_key_func.call(self,key);
                if(expire){
                    conn.SETEX ( rkey, expire, val, callback);
                }
                else{
                    conn.SET( rkey, val, callback);
                }
            }
        });
    }

    this.del = function (key, callback) {
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function(err,conn){
            if(err){
                return callback(err,conn);
            }
            else {
                var rkey = redis_key_func.call(self,key);
                conn.DEL(rkey, callback);
            }
        });
    }

    this.incr = function (key,val,callback) {
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var rkey = redis_key_func.call(self,key);
            conn.INCR(rkey,val,callback);
        });
    }

    this.decr = function (key,val,callback) {
        var connkey = self._RedisMulti ? 'multi' : 'conn';
        self[connkey](function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var rkey = redis_key_func.call(self,key);
            conn.DECR(rkey,val,callback);
        });
    }
};

//==============================prototype=====================================//
redis_hash.prototype   = redis_prototype_object;
redis_zset.prototype   = redis_prototype_object;
redis_string.prototype = redis_prototype_object;