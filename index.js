//全局函数
require('./lib/cosjs');
//全局配置

var config = require('./config');

var merge = function(source,key,val){
    if(typeof val == 'object'){
        for(var k in val){
            source[key][k] = val[k];
        }
    }
    else{
        source[key] = val;
    }
}


exports.set = function(key,val){
    if(key.indexOf('.')<0){
        return merge(config,key,val);
    }
    else{
        var arr = key.split('.');
        return merge(config[arr[0]],arr[1],val);
    }
}



exports.fork = require('./lib/fork').set;


exports.http = function () {
    return require('./lib/http').create();
}
