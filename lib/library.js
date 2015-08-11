//常用方法封装
var config = require('../config');
//数据库表结构多重排序
exports.sort = function(arr,key,order){
    if(!key){
        return false;
    }
    var orderKeys={};
    if(typeof key == 'object'){
        orderKeys = key;
    }
    else{
        orderKeys[key] = order;
    }
    var sortCompare = function(a,b){
        for(var k in orderKeys){
            var v = orderKeys[k];
            if(a[k] > b[k]){
                return v=='asc'?1:-1;
            }
            if(a[k] < b[k]){
                return v=='asc'?-1:1;
            }
        }
        return 0;
    }
    return arr.sort(sortCompare);
}

exports.md5 = function(str){
    var crypto = require('crypto');
    var _encrymd5 = crypto.createHash('md5');
    _encrymd5.update(str);
    return _encrymd5.digest('hex');
}
//ROLL点
exports.roll = function(min,max){
    if(arguments.length==1){
        min = 0;
        max = arguments[0];
    }
    max += 1;

    if(!min){
        min = 0;
    }
    if(min >= max){
        return false;
    }
    var diff = max - min;
    var num = ( Math.random()* diff).toFixed(0);
    var ret = parseInt(num) + min;
    if(ret == max){
        ret = min;
    }
    return ret;
}
//对象复制
exports.clone = function(source){
    var cloneArray = function(){
        var newArr = [];
        for(var k in source){
            var v= source[k];
            if(typeof v == 'object'){
                newArr.push(exports.clone(v));
            }
            else{
                newArr.push(v);
            }
        }
        return newArr;
    }
    var cloneObject = function(){
        var newObj = {};
        for(var k in source){
            var v= source[k];
            if(typeof v == 'object'){
                newObj[k] = exports.clone(v);
            }
            else{
                newObj[k] = v;
            }
        }
        return newObj;
    }

    if( !source || typeof source != 'object'){
        return source;
    }
    else if(Array.isArray(source)){
        return cloneArray();
    }
    else{
        return cloneObject();
    }
}

exports.timeFormat = function(str,time){
    var date;
    if(time===undefined){
        date = new Date();
    }
    else if(typeof time =='object'){
        date = time;
    }
    else{
        date = new Date(time);
    }
    var data = {};
    data['yyyy']= date.getFullYear().toString();
    data['yy'] = data['yyyy'].substr(2,2);
    var m = date.getMonth() + 1;
    data['mm'] = m > 9 ? m : '0'+ m.toString();
    data['m'] = m;
    var d = date.getDate();
    data['dd'] = d > 9 ? d : '0'+ d.toString();
    data['d'] = d;
    var h = date.getHours();
    data['hh'] = h > 9 ? h : '0'+ h.toString();
    data['h'] = h;
    var i = date.getMinutes();
    data['ii'] = i > 9 ? i : '0'+ i.toString();
    data['i'] = i;
    var s = date.getSeconds();
    data['ss'] =  s>9 ? s : '0'+ s.toString();
    data['s'] = s;
    for(var k in data){
        str = str.replace(k, data[k]);
    }
    return str;
}

exports.dataFormat=function (val, type) {
    var timeStrToInt = function(str){
        if( !str ){
           return 0;
        }
        var int;
        try {
            int = new Date(str).getTime();
        }
        catch (e) {
            int = 0;
        }
        return int;
    }
    if (type == 'int' || type == 'number' || type == 'float' ) {
        return parseInt(val, 10);
    }
    else if (type == 'json' || type == 'object') {
        return JSON.parse(val);
    }
    else if (type == 'string') {
        return val ? val.toString() : '';
    }
    else if (type == 'time') {
        return timeStrToInt(val);
    }
    else {
        return val;
    }
}

//同步/异步 批量执行任务
exports.task = function(tasks,worker,callback){
    var self=this, maxNum, curNum = 0,  errNum = 0, errList = [],sync=false;
    this.breakOnError = false;

    if(!Array.isArray(tasks)){
        maxNum = parseInt(tasks);
        tasks  = null;
    }
    else{
        maxNum = tasks.length;
    }
    var result = function(err,ret){
        curNum ++;
        if( err && self.breakOnError){
            return callback(err,ret);
        }
        else if(err){
            errNum ++;
            errList.push(ret);
        }
        if(curNum >= maxNum){
            callback(errNum,errList);
        }
        else if(sync){
            startSync();
        }
    }

    var startSync = function(){
        var args = tasks ? tasks[curNum] : curNum;
        worker(args,result);
    }

    //同步执行
    this.sync = function(){
        sync = true;
        if(maxNum<1){
            return callback(errNum,errList);
        }
        else{
            startSync();
        }

    }
    //异步执行
    this.asyn = function(){
        sync = false;
        if(maxNum<1){
            return callback(errNum,errList);
        }
        for(var i=0;i < maxNum;i++){
            var args = tasks ? tasks[i] : i;
            worker(args,result);
        }
    }
}

