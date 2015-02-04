/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var redis = require("redis");
var client = {};
//redis.debug_mode = true;
var delayTime  = 100;
var delayNums = 10;
//redis 缓冲池
exports.conn=function(config, callback) {
    if(!config){
        return callback('redis_config_error');
    }

    var key      = $.md5(config),
        options  = {"retry_max_delay":10000},
        delayCurrNums = delayNums;

    var delayConn = function () {
        delayCurrNums --;
        setTimeout(returnConn, delayTime);
    }
    var createConn = function(){
        client[key] = {"ready":false,"ready_check": $.callback};
        var dbc = config.split(':');
        var conn = redis.createClient(dbc[1], dbc[0],options);
        conn.on("error", function (err) {
            console.log(err.message);
        });
        conn.on("connect", function () {
            console.log('redis[' + config + '] connection success');
        });
        conn.on("end", function () {
            console.log('redis[' + config + '] end');
        });
        client[key] = conn;
        return conn;
    }

    var returnConn = function(){
        var conn = client[key] ? client[key] : createConn();
        if(!conn.ready && delayCurrNums <= 0){
           callback('redis_connected_failure');
        }
        else if( !conn.ready && delayCurrNums == delayNums ){
            conn.ready_check();
            delayConn();
        }
        else if( !conn.ready ){
            delayConn();
        }
        else{
            callback(null,conn);
        }
    }

    returnConn();

}


exports.hash=function($config) {
    var self = this;
    var $conn;

    this.format = false;

    this.conn = function (callback) {
        if($conn){
            return callback(null, $conn);
        }
        exports.conn($config, function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            $conn = ret;
            return callback(null, $conn);
        });
    }

    this.get = function (hash, key, callback) {
        if (typeof key === 'function') {
            callback = key;     //hgetall(hash,callback);
            key = null;
        }
        this.conn(function(err,conn) {
            if (err) {
                return callback(err, conn);
            }
            if (!key) {
                hgetall(conn,hash, callback);
            }
            else if (Array.isArray(key)) {
                hmget(conn,hash, key, callback);
            }
            else {
                hget(conn,hash, key, callback);
            }
        });
    }

    this.set = function (hash, key, val, expire, callback) {
        var conn;
        if (typeof expire === 'function') {
            callback = expire;
            expire = 0;
        }
        else if (typeof val === 'function') {
            callback = val;
            val = null;
        }
        else if (!callback) {
            callback = function () {};
        }

        var result = function (err, data) {
            if (err) {
                return callback(err, data);
            }
            if (expire > 0) {
                conn.EXPIRE(hash, expire);
            }
            return callback(false, data);
        }

        var doSet = function(){
            if (typeof(key) === 'object') {
                var rows = {};
                for (var k in key) {
                    if (typeof key[k] === 'object') {
                        rows[k] = JSON.stringify(key[k]);
                    }
                    else {
                        rows[k] = key[k];
                    }
                }
                conn.hmset(hash, rows, result);
            }
            else {
                if (typeof(val) === 'object') {
                    val = JSON.stringify(val);
                }
                conn.hset(hash, key, val, result);
            }
        }
        //获取CONN
        this.conn(function(err,ret){
            if(err){
                return callback(err,ret);
            }
            conn = ret;
            doSet();
        });
    }

    this.del = function (hash, key, callback) {
        var conn;
        if (typeof key === 'function') {
            callback = key;
            key = null;
        }
        else if (!callback) {
            callback = function () {};
        }

        var doDel = function() {
            if (!key) {
                conn.del(hash, callback);
            }
            else if (Array.isArray(key)) {
                key.forEach(function (k) {
                    conn.hdel(hash, k);
                });
                callback(false, key.length);
            }
            else {
                conn.hdel(hash, key, callback);
            }
        }

        this.conn(function(err,ret){
            if(err){
                return callback(err,ret);
            }
            conn = ret;
            doDel();
        });
    }

    this.incr = function (hash, key,num,callback) {
        if (!callback) {
            callback = $.callback;
        }

        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
            conn.hincrby(hash,key,num,callback);
        });
    }

    this.exists = function (hash, key, callback) {
        if(typeof key ==='function'){
            callback = key;
        }
        else if (!callback) {
            callback = function () {};
        }
        this.conn(function(err,conn){
            if(err){
                return callback(err,conn);
            }
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