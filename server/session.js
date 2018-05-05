﻿/**
 * config:session配置
 * config.lock 用户进程锁, 默认:false(关闭),格式:[num,ms,reload],
 * config.lock = [10,500,1]
 * 仅当在session存放用户cache时才有必要将reload设置为 true
 *
 */
"use strict";
const cosjs_lib            = require('../library');
const cosjs_redis           = cosjs_lib.require('redis').hash;
const cosjs_format          = cosjs_lib.require('format').parse;

const SESSION_KEY    = '$SKey';
const SESSION_LOCK   = '$SLock';
const SESSION_TIME   = '$STime';

module.exports = function(handle,opts){
    return new session(handle,opts);
}

module.exports.config = {
    key     : "_sid",                             //session id key
    method  : "cookie",                          //session id 存储方式,get,post,path,cookie

    level  : 1,                                //安全等级，0:不验证,1:基本验证,2:基本验证+进程锁,3:基本验证+进程锁+数据绝对一致性
    redis  : null,                             //redis options
    crypto : null,                              //对称加密方式
    secret : 'cosjs session',                 //加密字符串
    prefix : "session",                       //session hash 前缀
    expire : 86400,                             //有效期,S
    lockNum : 5,                                //level >=2 ,被锁定时,累计等待次数,超过此值会返回失败
    lockTime : 200,                             //level >=2 ,被锁定时,每次等待时间
}

function session(handle,opts) {
    this.sid       = '';    //session id
    this.guid      = '';    // user id
    this._delay    = 0;
    this._locked   = 0;
    this._closed   = 0;          //是否已经终止(前端非正常结束)
    this._upsert    = false;
    this._dataset  = null;       //session 数据

    //权限
    if(typeof opts['level'] === 'function'){
        this.level = opts['level'].call(handle);
    }
    else{
        this.level = parseInt(opts['level']);
    }

    Object.defineProperty(this,'opts',{ value: opts, writable: false, enumerable: false, configurable: false,});
    //启动session
    this.start = function(callback){
        if( this.redis ){
            return;
        }
        let _redis_opts = (typeof opts.redis === 'function') ? opts.redis.call(handle) : opts.redis;
        if(!_redis_opts){
            return handle.error("session redis empty");
        }
        let _redis_format = opts["format"]||{};
        _redis_format[SESSION_KEY] = {"type":"string","value":""}
        _redis_format[SESSION_LOCK] = {"type":"number","value":0}
        _redis_format[SESSION_TIME] = {"type":"number","value":0}
        let _redis_hash = new cosjs_redis(_redis_opts,opts.prefix,_redis_format);
        Object.defineProperty(this,'redis',{ value:  _redis_hash, writable: false, enumerable: true, configurable: false,});

        if(this.level < 1){
            return callback(null,null);
        }
        //事件监听
        let session_unlock_bind = session_unlock.bind(this);
        handle.res.on('close',  session_unlock_bind);
        handle.res.on('finish', session_unlock_bind);

        this.sid = handle.get(opts["key"],"string",opts["method"]);
        if( !this.sid ){
            return callback('logout','session id[' + opts["key"] + '] empty');
        }
        this.guid = handle.server.crypto.decode(this.sid);
        if( !this.guid ){
            return callback('logout','sid error');
        }
        get_session_data.call(this,session_start.bind(this,callback));
    }
    //创建session,登录时使用:uid,data,callback
    this.create = function(guid,data,callback){
        this.sid = handle.server.crypto.encode(guid);
        this.guid = guid;

        var newData = Object.assign({},data);
        newData[SESSION_KEY]  = this.sid;
        newData[SESSION_LOCK] = 0;
        this.redis.multi();
        this.redis.set(this.guid,newData,null);
        if(this.opts.expire){
            this.redis.expire(this.guid,this.opts.expire);
        }
        this.redis.save((err,ret)=>{
            if(err){
                return callback(err,ret);
            }
            if( !this.opts.method || ["cookie","all"].indexOf(this.opts.method) >=0 ){
                handle.res.cookie(this.opts.key, this.sid, {});
            }
            this._locked = 0;
            return callback(null,this.sid);
        });
    }
};

