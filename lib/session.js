var crypto  = require('crypto');


var config = {
    "key":"cookie",        //session 在redis中的hash前缀，或者在mongo中的对象名
    "lock":[500,10],        //锁定时间，最大锁定次数,lock=null OR false 不锁定
    "idKey":"$id",          //session id 在cookie或者query中的name
    "idType":"cookie",     //SESSION ID存储方式 ['get','cookie']
    "expires":0,            //单位秒
    "dbase":null
};
exports.config = config;
//cookie
exports.create = function(req,res){
    return new session(req,res);
}

var cookieID={
    "keyLen"  :8,
    "ciphers" :"des",
    "random":function(strlen){
        if(!strlen){
            strlen = cookieID.keyLen;
        }
        var buf = crypto.randomBytes(strlen);
        var str =  buf.toString('hex');
        return str.substr(0,strlen);
    },
    "encode":function(uid) {
        var secret = cookieID.random();
        var cipher = crypto.createCipher(cookieID.ciphers, secret);
        var enc = cipher.update(uid,'utf8','hex');
        enc += cipher.final('hex');
        return secret + enc;
    },
    "decode":function(id) {
        if (!id || id.length <= cookieID.keyLen) {
            return false;
        }
        var secret = id.substr(0, cookieID.keyLen);
        var str = id.substr(cookieID.keyLen);
        try {
            var decipher = crypto.createDecipher(cookieID.ciphers, secret);
            var dec = decipher.update(str, 'hex', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        }
        catch (e){
            return false;
        }
    }
};

var session = function (req,res) {
    var self = this,data=false,
        cache = new redis(req,res),
        lockNum    = 0,
        lockTime   = 0,
        delayNum   = 0,
        lastReqTime = '$lastReqTime';
    //session id
    this.id = '';
    //session key,数据库唯一索引，设置session时必须存在
    this.key = '';

    this.lock = config['lock'];

    var start = function(){
        if(Array.isArray(config['lock'])){
            lockNum = config['lock'][1] || 0;
            lockTime = config['lock'][0] || 0;
        }
        var idType = Array.isArray(config.idType) ? config.idType : [config.idType];
        for(var k in idType){
            var t = idType[k];
            var id = getSessionID(t);
            if(id){
                self.id = id;
                break;
            }
        }
        if(!self.id){
            return false;
        }
        //GET USER ID
        self.key = cookieID.decode(self.id);
        if(!self.key){
            self.id = '';  //无效ID抛弃
        }
        return true;
    }
    //获取cookie对象
    var getCookie = function(){
        if(!res['cookie']){
            res['cookie']= require('./cookie').create(req,res);
        }
        return  res['cookie'];
    }
    //GET COOKIE ID
    var getSessionID = function(type){
        if(type=='cookie'){
            var cookie = getCookie();
            return cookie.get(config.idKey);
        }
        else{
            return $.dataSelect(res.query,config.idKey);
        }
    }

    var updateData = function(key,val){
        if(typeof key=='object'){
            for(var k in key){
                data[k] = key[k];
            }
        }
        else{
            data[key] = val;
        }
    }
    //检查数据有效性
    var getSessionData = function (keys,callback) {
        var success = function($nowTime){
            if( config['expires'] || lockTime > 0  ){
                cache.set(self.key,lastReqTime,$nowTime);
            }
            callback(null, $.dataSelect(data,keys));
        }

        var delay = function () {
            delayNum ++;
            var $Date  = new Date();
            console.log('session delay key: '+self.key+' num: '+delayNum+' time: '+ $.timeFormat('yyyy-mm-dd hh:ii:ss',$Date));
            if ( delayNum > lockNum) {
                return callback('session_locked');
            }
            cache.get(self.key,lastReqTime,function(err,$lastTime){
                if(err){
                    return setTimeout(delay, lockTime);
                }
                var $nowTime = $Date.getTime();
                if( ( $nowTime- $lastTime ) > lockTime){
                    success($nowTime);
                }
                else{
                    setTimeout(delay, lockTime);
                }
            });
        }

        //安全检查
        var check  = function(ret){
            var id = $.dataSelect(ret,config['idKey']);
            if ( id != self.id ) {
                return callback("login_failed","session_id_illegal");
            }
            data = ret;
            //乐观锁
            var $nowTime  = new Date().getTime();
            var $lastTime = $.dataSelect(data,lastReqTime) || $nowTime;

            if ( lockTime > 0 && ( $nowTime - $lastTime) < lockTime ) {
                setTimeout(delay, lockTime);
            }
            else {
                success($nowTime);
            }
        }
        //session id不合法
        if( !self.id || !self.key){
            return callback('login_failed','session_id_error');
        }
        //登录信息不存在
        if(data===null){
            return callback('login_failed','session_not_exist');
        }
        else{
            data = null;
        }

        cache.get(self.key,null,function(err,ret){
            if(err){
                return callback(err,ret);
            }
            else if(!ret){
                return callback('login_failed','cookie_not_exist');
            }
            check(ret);
        });
    }
    //登录
    var createSessionID = function (key,val, callback) {
        if(typeof val == 'function'){
            callback = val;
            val = null;
        }
        else if(typeof callback!='function'){
            callback = $.callback;
        }
        var $nowTime  = new Date().getTime();
        if(!self.key){
            self.key = cookieID.random(16);
        }
        self.id   = cookieID.encode(self.key);
        var info = {};
        if(typeof key == 'object'){
            info = key;
        }
        else{
            info[key] = val;
        }
        info[config.idKey]   = self.id;
        info[lastReqTime] = $nowTime;
        cache.set(self.key,info,function(err,ret){
            if(err){
                return callback(err,ret);
            }
            else{
                if($.inArray(config.idType,"cookie")){
                    var cookie = getCookie();
                    cookie.set(config.idKey,self.id);
                }
                updateData(key,val);
                return callback(false,self.id);
            }
        });
    }

    //在session中写入[缓存]数据，session不存在时自动创建
    this.set = function (key,val, callback) {
        if(!self.id){
            createSessionID(key,val,callback);
        }
        else{
            cache.set(self.key,key,val,function(err,ret){
                if(err){
                    return callback(err,ret);
                }
                else{
                    updateData(key,val);
                    callback(null,self.id);
                }
            });
        }
    }
    //获取一个或者多个在session中缓存的信息
    this.get = function (keys,callback) {
        if(!data){
            return getSessionData(keys,callback);
        }
        else{
            return callback(null, $.dataSelect(data,keys) );
        }
    }
    //删除一个或者多个在session中缓存的信息，keys==null,删除所有信息，退出登录
    this.del = function(keys,callback){
        cache.del(self.key,keys,callback);
    }
    //重设session信息,重新生成sessionID 一般登录时间使用
    this.reset = function(key){
        this.id = '';
        this.key = key ? key : '';
    }
    //设置lockTime
    this.lockTime = function(ms){
        lockTime = ms;
    }
    //初始化
    start();
}



//redis
var redis = function (req,res) {
    var self = this;

    var $dbase = typeof config.dbase == 'function' ?  config.dbase(req,res) : config.dbase;
    if(!$dbase){
        throw "[session] redis config dbase empty" ;
    }
    var conn = $.redis($dbase,'hash');


    var hash = function (uid) {
        return [config.key,uid].join('|') ;
    }

    this.get = function (uid, keys, callback) {
        var $hash = hash(uid);
        conn.get($hash, keys, callback);
    }

    this.set = function (uid, key, val, callback) {
        if(typeof val=='function'){
            callback = val;
            val = null;
        }
        else if(typeof callback != 'function'){
            callback = $.callback;
        }
        var $hash = hash(uid);
        conn.set($hash, key, val, config.expires,callback);
    }

    this.del = function (uid, keys, callback) {
        var $hash = hash(uid);
        conn.del($hash, keys, callback);
    }

}