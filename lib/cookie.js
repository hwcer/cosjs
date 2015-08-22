var querystring = require('querystring');

var config = require("../config");
var library = require('./cosjs');

exports.create  = function(req, res){
    return new cookie(req, res);
}


var cookie = function (req, res) {
    var self  = this,
        setting = config["cookie"],
        nowTime = new Date().getTime(),
        oauthKey = "$coskey";

    this.dataset = new library.dataset();

    var createOauth = function(){
        var arr = [];
        setting['key'].forEach(function(k){
            var v =  self.dataset.get(k);
            arr.push(k+'='+v);
        });
        arr.push(config["secret"]);
        return library.md5(arr.join('&')).substr(0,16);
    }
    // Serialize the given object into a cookie string.
    var serializeCookie = function (key, val) {
        var pairs = [];
        if (val === null || val === false) {
            pairs.push(key + "=''");
            var expires = (setting["expires"] + 86400) * -1;
        }
        else {
            pairs.push(key + '=' + encodeURIComponent(val));
            var expires = setting["expires"];
        }

        if (setting["domain"]) pairs.push('domain=' + setting["domain"]);
        if (setting["path"]) pairs.push('path=' + setting["path"]);
        if (expires) {
            var time = nowTime + expires * 1000;
            var date = new Date(time);
            var expiresDate = date.toGMTString();
            pairs.push('expires=' + expiresDate);
        }
        if (setting["httpOnly"]) pairs.push('httpOnly');
        return pairs.join('; ');
    }
    //parse Cookie
    var parseCookie = function () {
        if (req.headers.cookie) {
            self.dataset.reset( querystring.parse(req.headers.cookie,'; ','=') );
        }
        if( !setting['key'] ){
            return true;
        }
        var usrOauth = self.dataset.get(oauthKey) || null;
        if(!usrOauth){
            return self.dataset.reset();
        }
        var cosOauth = createOauth();
        if(usrOauth != cosOauth){
            return self.dataset.reset();
        }
    }

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
        if( setting['key'] ){
            var oauthVal = createOauth();
            self.dataset.set(oauthKey,oauthVal);
            cookieData.push(serializeCookie(oauthKey, oauthVal));
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
        return self.dataset.get(keys);
    }


    this.del = function (keys) {
        var delKeys = keys || setting['key'] || self.dataset.keys();
        var cookieData = [];
        delKeys.forEach(function(k){
            cookieData.push(serializeCookie(k, null));
        });
        self.dataset.del(keys);
        return saveCookie(cookieData);
    }

    parseCookie();

}
