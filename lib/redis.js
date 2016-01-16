//基于redis的缓存
var pool = require('./pool');
var redisCallback=function(){};

exports.hash = function(poolKey,Prefix){
    return new redis_hash(poolKey,Prefix);
}

exports.zset = function(poolKey,Prefix){
    return new redis_zset(poolKey,Prefix);
}

exports.string = function(poolKey,Prefix){
    return new redis_string(poolKey,Prefix);
}



var redis_hash = function(poolKey,Prefix) {
    var self = this,_conn;

    this.format = false;

    this.conn = function (callback) {
        if(_conn){
            return callback(null, _conn);
        }
        pool.connect(poolKey, function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            _conn = ret;
            return callback(null, _conn);
        });
    }

    this.hash = function (id) {
        if(!Prefix){
            return id;
        }
        else{
            return [Prefix,id].join('|') ;
        }
    }

    this.get = function (id, key, callback) {
        if (typeof key === 'function') {
            callback = key;     //hgetall(hash,callback);
            key = null;
        }

        this.conn(function(err,conn) {
            if (err) {
                return callback(err, conn);
            }
            var hash = self.hash(id);
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
        if (typeof val === 'function') {
            callback = val;
            val = null;
        }
        if(typeof callback != 'function'){
            callback = redisCallback;
        }

        var result = function (err, data) {
            if (err) {
                return callback(err, data);
            }
            return callback(false, data);
        }
        //获取CONN
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var hash = self.hash(id);
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
        if (typeof key === 'function') {
            callback = key;
            key = null;
        }
        else if(typeof callback != 'function'){
            callback = redisCallback;
        }
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var hash = self.hash(id);
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

    this.incr = function (id, key,num,callback) {
        if(typeof callback != 'function'){
            callback = redisCallback;
        }

        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var hash = self.hash(id);
            conn.hincrby(hash,key,num,callback);
        });
    }

    this.expire = function(id,expire,callback){
        if(typeof callback != 'function'){
            callback = redisCallback;
        }
        var time = new Date().getTime() / 1000;
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var cmd = expire >= time ? 'expireat':'expire';
            var hash = self.hash(id);
            conn[cmd](hash, expire, callback);
        });
    }

    this.exists = function (id, key, callback) {
        if(typeof key ==='function'){
            callback = key;
        }
        else if(typeof callback != 'function'){
            callback = redisCallback;
        }
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var hash = self.hash(id);
            if (!key) {
                conn.exists(hash, callback);
            }
            else {
                conn.hexists(hash, key, callback);
            }
        });

    }

    var hget = function (conn,hash, key, callback) {
        conn.hget(hash, key, function (err, data) {
            if (err) {
                return callback(err, data);
            }
            else if (self.format) {
                return callback(false, self.format(data));
            }
            else {
                return callback(false, data);
            }
        });
    }

    var hmget = function (conn,hash, key, callback) {
        conn.hmget(hash, key, function (err, data) {
            if (err) {
                return callback(err, data);
            }
            var rows = {};
            for (var i in key) {
                var k = key[i];
                var v = data[i];
                if (v && self.format) {
                    rows[k] = self.format(v);
                }
                else {
                    rows[k] = v;
                }
            }
            return callback(false, rows);
        });
    }

    var hgetall = function (conn,hash, callback) {
        conn.hgetall(hash, function (err, data) {
            if (err) {
                return callback(err, data);
            }
            if (self.format) {
                var rows = {};
                for (var k in data) {
                    rows[k] = self.format(data[k]);
                }
            }
            else {
                var rows = data;
            }
            return callback(false, rows);
        })
    }
};