//获取一个或者多个在session中缓存的信息
session.prototype.get = function (key,type) {
    if(!this._dataset || !(key in this._dataset) ){
        return null;
    }
    var val = this._dataset[key];
    if(type){
        val = cosjs_format(val,type);
    }
    return val;
};
//写入数据，不会修改session,可用于临时缓存
session.prototype.set = function (key,val) {
    if(!this.guid){
        return false;
    }
    this.redis.multi();
    this._upsert = true;
    if(typeof key === "object"){
        for(let k in key){
            let v = key[k];
            this._dataset[k] = v;
            this.redis.set(this.guid,k,v);
        }
    }
    else{
        this._dataset[key] = val;
        this.redis.set(this.guid,key,val);
    }
};
//删除一个或者多个在session中缓存的信息，keys==null,删除所有信息，退出登录
session.prototype.del = function(key,callback){
    this.redis.del(this.guid,key,callback);
};


function session_start(callback,err,ret){
    if (err) {
        return callback(err, ret);
    }
    let ret_sid = ret[SESSION_KEY]||'';
    let ret_lock = ret[SESSION_LOCK]||0;
    if ( !ret_sid || this.sid !== ret_sid) {
        return callback("logout", "session id illegal");
    }
    if( this.level < 2 ){
        session_result.call(this,callback);
    }
    else if (ret_lock > 0) {
        session_delay.call(this,callback);
    }
    else{
        session_lock.call(this,callback);
    }
};

function get_session_data(callback){
    this.redis.get(this.guid, null,  (err, ret)=> {
        if (err) {
            return callback(err, ret);
        }
        else if (!ret) {
            return callback('logout', 'session not exist');
        }
        else{
            this._dataset = ret;
            return callback(err, ret);
        }
    });
}


function session_lock(callback){
    if(this._closed){
        return session_aborted.call(this,callback);
    }
    this.redis.incr(this.guid, SESSION_LOCK, 1,  (err, ret)=> {
        if (err) {
            callback(err, ret);
        }
        else if (ret > 1) {
            session_delay.call(this,callback);
        }
        else {
            this._locked = 1;
            session_result.call(this,callback);
        }
    });
};

function session_delay(callback){
    if(this._closed){
        return session_aborted.call(this,callback);
    }
    if( this._delay >= this.opts.lockNum ){
        return callback("locked",this._delay);
    }
    this._delay ++;
    setTimeout(()=>{
        session_lock.call(this,callback);
    },this.opts.lockTime);
};

function session_result(callback){
    if(this._closed){
        return session_aborted.call(this,callback);
    }
    if( this.level >=3 && this._locked > 0 && this._delay >0){
        get_session_data.call(this,(err,ret)=> {
            if (err) {
                return callback(err, ret);
            }
            callback(null,this._dataset);
        })
    }
    else{
        callback(null,this._dataset);
    }
};




function session_unlock(){
    if( !this.guid ){
        return false;
    }
    session_reset.call(this);
};

function session_aborted(callback){
    if( !this.guid ){
        return false;
    }
    session_reset.call(this);
    return callback("aborted");
}

function session_reset(){
    if(this._closed){  return; }
    this._closed = 1;
    this.redis.multi();
    if(this._locked){
        this._locked = 0;
        this._upsert = true;
        this.redis.set(this.guid,SESSION_LOCK,0);
    }
    let ttl = Date.now() - this.get(SESSION_TIME);
    if( this.opts.expire > 0 && ttl > (this.opts.expire / 10)*1000 ){
        this._upsert = true;
        this.redis.expire(this.guid,this.opts.expire);
    }
    if(this._upsert){
        this._upsert = false;
        this.redis.save();
    }
}

