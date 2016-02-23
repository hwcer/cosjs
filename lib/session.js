/**
 * config:session配置
 * config.lock 用户进程锁, 默认:false(关闭),格式:[num,ms,reload],
 * config.lock = [10,500,1]
 * 仅当在session存放用户cache时才有必要将reload设置为 true
 *
 */
var library = require('./library');

exports = module.exports = function(config) {
    return function (req, res, next) {
        req['session'] = new session(req, res, config);
        next();
    }
}

var session = function ( req, res, option) {
    var self = this,
        _id,_key,_store,_crypto,_start = false,
        _delayNum = 0,_isLock = false,_isClose = false;
    var sess_key  = '_sess_key';
    var sess_lock = '_sess_lock';
    var config = Object.extend({ id:"sessid",key:"cookies",lock:false,store:null,secret:"cosjs",prefix:"session",expire:0 },option);
    this.config = function(key,val){
        if(arguments.length==2){
            config[key] = val;
        }
        else{
            return config[key] || null;
        }
    }

    //写入数据，不会修改session,可用于临时缓存
    this.set = function (key,val,callback) {
        var hash = self.key();
        if(!hash){
            return callback('logout','session id empty');
        }
        var store = self.store();
        store.set(hash,key,val,callback);
    }
    //获取一个或者多个在session中缓存的信息
    this.get = function (keys,callback) {
        var hash = self.key();
        if(!hash){
            return callback('logout','session id empty');
        }
        var store = self.store();
        if(_start){
            store.get(hash,keys,callback);
        }
        else{
            start(store,hash,keys,callback);
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
    this.create = function (key,data,callback) {
        var crypto = self.crypto();
        var id = crypto.encode(key);
        if(!id){
            return callback('error','create session id error');
        }
        _id = id;
        var store = self.store();
        var newData = Object.clone(data);
        newData[sess_key] = id;
        newData[sess_lock] = 0;
        store.set(key,newData,function(err,ret){
            if(err){
                return callback(err,ret);
            }
            //自动创建cookie
            if(config['key']=='cookies'){
                res.cookie(config['id'], id, { maxAge: config['expire'] * 1000, httpOnly: true });
            }
            return callback(null,id);
        });
    }


    //获取并检查数据有效性
    this.id = function () {
        if(_id || _id===''){
            return _id;
        }
        var query = req[config['key']]||{};
        _id = query[config['id']] || '';
        return _id;
    }

    this.key = function(){
        if(_key){
            return _key;
        }
        var id = self.id();
        if(!id){
            return null;
        }
        var crypto = self.crypto();
        _key = crypto.decode(id);
        return _key;
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
    //解锁session
    var unlock = function(){
        if(!_isLock){
            return false;
        }
        _isLock = false;
        var hash = self.key();
        if(!hash){
            return callback('logout','session id empty');
        }
        var store = self.store();
        store.set(hash,sess_lock,0,function(err,ret){});
    }
    //启动并验证SESSION
    var start = function(store,hash,keys,callback){

        res.on('close',function(){  _isClose = true; unlock(); });
        res.on('finish',unlock);

        var data;
        var usr_sess_id = self.id();
        if(!usr_sess_id){
            return callback('logout','session id empty');
        }
        var Check = function(){
            store.incr(hash, sess_lock, 1, function (err, ret) {
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
            var expire = config['expire'];
            if(expire){
                store.expire(hash,expire,function(){});
            }
            if( _delayNum > 0 && config['lock'][2] ){
                start(store,hash,keys,callback);   //数据失去时效,其他程序已经修改过session和cache,重新获取数据[仅cache和session放在一起时使用]
            }
            else if(keys && !Array.isArray(keys)){
                callback(null, data[keys]||null );
            }
            else{
                callback(null, data);
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

        store.get(hash, RealKeys(keys), function (err, ret) {
            if (err) {
                return callback(err, ret);
            }
            else if (!ret) {
                return callback('logout', 'session not exist');
            }

            var ret_sess_id = ret[sess_key]||'';
            var ret_sess_locked = ret[sess_lock]||0;
            delete ret[sess_key];
            delete ret[sess_lock];
            data = ret;

            if ( !ret_sess_id || ret_sess_id != usr_sess_id) {
                return callback("logout", "session id illegal");
            }
            _start = true;  //已经验证用户SESSION有效
            if(!config['lock']){
                return Result();
            }

            if (ret_sess_locked > 0) {
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

