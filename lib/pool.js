
var pool = {};
var drive = {};
var delayTime  = 100;
var delayNums  = 100;

//添加一个服务器到连接池中
exports.set = function(key,type,config){
    var protocol = '://';   //连续协议与地址分割符号
    if(arguments.length==2){
        var arr = arguments[1].split(protocol);
        type = arr.shift();
        config = arr.join(protocol);
    }
    pool[key] = {  "type":type,  "config":config, "connect":''  }
}
//设置新驱动,自定义连接,比如缓存socket连接
exports.drive = function(type,fun){
    drive[type] = fun;
};
//连接一个已经存在连接池中的服务器

exports.connect = function(key,callback){
    if(!pool[key]){
        return callback('error','pool['+key+'] not exist');
    }
    if(typeof callback !='function'){
        callback = function(){};
    }

    var client = pool[key];
    var delayCurrNums = delayNums;
    var connectionSign = 'connection';

    var delayConn = function () {
        delayCurrNums --;
        setTimeout(checkConn, delayTime);
    }

    var checkConn = function(){
        var conn = client['connect'];
        var ready = typeof conn == 'object';
        if( !ready && delayCurrNums <= 0 ){
            callback('mongo_connected_failure');
        }
        else if( !ready ){
            delayConn();
        }
        else{
            callback(null,conn);
        }

    }

    var createConn = function(){
        var type = client['type'];
        if(!drive[type]){
            return callback('error','pool drive['+type+'] not exist');
        }
        client['connect'] = connectionSign;
        drive[type](client['config'],function(err,ret){
            if(err){
                return callback(err,ret);
            }
            else{
                client['connect'] = ret;
                callback(null,client['connect']);
            }
        });
    }

    if(typeof client['connect'] == 'object'){
        callback(null,client['connect']);
    }
    else if( client['connect'] == connectionSign ){
        delayConn();
    }
    else{
        createConn();
    }

}

drive.redis=function(config,callback) {
    if( !config ){
        return callback('redis_config_error');
    }
    var arr = config.split(':');
    var redis = require("redis");
    var options  = {"retry_max_delay":10000};
    var conn = redis.createClient(arr[1]||6379,arr[0],options);
    conn.on("error", function (err) {
        console.log(err.message);
    });
    conn.on("connect", function () {
        //console.log('redis[' + config + '] connection success');
    });
    conn.on("end", function () {
        //console.log('redis[' + config + '] end');
    });
    callback(null,conn);
}


drive.mongodb=function(config,callback) {
    if(!config){
        return callback('mongo_config_error');
    }
    var url = "mongodb://" + config;
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect(url, function (err, ret) {
        if(err){
            callback(err,ret);
            console.log(err.message);
        }
        else{
            //console.log('mongo[' + config + '] connection success');
            callback(null,ret);
        }
    });
}
