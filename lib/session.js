exports = module.exports = function(req, res, next){
    req['session'] = new session(req, res);
    next();
}

var session = function ( req, res) {
    var self = this, app = req.app, sid,uid,conn,crypto,dataset,delayNum = 0;
    var sess_key  = '_sess_key';
    var sess_lock = '_sess_lock';

    this.lock = app.get('session lock');  // [num ms]
    //写入数据，不会修改session,可用于临时缓存
    this.set = function (key,val,callback) {
        start();
        if(!uid){
            return callback('error','session uid empty');
        }
        else{
            conn.set(uid,key,val,callback);
        }
    }
    //获取一个或者多个在session中缓存的信息
    this.get = function (keys,callback) {
        start();
        if(dataset){
            return callback(null, dataset.get(keys) );
        }
        else{
            return getUserData(keys,callback);
        }
    }
    //删除一个或者多个在session中缓存的信息，keys==null,删除所有信息，退出登录
    this.del = function(keys,callback){
        start();
        if(!uid){
            return callback('error','session uid empty');
        }
        conn.del(uid,keys,callback);
    }
    //创建session
    this.create = function (key,data,callback) {
        start();
        sid = crypto.encode(key);
        uid = key || sid;
        if(!sid){
            return callback('error','create session id error');
        }
        var newData = _clone(data);
        newData[sess_key] = sid;
        newData[sess_lock] = 0;
        conn.set(uid,newData,function(err,ret){
            if(err){
                return callback(err,ret);
            }
            return callback(null,sid);
        });
    }
    //解锁session
    var unlock = function(){
        conn.set(uid,sess_lock,0,function(){});
    }

    //获取并检查数据有效性
    var start = function () {
        if(conn){
            return ;
        }
        var secret = app.get('session secret')||'cosjs';
        crypto = new _crypto(secret);

        var id = app.get('session id') || '_id';

        if(!req['body']){
            req['body'] = {};
        }
        if(!req['cookies']){
            req['cookies'] = {};
        }
        sid = req.cookies[id] || req.body[id] || req.query[id] || '';
        if(sid){
            uid = crypto.decode(sid);
        }

        var storage = app.get('session storage');
        if(!storage){
            return callback('error','session storage empty');
        }
        if(typeof storage == 'function'){
            conn = storage(req,res);
        }
        else if(typeof storage == 'object'){
            conn = storage;
        }
        else{
            conn = require('./redis').hash(storage,app.get('session key')||'cookie' );
        }
    }


    var getUserData = function(keys,callback) {
        dataset = require('./dataset')();
        if(!uid){
            return callback('logout','session id error');
        }

        var Check = function(){
            conn.incr(uid, sess_lock, 1, function (err, ret) {
                if (err) {
                    callback(err, ret);
                }
                else if (ret > 1) {
                    Delay();
                }
                else {
                    res.on('finish',unlock);
                    Result();
                }
            });
        }

        var Delay = function(){
            delayNum ++;
            if( delayNum > self.lock[0] ){
                callback("locked",delayNum);
            }
            else{
                setTimeout(Check,self.lock[1]);
            }
        }

        var Result = function(){
            var expire = app.get('session expire');
            if(expire){
                conn.expire(uid,expire);
            }
            if( delayNum > 0 ){
                getUserData(keys,callback);   //数据失去时效,其他程序已经修改过session,重新获取session数据
            }
            else{
                callback(null, dataset.get(keys) );
            }
        }

        var RealKeys = function(keys) {
            if (!keys) {
                return null;
            }
            var realKey = [sess_key,sess_lock];
            if(Array.isArray(keys)) {
                realKey = realKey.concat(keys);
            }
            else {
                realKey.push(keys);
            }
            return realKey;
        }

        conn.get(uid, RealKeys(keys), function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            else if (!ret) {
                return callback('logout', 'session not exist');
            }
            dataset.reset(ret);
            var user_sess_id = dataset.get(sess_key);
            if (user_sess_id != sid) {
                return callback("logout", "session id illegal");
            }
            if(!self.lock){
                return Result();
            }
            var locked = dataset.get(sess_lock);
            if (locked > 0) {
                Delay();
            }
            else{
                Check();
            }
        });
    }

}



var _md5 = function(str){
    var crypto = require('crypto');
    var _encrymd5 = crypto.createHash('md5');
    _encrymd5.update(str);
    return _encrymd5.digest('hex');
}

var _clone = function(source){
    return JSON.parse(JSON.stringify(source));
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
            this.key = _md5(str);
        }
        var code = _md5( parseInt(Math.random()* 1000).toString()).substr(0,secrlen);
        var skey = _md5(code + this.secret);

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
        var skey  = _md5(code + this.secret);
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

