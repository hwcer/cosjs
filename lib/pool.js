
var delayTime  = 100;
var delayNums  = 100;

var connectPool  = {};
var connectDrive = {};
//添加一个服务器到连接池中
exports.set = function(key,drive,config,option){
    connectPool[key] = {  "drive":drive,  "config":config, "option":option||{}, "connect":''  }
}
//设置新驱动,自定义连接,比如缓存socket连接
exports.drive = function(name,fun){
    connectDrive[name] = fun;
};
//连接一个已经存在连接池中的服务器

exports.connect = function(key,callback){
    if(!connectPool[key]){
        return callback('error','pool['+key+'] not exist');
    }
    if(typeof callback !='function'){
        callback = function(){};
    }

    var client = connectPool[key];
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
        var drive = client['drive'];
        if(!connectDrive[drive]){
            return callback('error','pool drive['+drive+'] not exist');
        }
        client['connect'] = connectionSign;
        connectDrive[drive](client['config'],client['option'],function(err,ret){
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

connectDrive.redis=function(config,option,callback) {
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


connectDrive.mongodb=function(config,option,callback) {
    if(!config){
        return callback('mongo_config_error');
    }
    var protocol = 'mongodb://';
    var url = config.substr(0,10) ==  protocol ? config : protocol + config;
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
