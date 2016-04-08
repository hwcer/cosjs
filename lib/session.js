/**
 * config:session配置
 * config.lock 用户进程锁, 默认:false(关闭),格式:[num,ms,reload],
 * config.lock = [10,500,1]
 * 仅当在session存放用户cache时才有必要将reload设置为 true
 *
 */

exports = module.exports = function(options) {
    return function (req, res, next) {
        Object.defineProperty(req, "session", { value : new session(req, res, options),  writable : false, configurable : false, enumerable :true  });
        next();
    }
}

var session = function ( req, res, options) {
    "use strict"
    var self = this,
        _sid,_uid,_store,_crypto,_delayNum = 0,
        _isStart = false,_isLock = false,_isClose = false;

    var config = Object.extend({
        id:"sessid",
        type:"cookies",   //session id 获取方式
        lock:false,
        store:null,
        fields:null,         //获取SESSION时默认获取的字段
        secret:"cosjs",
        prefix:"session",
        SKey:'_sessKey',
        LKey:'_lockKey',
        expire:0
    },options);


    this.config = function(key,val){
        if(arguments.length==2){
            config[key] = val;
        }
        else{
            return config[key] || null;
        }
    }

    this.lock = function(val){
        config['lock'] = val;
    }
    //写入数据，不会修改session,可用于临时缓存
    this.set = function (key,val,callback) {
        var uid = self.uid();
        if(!uid){
            return callback('logout','session id empty');
        }
        var store = self.store();
        store.set(uid,key,val,callback);
    }
    //获取一个或者多个在session中缓存的信息
    this.get = function (keys,callback) {
        if(arguments.length==1){
            var fields = config['fields'];
            callback = arguments[0];
        }
        else{
            var fields = Array.isArray(keys) ? keys : [keys];
            if(config['fields']){
                fields = fields.concat(config['fields']);
            }
        }

        var uid = self.uid();
        if(!uid){
            return callback('logout','session id empty');
        }

        var store = self.store();
        if(_isStart){
            store.get(uid,fields,callback);
        }
        else{
            start(store,uid,fields,callback);
        }
    }
    //删除一个或者多个在session中缓存的信息，keys==null,删除所有信息，退出登录
    this.del = function(keys,callback){
        var hash = self.key();
        if(!hash){
            return callback('logout','session id empty');
        }
        var store = self.store();
        store.del(hash,keys,callback);
    }
    //创建session
    this.create = function (uid,data,callback) {
        var crypto = self.crypto();
        var id = crypto.encode(uid);
        if(!id){
            return callback('error','create session id error');
        }
        _sid = id;
        _uid = uid;
        var store = self.store();
        var newData = Object.clone(data);
        newData[config['SKey']] = id;
        newData[config['LKey']] = 0;
        store.set(uid,newData,function(err,ret){
            if(err){
                return callback(err,ret);
            }
            //自动创建cookie
            if(config['type']=='cookies'){
                res.cookie(config['id'], id, { maxAge: config['expire'] * 1000, httpOnly: true });
            }
            _isStart = true;
            return callback(null,id);
        });
    }


    //获取并检查session id
    this.sid = function () {
        if(_sid || _sid===null){
            return _sid;
        }
       return _sid = params(config['id'],config['type']);
    }
    //获取uid
    this.uid = function(){
        if(_uid){
            return _uid;
        }
        var sid = self.sid();
        if(!sid){
            return null;
        }
        var crypto = self.crypto();
        _uid = crypto.decode(sid);
        return _uid;
    }

    this.store = function () {
        if(_store){
            return _store;
        }
        var store = config['store'];
        if(!store){
            throw new Error('session config[store] empty');
        }
        if(typeof store == 'function'){
            _store = store(req,res);
        }
        else if(typeof store == 'object'){
            _store = store;
        }
        else{
            _store = require('./redis').hash(store,config['prefix']);
        }
        return _store;
    }

    this.crypto = function(){
        if(_crypto){
            return _crypto;
        }
        _crypto = new session_crypto(config['secret']);
        return _crypto;
    }

    var params = function(key,querykey){
        var getVal = function(k){
            if(!req[k]){
                return null;
            }
            else{
                return req[k][key] || null;
            }
        }

        if(!querykey){
            return null;
        }
        if(!Array.isArray(querykey)){
            querykey = [querykey];
        }

        for(var i in querykey){
            var v = getVal(querykey[i]);
            if(v !== null){
                return v;
            }
        }
        return null;
    }
    //解锁session
    var unlock = function(){
        if(!_isLock){
            return false;
        }
        _isLock = false;
        var uid = self.uid();
        if(!uid){
            return false;
        }
        var store = self.store();
        store.set(uid,config['LKey'],0,function(){});
    }
    //启动并验证SESSION
    var start = function(store,uid,keys,callback){

        res.on('close',function(){  _isClose = true; unlock(); });
        res.on('finish',unlock);

        var data;
        var sid = self.sid();
        if(!sid){
            return callback('logout','session id empty');
        }
        var Check = function(){
            store.incr(uid, config['LKey'], 1, function (err, ret) {
                if (err) {
                    callback(err, ret);
                }
                else if (ret > 1) {
                    Delay();
                }
                else {
                    _isLock = true;
                    _isClose ? unlock() : Result();
                }
            });
        }

        var Delay = function(){
            _delayNum ++;
            if( _delayNum >= config['lock'][0] ){
                callback("locked",_delayNum);
            }
            else{
                setTimeout(Check,config['lock'][1]);
            }
        }

        var Result = function(){
            if( _delayNum > 0 && config['lock'][2] ){
                start(store,uid,keys,callback);   //数据失去时效,其他程序已经修改过session和cache,重新获取数据[仅cache和session放在一起时使用]
            }
            else{
                callback(null, data);
                if(config['expire']){
                    store.expire(uid,config['expire'],function(){});
                }
            }
        }

        keys.push(config['SKey']);
        keys.push(config['LKey']);
        store.get(uid, keys, function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            else if (!ret) {
                return callback('logout', 'session not exist');
            }

            var ret_SVal = ret[config['SKey']]||'';
            var ret_LVal = ret[config['LKey']]||0;
            delete ret[config['SKey']];
            delete ret[config['LKey']];
            data = ret;
            if ( !ret_SVal || sid != ret_SVal) {
                return callback("logout", "session id illegal");
            }
            _isStart = true;  //已经验证用户SESSION有效
            if(!config['lock']){
                return Result();
            }

            if (ret_LVal > 0) {
                Delay();
            }
            else{
                Check();
            }
        });
    }

}




