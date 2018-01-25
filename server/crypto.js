"use strict";
const crypto = require('crypto');


function md5(str){
    var _encrymd5 = crypto.createHash('md5');
    _encrymd5.update(str.toString(),'utf8');
    return _encrymd5.digest('hex');
}


//session 加密
function session_crypto(secret,garbled){
    if (!(this instanceof session_crypto)) {
        return new session_crypto(secret,garbled)
    }

    this.secret = secret;
    this.garbled = garbled;
    this.cipherType = 'aes-128-cfb';
}

module.exports  = session_crypto;


session_crypto.prototype.encode = function sessionEncode(str){
    var garbledStr = '';
    if(this.garbled){
        garbledStr = md5(Date.now().toString()).substr(0,this.garbled);
    }
    var newSecret = [this.secret,garbledStr].join('');
    var cipher  = crypto.createCipher(this.cipherType,newSecret);
    var enc  = cipher .update(str, "utf8", "hex");
    enc += cipher .final("hex");
    var ret = garbledStr + enc.toString();
    return ret;
}

session_crypto.prototype.decode =  function sessionDecode(str){
    var garbledStr,newStr;
    if(this.garbled){
        newStr = str.substr(this.garbled);
        garbledStr = str.substr(0,this.garbled);
    }
    else{
        newStr = str;
        garbledStr = '';
    }
    try {
        var newSecret = [this.secret, garbledStr].join('');
        var decipher = crypto.createDecipher(this.cipherType, newSecret);
        var decrypted = decipher.update(newStr.toString(), 'hex', 'utf8');
        decrypted += decipher.final('utf8');
    }
    catch (e){
        var decrypted = null;
    }
    return decrypted;
}
