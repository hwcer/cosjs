"use strict";

//判断客户端IP是否在IP表内,filter:['127.0.0.1', '192.168.??.2*', '!255.*.*.*', '!0.*.*.*']
module.exports  = function iptable(filter,req){
    if(!filter){
        return true;
    }
    if(typeof req === 'object'){
        var remoteAddr = req.ip || req.ips || req._remoteAddress || (req.socket && (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress)));
    }
    else{
        var remoteAddr = req;
    }
    remoteAddr = remoteAddr.replace('::ffff:','');

    if (!remoteAddr) {
        return false;
    }
    var authorized = false;

    switch (Object.prototype.toString.call(filter)) {
        case '[object String]':
            authorized = new RegExp(filter.trim().replace(/\./g, '\\.').replace(/\?/g, '\\d?').replace(/\*/g, '\\d*')).test(remoteAddr);
            break;
        case '[object Array]':
            var regExp = filter.reduce(function(pre, next, index, filter) {
                if (typeof next === 'string' && next.length > 0) {
                    pre += next.trim().replace(/\./g, '\\.').replace(/\?/g, '\\d?').replace(/\*/g, '\\d*');
                }

                if (index === filter.length - 1) {
                    pre += ')$';
                } else {
                    pre += '|';
                }

                return pre;
            }, '^(');
            authorized = new RegExp(regExp).test(remoteAddr);
            break;
        case '[object RegExp]':
            authorized = filter.test(remoteAddr);
            break;
        case '[object Function]':
            authorized = filter.call(this, remoteAddr);
            break;
        default:
            authorized = false
    }
    return authorized;
}

//内网地址
module.exports.address = function ipAdress(){
    var interfaces = require('os').networkInterfaces();
    for(var devName in interfaces){
        var iface = interfaces[devName];
        for(var i=0;i<iface.length;i++){
            var alias = iface[i];
            if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){
                return alias.address;
            }
        }
    }
}


module.exports.encode = function(){
    if(typeof arguments[0] === 'object'){
        var ip=arguments[0]['host'],port = arguments[0]['port']||null;
    }
    else {
        var ip=arguments[0],port = arguments[1]||null;
    }
    var int = _ip2int(ip);
    if(!port){
        return int;
    }
    else {
        return [int,port].join(':');
    }
};

module.exports.decode = function(code){
    if( typeof code === 'number' || code.indexOf(":")<0){
        return _int2ip(parseInt(code));
    }
    else{
        var arr = code.split(":");
        var host = _int2ip(parseInt(arr[0]));
        return [host,arr[1]].join(':');
    }
};




//IP转成整型
function _ip2int(ip)
{
    var num = 0;
    ip = ip.split(".");
    num = Number(ip[0]) * 256 * 256 * 256 + Number(ip[1]) * 256 * 256 + Number(ip[2]) * 256 + Number(ip[3]);
    num = num >>> 0;
    return num;
}

//整型解析为IP地址
function _int2ip(num)
{
    var tt = new Array();
    tt[0] = (num >>> 24) >>> 0;
    tt[1] = ((num << 8) >>> 24) >>> 0;
    tt[2] = (num << 16) >>> 24;
    tt[3] = (num << 24) >>> 24;
    return tt.join('.');
}