var session_crypto = function(secret){
    var codestr = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var codearr = {};
    var codelen = codestr.length;
    var secrlen = 4;

    for(var i=0;i<codelen;i++){
        var k = codestr[i];
        codearr[k] = i;
    }

    this.key = '';

    this.secret = secret||'';

    this.encode = function(str) {
        if( isSafe(str) ){
            this.key = str;
        }
        else{
            this.key = String.md5(str);
        }
        var code = String.md5( parseInt(Math.random()* 1000).toString()).substr(0,secrlen);
        var skey = String.md5(code + this.secret);

        var arr = [];
        var len = this.key.length;
        for(var i =0;i<len;i++){
            var s1 = this.key[i];
            var m = i % secrlen;
            var s2 = skey[m];
            var n = codearr[s1] + codearr[s2];
            if(n >= codelen){
                n -= codelen;
            }
            arr.push(codestr[n]);
        }
        return code + arr.join('');
    }

    this.decode = function(str) {
        if(!isSafe(str)){
            return false;
        }
        var code  = str.substr(0,secrlen);
        var skey  = String.md5(code + this.secret);
        var secr  = str.substr(secrlen);

        var arr = [];
        var len = secr.length;
        for(var i =0;i<len;i++){
            var s1 = secr[i];
            var m = i % secrlen;
            var s2 = skey[m];
            var n = codearr[s1] - codearr[s2];
            if(n < 0){
                n += codelen;
            }
            arr.push(codestr[n]);
        }
        this.key = arr.join('');
        return this.key;
    }

    var isSafe = function(str){
        var len = str.length;
        for(var i=0;i<len;i++){
            var s = str[i];
            if(codearr[s] === undefined){
                return false;
            }
        }
        return true;
    }
}

