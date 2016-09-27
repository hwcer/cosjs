//内部交互认证
exports.create = function (args) {
    var keys = Object.keys(args).sort();
    var arr = [];
    keys.forEach(function(k){
        arr.push(k+'='+args[k]);
    });
    arr.push($.GC.key);
    var str = arr.join('&');
    return $.md5(str).substr(0,16);
}


exports.check = function (sign,args) {
    return sign == exports.create(args);
}