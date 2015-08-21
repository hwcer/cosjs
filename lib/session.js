var querystring = require('querystring');
var config = require("../config");
var library = require('./library');

exports.create  = function(req, res){
    return new session(req, res);
}

var session = function (req, res) {
    var self = this,
        setting = config["session"],
        crypto = new _crypto(config['secret']),
        isLock = false,
        nowtime = new Date().getTime(),
        lock_key  = '_sessionLock',       //进程锁Key
        oauth_key = '_sessionOauth';

    this.id = '';       //session id
    this.key = '';      //user id
	this.lock = setting['lock'];
    this.oauth = false;
    this.dataset = new library.dataset();
	
    var conn;

    var start = function(){
        var dbase = typeof setting['dbase'] == 'function' ? setting['dbase'](res['cosjs']) : setting['dbase'];
        switch (setting['dtype']){
            case "redis":
                conn = new _redis(dbase);
                break;
            case "mongo":
                conn = new _mongo(dbase);
                break;
            case "object":
                conn = dbase;
                break;
            default :
                break;
        }
        self.id = res['cosjs']['get'](setting['id']) || '';

        if(!self.id){
            return false;
        }
        self.key = crypto.decode(self.id);
    }

    //检查数据有效性
    var getData = function (keys,callback) {
        this.oauth = true;

        if( !self.id ){
            return callback('login_failed','session_id_error');
        }
        if( !self.key ){
            return callback('login_failed','session_key_error');
        }
        var reqKey ;
        if(!keys){
            reqKey = null;
        }
        else if(Array.isArray(keys)){
            reqKey = library.clone(keys);
            reqKey.push(lock_key);
            reqKey.push(oauth_key);
        }
        else{
            reqKey = [keys];
            reqKey.push(lock_key);
            reqKey.push(oauth_key);
        }

        conn.get(self.key,reqKey,function(err,ret){
            if(err){
                return callback(err,ret);
            }
            else if(!ret){
                return callback('login_failed','session_not_exist');
            }
            self.dataset.reset(ret);
            var id = self.dataset.get(oauth_key);
            if ( id != self.id ) {
                return callback("login_failed","session_id_illegal");
            }
            if(self.dataset.get(lock_key) >0){
                return callback("session_busy");
            }
            //续约
            if(setting['expires']){
                var expires = setting['expires'] + nowtime;
                conn.expires(self.key,expires);
            }
            if(self.lock){
                conn.incr(self.key,lock_key,1,function(err,ret){
                    if(err){
                        return callback(err,ret);
                    }
                    else if(ret > 1){
                        return callback("session_busy");
                    }
                    else{
                        isLock = true;
                        return callback(null, self.dataset.get(keys) );
                    }
                });
            }
            else{
                return callback(null, self.dataset.get(keys) );
            }

        });
    }
    //创建session
    this.create = function (uid,data,callback) {
        if(typeof callback != 'function'){
            callback = library.callback;
        }
        self.id = crypto.encode(uid);
        self.key = crypto.key;
        if(!self.id){
            return callback('cookie_uid_error');
        }
        data[lock_key] = 0;
        data[oauth_key] = self.id;
        conn.add(self.key,data,function(err,ret){
            if(err){
                return callback(err,ret);
            }
            self.dataset.set(data);
            return callback(null,self.id);
        });
    }
    //写入数据，不会修改session,可用于临时缓存
    this.set = function (key,val,callback) {
        if(typeof val == 'function'){
            callback = val;
            val = null;
        }
        else if(typeof callback != 'function'){
            callback = library.callback;
        }
        if(!self.key){
            return callback('session_empty');
        }
        conn.set(self.key,key,val,function(err,ret){
            if(!err){
                self.dataset.set(key,val);
            }
            return callback(err,ret);
        });
    }

    //获取一个或者多个在session中缓存的信息
    this.get = function (keys,callback) {
        if(!this.oauth){
            return getData(keys,callback);
        }
        else{
            return callback(null, self.dataset.get(keys) );
        }
    }
    //删除一个或者多个在session中缓存的信息，keys==null,删除所有信息，退出登录
    this.del = function(keys,callback){
        if(typeof keys == 'function'){
            callback = keys;
            keys = null;
        }
        else if(typeof callback != 'function'){
            callback = library.callback;
        }
        if(!self.key){
            return callback('session_empty');
        }
        conn.del(self.key,keys,function(err,ret){
            if(!err){
                self.dataset.del(keys);
            }
            return callback(err,ret);
        });
    }
    //结束进程时调用，系统自动调用
    this.finish = function(){
        if(!isLock){
            return ;
        }
        conn.set(self.key,lock_key,0);
    }

    start();
}

