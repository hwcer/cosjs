"use strict";
const crypto = require('crypto');

//session 加密
function session_crypto(secret){
    if (!(this instanceof session_crypto)) {
        return new session_crypto(secret)
    }
    this.secret = secret;
    this.garbled = 6;
    this.cipherType = 'aes-128-cfb';
}

module.exports  = session_crypto;


session_crypto.prototype.encode = function sessionEncode(str){
    let garbledStr = randomString(this.garbled);
    let newSecret = [this.secret,garbledStr].join('');
    let cipher  = crypto.createCipher(this.cipherType,newSecret);
    let encStr  = cipher.update(str, "utf8", "hex");
    encStr += cipher.final("hex");
    return garbledStr + encStr.toString();
}

session_crypto.prototype.decode =  function sessionDecode(str){
    str = String(str);
    let newStr,decrypted,garbledStr;

    newStr = str.substr(this.garbled);
    garbledStr = str.substr(0,this.garbled);
    try {
        let newSecret = [this.secret, garbledStr].join('');
        let decipher = crypto.createDecipher(this.cipherType, newSecret);
        decrypted = decipher.update(newStr, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
    }
    catch (e){
        decrypted = null;
    }
    return decrypted;
}

function randomString(len) {
    len = len || 10;
    var $chars = "abcdefghijklmnopqrstuvwxyz1234567890";
    var maxPos = $chars.length;
    var pwd = '';
    for (let i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}