var redis_zset=function(poolKey,Prefix) {
    var self = this, _conn;

    this.order = 'desc';

    this.conn = function (callback) {
        if(_conn){
            return callback(null, _conn);
        }
        pool.connect(poolKey, function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            _conn = ret;
            return callback(null, _conn);
        });
    }

    this.hash = function (id) {
        if(!Prefix){
            return id;
        }
        else{
            return [Prefix,id].join('|') ;
        }
    }
    //获取个人排名,-1:未上榜，0：开始
    this.get = function (name, key, callback) {
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            var hash = self.hash(name);
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
        if(typeof callback != 'function'){
            callback = redisCallback;
        }
        var hash = self.hash(name);
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            conn.zadd(hash, val,key, callback);
        });
    }
    //删除排名
    this.del = function (name,key, callback) {
        if(typeof callback != 'function'){
            callback = redisCallback;
        }
        var hash = self.hash(name);
        this.conn(function (err, conn) {
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
        var hash = self.hash(name);
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            conn.zscore(hash, key, callback);
        });
    }
    //递增值
    this.incr = function (name,key,val,callback) {
        if(typeof callback != 'function'){
            callback = redisCallback;
        }
        var hash = self.hash(name);
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            conn.zincrby(hash, val,key,callback);
        });
    }
    //分段获取
    this.range = function (name,start,end,WITHSCORES,callback) {
        if(typeof WITHSCORES == 'function'){
            callback = WITHSCORES;
            WITHSCORES = null;
        }
        var hash = self.hash(name);
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
        args[0] = self.hash(args[0]);
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
        var hash = self.hash(name);
        this.conn(function (err, conn) {
            if (err) {
                return callback(err, conn);
            }
            else{
                conn.zcard(hash, callback);
            }
        });
    }
    //有效期
    this.expire = function(name,expire,callback){
        if(typeof callback != 'function'){
            callback = redisCallback;
        }
        var hash = self.hash(name);
        var time = new Date().getTime() / 1000;
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var cmd = expire >= time ? 'expireat':'expire';
            conn[cmd](hash, expire, callback);
        });
    }
};


var redis_string = function(poolKey,Prefix) {
    var self = this,_conn;

    this.key = function(key){
        if(!Prefix){
            return key;
        }
        else if(Array.isArray(key)){
            var arr=[];
            key.forEach(function(k){
                arr.push([Prefix,k].join('|'));
            });
            return arr;
        }
        else{
            return [Prefix,key].join('|');
        }
    }

    this.conn = function (callback) {
        if(_conn){
            return callback(null, _conn);
        }
        pool.connect(poolKey, function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            _conn = ret;
            return callback(null, _conn);
        });
    }

    this.get = function (key, callback) {
        this.conn(function(err,conn) {
            if (err) {
                return callback(err, conn);
            }
            var rkey = self.key(key);
            if (Array.isArray(rkey)) {
                conn.MGET(rkey, callback);
            }
            else {
                conn.GET(rkey, callback);
            }
        });
    }

    this.set = function (key, val, callback) {
        //获取CONN
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            if (typeof(key) === 'object') {
                var data = {};
                for (var k in key) {
                    var rk = self.key(k);
                    data[rk] = typeof key[k] === 'object' ? JSON.stringify(key[k]) : key[k];
                }
                conn.MSET(data, callback);
            }
            else {
                if (typeof(val) === 'object') {
                    val = JSON.stringify(val);
                }
                var rkey = self.key(key);
                conn.SET( rkey, val, callback);
            }
        });
    }

    this.del = function (key, callback) {
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            else {
                var rkey = self.key(key);
                conn.DEL(rkey, callback);
            }
        });
    }

    this.incr = function (key,val,callback) {
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var rkey = self.key(key);
            conn.INCR(rkey,val,callback);
        });
    }

    this.decr = function (key,val,callback) {
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var rkey = self.key(key);
            conn.DECR(rkey,val,callback);
        });
    }
    //expire:秒
    this.expire = function(key,expire,callback){
        if(typeof callback != 'function'){
            callback = redisCallback;
        }
        var time = new Date().getTime() / 1000;
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            var cmd = expire >= time ? 'expireat':'expire';
            var rkey = self.key(key);
            conn[cmd](rkey, expire, callback);
        });
    }
};

