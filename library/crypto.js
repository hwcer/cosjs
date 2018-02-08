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
        var v = formatSignValue(args[k]);
        arr.push( k+"="+v);
    }
    arr.push(secret);
    var str = arr.join('&');
    return exports.md5(str).substr(0,length||32);
}

function formatSignValue(v){
    if(Array.isArray(v)){
        return v.join(",");
    }
    else if(typeof v === "object"){
        return JSON.stringify(v);
    }
    else {
        return v;
    }
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


function RSA2(opts){
    if (!(this instanceof RSA2)) {
        return new RSA2(opts)
    }
    this.algorithm  = opts['RSA1'] ? "RSA-SHA128" : "RSA-SHA256";
    if(opts.PublicKey){
        this.PublicKey  = RSA2_verify_certificate(opts.PublicKey,'public');
    }
    if(opts.PrivateKey){
        this.PrivateKey = RSA2_verify_certificate(opts.PrivateKey,'private');
    }

}

exports.RSA2 = RSA2;



RSA2.prototype.sign = function RSA2_sign(params) {
    if(!this.PrivateKey){
        throw new Error("RSA2.sign PrivateKey empty");
    }
    var sign;
    try {
        let signer = crypto.createSign(this.algorithm);
        let prestr = RSA2_link_params(params);
        sign = signer.update(prestr).sign(this.PrivateKey, "base64");
    }
    catch(err) {
        console.log(err)
        sign = false;
    }
    return sign;
};

RSA2.prototype.verify = function verifySign(params, sign) {
    if(!this.PublicKey){
        throw new Error("RSA2.sign PublicKey empty");
    }
    var result;
    try {
        let verify = crypto.createVerify(this.algorithm);
        let prestr = RSA2_link_params(params);
        result = verify.update(prestr).verify(this.PublicKey, sign, "base64");
    }
    catch(err) {
        console.log(err)
        result = false;
    }
    return result;
}


function RSA2_link_params(params) {
    if(typeof params !== "object"){
        return params;
    }
    var keys = Object.keys(params).sort();
    var sPara = [];
    for(let k of keys){
        if(params[k]){
            sPara.push( k+"="+params[k]);
        }
    }
    return sPara.join("&");
}


function RSA2_verify_certificate(key,type){
    if(type === 'private') {
        var S = "-----BEGIN RSA PRIVATE KEY-----";
        var E = "-----END RSA PRIVATE KEY-----";
    }
    else {
        var S = "-----BEGIN PUBLIC KEY-----";
        var E = "-----END PUBLIC KEY-----";
    }
    if(key.substr(0,S.length) !== S ){
        key = S +"\n"+  key +"\n"+ E;
    }
    return key.toString();
}