var querystring = require('querystring');

exports.config = {
    "path":"/",
    "domain":null,
    "httpOnly":false,
    "secure":false,
    "expires":0,  //单位秒

    "oauth":false,
    "oauth_id":'$oauth',
    "oauth_key":[]
};

exports.create = function(req, res){
    return new cookie(req, res);
}

var cookie = function (req, res) {
    var self  = this,
        cache = {},
        setKeys = [],
        config = exports.config,
        $nowTime = new Date().getTime();

    this.error = null;
    this.oauth = false;

    var error = function(msg){
        self.error = msg;
        return false;
    }

    var createOauth = function(){
        var arr = [];
        config['oauth_key'].forEach(function(k){
            var v = $.dataSelect(cache,k);
            arr.push(k+'='+v);
        });
        arr.push(config.oauth);
        return $.md5(arr.join('&'));
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
            var expires = parseInt(config.expires);
        }

        if (config.domain) pairs.push('domain=' + config.domain);
        if (config.path) pairs.push('path=' + config.path);
        if (expires) {
            var time = $nowTime + expires * 1000;
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
        if (!req.headers.cookie) {
            return false;
        }
        cache = querystring.parse(req.headers.cookie,'; ','=');
    };

    var saveCookie = function(){
        if(setKeys.length==0){
            return false;
        }
        var $cookie = [];
        setKeys.forEach(function(k){
            var v = $.dataSelect(cache,k);
            $cookie.push(serializeCookie(k, v));
        });
        //认证信息
        if(config.oauth){
            $cookie.push(serializeCookie(config['oauth_id'], createOauth() ));
        }
        return res.setHeader("Set-Cookie", $cookie);
    }

    var setCookie = function(k,v){
        cache[k] = v;
        setKeys.push(k);
    }

    var checkOauth =function(){
        if( !config.oauth || self.oauth){
            return true;
        }
        self.oauth = true;
        var oauth = $.dataSelect(cache,config['oauth_id']);

        if(!oauth){
            return error("oauth not exist");
        }

        var sign = createOauth();
        if(oauth!=sign){
            return error("oauth error");
        }
        return true;
    }

    this.get = function (keys) {
        if(!checkOauth()){
            return false;
        }
        return $.dataSelect(cache, keys);
    }

    this.set = function (key, val) {
        if(typeof key=='object'){
            for (var k in key) {
                setCookie(k,key[k]);
            }
        }
        else{
            setCookie(key,val);
        }
        return saveCookie();
    }

    this.del = function (key) {
        setCookie(key,null);
        return saveCookie();
    }


    parseCookie();

}