exports.callback = function(err,ret){
    if(err){
        return false;
    }
    else{
        return ret;
    }
}
//config,format,callback
exports.redis = function(config, type, callback){
    if(typeof type == 'function'){
        callback = type;
        type = null;
    }
    else if(!callback){
        callback = exports.callback;
    }
    var redis = require('./redis');
    if(type){
        if(redis[type]){
            var redis_conn_hash = new redis[type](config);
            return callback(null, redis_conn_hash);
        }
        else{
            throw new Error("exports.redis arguments[1] error");
        }
    }
    else{
        return redis.conn(config,callback);
    }
}

exports.mongo = function(config,dbName,collName,callback){
    if(typeof collName == 'function'){
        callback = collName;
        collName = null;
    }
    else if(!callback){
        callback = exports.callback;
    }
    var mongo = require('./mongo');
    var length = arguments.length;
    if(collName){
        var mongo_conn_coll = new mongo.coll(config,dbName,collName);
        return callback(null,mongo_conn_coll);
    }
    else{
        return mongo.conn(config,dbName,callback );
    }
}


exports.config = function(name, key, dir) {
	if(!dir){
		dir = 'config';
	}
    var file = [config['root'],config['share'],dir,name].join('/');
    try{
        var data = require(file);
    }
    catch (e) {
        var data = false;
    }
    if(!data){
        return false;
    }
    if(!key && key != 0){
        return data;
    }
    else{
        return data[key] || null;
    }
}

exports.loader = function (name,dir){
    var file = [config['root'],dir||config['share'],name].join('/');
    var model = false;
    try{
        model = require(file);
    }
    catch (e){
        model = false;
    }
    return model;
}
//数据集，方便操作mongodb类型的对象
exports.dataset = function(data){
    var self = this;

    var source = data || {};

    //定位器
    var select = function(key,fun){
        if(key.indexOf('.')<0){
            return fun(source,key);
        }
        var arr = key.split('.');
        var ret = source;
        var lastKey = arr.pop();
        for(var i in arr){
            var k = arr[i];
            if( !ret[k] || typeof ret[k] != 'object'){
                ret[k] = {};
            }
            ret = ret[k];
        }
        return fun(ret,lastKey);
    }

    this.reset = function(data){
        source = data || {};
    }

    this.get = function(key){
        var fun = function(ret,k){
            return ret[k] === undefined ? null : ret[k];
        }
        if(key===null){
            return source;
        }
        else if(Array.isArray(key)){
            var ret = {};
            key.forEach(function(k){
                ret[k] = select(k,fun);
            });
            return ret;
        }
        else if(typeof key=='object'){
            var ret = {};
            for(var k in key){
                ret[k] = select(k,fun);
            };
            return ret;
        }
        else{
            return select(key,fun);
        }
    }

    this.set = function(key,val){
        var fun = function(d,k){
            d[k] = val;
        }
        if(typeof key == 'object'){
            for(var k in key){
                val = key[k];
                select(k,fun);
            }
        }
        else{
            select(key,fun);
        }
    }

    this.add = function(key,val){
        var fun = function(d,k) {
            if (!d[k]) {
                d[k] = 0;
            }
            d[k] += val;
        }
        return select(key,fun);
    }

    this.sub = function(key,val){
        this.add(key,val*-1);
    }

    this.del = function(keys){
        var fun = function(d,k){
            if(d[k]!==undefined){
                delete d[k];
            }
        }
        if(!keys && keys !== 0){
           return source = {};
        }
        if(!Array.isArray(keys)){
            keys = [keys];
        }
        keys.forEach(function(k){
            select(k,fun);
        });
    }

    this.keys = function(){
        var key = [];
        for(var k in source){
            key.push(k);
        }
        return key;
    }

    this.exist = function(key){
        return select(key,function(ret,k){
            return ret[k] !== undefined;
        });
    }

}