var _crypto = function(secret){
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
            this.key = library.md5(str);
        }
        var code = library.md5(library.roll(1000,9999).toString()).substr(0,secrlen);
        var skey = library.md5(code + this.secret);

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
        var skey  = library.md5(code + this.secret);
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

//redis
var _redis = function (dbase) {
    if(!dbase){
        throw new Error("[session] redis setting dbase empty") ;
    }
    var conn = library.redis(dbase,'hash');


    this.hash = function (hash) {
        return ['session',hash].join('|') ;
    }

    this.add = function (hash, data, callback) {
        var realhash = this.hash(hash);
        conn.set(realhash, data, callback);
    }

    this.get = function (hash, keys, callback) {
        var realhash = this.hash(hash);
        conn.get(realhash, keys, callback);
    }

    this.set = function (hash, key, val, callback) {
        if(typeof val=='function'){
            callback = val;
            val = null;
        }
        else if(typeof callback != 'function'){
            callback = library.callback;
        }
        var realhash = this.hash(hash);
        conn.set(realhash, key, val, callback);
    }

    this.del = function (hash, keys, callback) {
        var realhash = this.hash(hash);
        conn.del(realhash, keys, callback);
    }

    this.incr = function (hash, key, val, callback) {
        if(typeof callback != 'function'){
            callback = library.callback;
        }
        var realhash = this.hash(hash);
        conn.incr(realhash, key, val, callback);
    }

    this.expire = function (hash, expire, callback) {
        var realhash = this.hash(hash);
        conn.expire(realhash, expire, callback);
    }


}
//mongo
var _mongo = function (dbase) {
    if(!dbase){
        throw new Error("[session] mongo setting dbase empty") ;
    }

    var conn = library.mongo(dbase,null,'cookie');

    var getFields = function(keys){
        var fields = {};
        if(Array.isArray(keys)){
            keys.forEach(function(k){
                fields[k] = 1;
            });
        }
        else if(keys){
            fields[keys] = 1;
        }
        return fields;
    }

    this.add = function (id, data, callback) {
        var query = {"_id":id};
        var update = data;
        var option = {"upsert": true,"multi":false};
        update["_id"] = id;
        conn.set(query ,update, option, callback);
    }

    this.get = function (id, keys, callback) {
        var query = {"_id":id};
        var fields = getFields(keys);
        var option = {'fields':fields,"multi":false};
        conn.get(query, option, callback);
    }

    this.set = function (id, key, val, callback) {
        if(typeof val=='function'){
            callback = val;
            val = null;
        }
        else if(typeof callback != 'function'){
            callback = library.callback;
        }
        var query = {"_id":id};
        var update = {}
        if(typeof key == 'object'){
            update = key;
        }
        else{
            update[key] = val;
        }
        var option = {"upsert": false,"multi":false};
        conn.set(query,update,option, callback);
    }

    this.del = function (id, keys, callback) {
        var query = {"_id":id};
        var option = {"single":true};
        conn.del(query, option, callback);
    }

    this.incr = function (id, key, val, callback) {
        if(typeof val=='function'){
            callback = val;
            val = null;
        }
        else if(typeof callback != 'function'){
            callback = library.callback;
        }
        var query = {"_id":id};
        var update = {}
        if(typeof key == 'object'){
            update = key;
        }
        else{
            update[key] = val;
        }
        var retValue = function(ret){
            if(typeof key == 'object'){
                return ret;
            }
            else{
                return ret[key] || 0;
            }
        }
        var fields = getFields(keys);
        var option = {"upsert":true,"multi":false,"fields":fields };
        conn.incr(query, update, option, function(err,ret){
            if(err){
                return callback(err,ret);
            }
            else{
                return retValue(ret);
            }
        });
    }

    this.expire = function (id, expire, callback) {
        return this.set(id,'expire',expire,callback);
    }


}