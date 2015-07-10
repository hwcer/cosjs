var querystring = require('querystring');

var config = require("../config").cookie;

exports.create  = function(req, res){
    return new cookie(req, res);
}


var cookie = function (req, res) {
    var self  = this,
        nowTime = new Date().getTime(),
        oauth_key = '$token';

    this.oauth = false;
    this.dataset = new $.dataset();

    var checkOauth =function(){
        if( self.oauth || !config['key']){
            return true;
        }
        self.oauth = true;
        var oauth = self.dataset.get(oauth_key) || null;
        if(!oauth){
            return false;
        }
        var sign = createOauth();
        if(oauth!=sign){
            return false;
        }
        return true;
    }

    var createOauth = function(){
        var arr = [];
        config['key'].forEach(function(k){
            var v =  self.dataset.get(k);
            arr.push(k+'='+v);
        });
        arr.push(config.secret);
        return $.md5(arr.join('&')).substr(0,16);
    }
    // Serialize the given object into a cookie string.
    var serializeCookie = function (key, val) {
        var pairs = [];
        if (val === null || val === false) {
            pairs.push(key + "=''");
            var expires = (config.expires + 86400) * -1;
        }
        else {
            pairs.push(key + '=' + encodeURIComponent(val));
            var expires = config.expires;
        }

        if (config.domain) pairs.push('domain=' + config.domain);
        if (config.path) pairs.push('path=' + config.path);
        if (expires) {
            var time = nowTime + expires * 1000;
            var date = new Date(time);
            var expiresDate = date.toGMTString();
            pairs.push('expires=' + expiresDate);
        }
        if (config.httpOnly) pairs.push('httpOnly');
        if (config.secure) pairs.push('secure');
        return pairs.join('; ');
    };
    //parse Cookie
    var parseCookie = function () {
        if (req.headers.cookie) {
            self.dataset.reset( querystring.parse(req.headers.cookie,'; ','=') );
        }
    };

    var saveCookie = function(data){
        if(!data || data.length <1){
            return false;
        }
        res.setHeader("Set-Cookie", data);
        return true;
    }
    //创建cookie
    this.create = function (uid,data) {
        var cookieData = [];
        for(var k in data){
            var v = data[k];
            self.dataset.set(k,v);
            cookieData.push(serializeCookie(k,v));
        };
        //认证信息
        if( config['key'] ){
            var oauth_val = createOauth();
            self.dataset.set(oauth_key,oauth_val);
            cookieData.push(serializeCookie(oauth_key, oauth_val));
        }
        return saveCookie(cookieData);
    }
    //设置数据到cookie，不要直接设置安全相关的数据，会导致cookie失效
    this.set = function (key,val) {
        var cookieData = [];
        if(typeof key == 'object'){
            for(var k in key){
                var v = key[k];
                self.dataset.set(k,v);
                cookieData.push(serializeCookie(k,v));
            };
        }
        else{
            self.dataset.set(key,val);
            cookieData.push(serializeCookie(key,val));
        }
        return saveCookie(cookieData);
    }

    this.get = function (keys) {
        if(!checkOauth()){
            return false;
        }
        return self.dataset.get(keys);
    }


    this.del = function (keys) {
        var delKeys = keys || config['key'] || self.dataset.keys();
        var cookieData = [];
        delKeys.forEach(function(k){
            cookieData.push(serializeCookie(k, null));
        });
        self.dataset.del(keys);
        return saveCookie(cookieData);
    }

    parseCookie();

}
