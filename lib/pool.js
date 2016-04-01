var cache_pool  = {};
var cache_drive = {};

var generic_pool = require('generic-pool').Pool;
//添加一个服务器到连接池中
exports.set = function(key,drive,config,options){
    if(arguments.length ==2 && typeof drive == 'object'){
        cache_pool[key] = new generic_pool(drive);
    }
    else if(arguments.length>=3 && cache_drive[drive]){
        cache_pool[key] =cache_drive[drive](key,config,options||{});
    }
    else{
        return false;
    }
}
//获取一个服务器的缓存池
exports.get = function(key){
    return cache_pool[key] || null;
}
//设置新驱动,自定义连接,比如缓存socket连接
exports.drive = function(name,connect,destroy){
    cache_drive[name] = function(key,config,options){
        return new generic_pool({
            name     : key,
            create   : connect,
            destroy  : destroy,
            max      : options['max']||10,
            // optional. if you set this, make sure to drain() (see step 3)
            min      : options['min']||2,
            // specifies how long a resource can stay idle in pool before being removed
            idleTimeoutMillis : options['idleTimeoutMillis'] || 30000,
            // if true, logs via console.log - can also be a function
            log : options['log'] || false
        });
    };
};
//连接一个已经存在连接池中的服务器
exports.connect = function(key,callback){
    if( !cache_pool[key] ){
        return callback('error','pool key['+key+'] not exist');
    }
    var pool = cache_pool[key];
    pool.acquire(function(err, client) {
        callback(err,client);
        if (!err) {
            pool.release(client);
        }
    });

}

exports.acquire = exports.connect;

/////////////////////////////////////////////////////////////////////////////////
cache_drive.redis=function(key,config,options) {
    return new generic_pool({
        name     : key,
        create   : function(callback) {
            var url = 'redis://' + protocol(config);
            var redis = require("redis");
            var redisClient = redis.createClient(url,options);
            callback(null,redisClient);
        },
        destroy  : function(client) {
            client.quit();
        },
        max      : options['max']||0,
        // optional. if you set this, make sure to drain() (see step 3)
        min      : options['min']||2,
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis : options['idleTimeoutMillis'] || 30000,
        // if true, logs via console.log - can also be a function
        log : options['log'] || false
    });
}


cache_drive.mongodb=function(key,config,options) {
    return new generic_pool({
        name     : key,
        create   : function(callback) {
            var url = 'mongodb://' + protocol(config);
            var MongoClient = require('mongodb').MongoClient;
            MongoClient.connect(url, callback);
        },
        destroy  : function(client) {
            client.close();
        },
        max      : options['max']||0,
        // optional. if you set this, make sure to drain() (see step 3)
        min      : options['min']||1,
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis : options['idleTimeoutMillis'] || 30000,
        // if true, logs via console.log - can also be a function
        log : options['log'] || false
    });
}


var protocol = function(config){
    var str;
    if(typeof config == 'object'){
        str = Array.isArray(config['host']) ? config['host'].join(','):config['host'];
        if(config['port']){
            str += ':' + config['port'];
        }
        if(config['username'] && config['password']){
            str = config['username'] + ':'+ config['password'] + '@' + str;
        }
    }
    else{
        str = config;
    }
    return str;
}