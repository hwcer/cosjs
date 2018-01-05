"use strict";
const crypto = require('crypto');


exports.md5 = function (str){
    var _encrymd5 = crypto.createHash('md5');
    _encrymd5.update(str.toString(),'utf8');
    return _encrymd5.digest('hex');
}

//签名
exports.sign = function (args,secret,length) {
    var arr = [];
    var keys = Object.keys(args).sort();
    for(let k of keys){
        arr.push( k+"="+args[k]);
    }
    arr.push(secret);
    var str = arr.join('&');
    return exports.md5(str).substr(0,length||32);
}


function base64(map){
    if (!(this instanceof base64)) {
        return new base64(map)
    }
    this._map = map||'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
}

exports.base64 = base64;

base64.prototype.encode = function base64Encode(input, utf8) {
    var o = "";
    var c1, c2, c3, e1, e2, e3, e4;
    for(var i = 0; i < input.length; ) {
        c1 = input.charCodeAt(i++);
        c2 = input.charCodeAt(i++);
        c3 = input.charCodeAt(i++);
        e1 = c1 >> 2;
        e2 = (c1 & 3) << 4 | c2 >> 4;
        e3 = (c2 & 15) << 2 | c3 >> 6;
        e4 = c3 & 63;
        if (isNaN(c2)) { e3 = e4 = 64; }
        else if (isNaN(c3)) { e4 = 64; }
        o += this._map.charAt(e1) + this._map.charAt(e2) + this._map.charAt(e3) + this._map.charAt(e4);
    }
    return o;
}

base64.prototype.decode = function base64Decode(input, utf8) {
    var o = "";
    var c1, c2, c3;
    var e1, e2, e3, e4;
   //input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    for(var i = 0; i < input.length;) {
        e1 = this._map.indexOf(input.charAt(i++));
        e2 = this._map.indexOf(input.charAt(i++));
        e3 = this._map.indexOf(input.charAt(i++));
        e4 = this._map.indexOf(input.charAt(i++));
        c1 = e1 << 2 | e2 >> 4;
        c2 = (e2 & 15) << 4 | e3 >> 2;
        c3 = (e3 & 3) << 6 | e4;
        o += String.fromCharCode(c1);
        if (e3 != 64) { o += String.fromCharCode(c2); }
        if (e4 != 64) { o += String.fromCharCode(c3); }
    }
    return o;
}