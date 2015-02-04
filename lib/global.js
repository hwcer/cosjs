global.$={}

$.inArray = function(arr,str){
    var len = arr.length;
    for(var i = 0;i<len;i++){
        if(arr[i] === str){
            return true;
        }
    }
    return false;
}
//multiSort
$.sort = function(arr,key,order){
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
//将数组打乱
$.shuffle = function(arr){
    return arr.sort(function(){ return 0.5 - Math.random() });
}

//上下限的概率大概是正常概率的一半
$.roll = function(max,min){
    if(!max){
        max = 100;
    }
    max += 1;

    if(!min){
        min =1;
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
$.copy = function(source){
    var copyArray = function(){
        var newArr = [];
        for(var k in source){
            var v= source[k];
            if(typeof v == 'object'){
                newArr.push($.copy(v));
            }
            else{
                newArr.push(v);
            }
        }
        return newArr;
    }
    var copyObject = function(){
        var newObj = {};
        for(var k in source){
            var v= source[k];
            if(typeof v == 'object'){
                newObj[k] = $.copy(v);
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
        return copyArray();
    }
    else{
        return copyObject();
    }
}

//merge object
$.merge=function (obj1, obj2) {
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return obj2;
    }
    for (var k in obj2) {
        var v = obj2[k];
        if (typeof obj1[k] === 'object' && typeof v === 'object') {
            obj1[k] = $.merge(obj1[k], v);
        }
        else {
            obj1[k] = v;
        }
    }
    return obj1;
}
//获取静态配置，复制方式，防止逻辑中修改配置
$.config = function base(name, key) {
    var base = require('../config');
    var root = $.dataSelect(base,'share.config') || base['root'];
    var $file = [root, base['config'], name].join('/');
    try{
        var $data = require($file);
    }
    catch (e) {
        $data = false;
    }
    return $.copy($.dataSelect($data,key));
}

$.timeFormat = function(str,date){
    if(!date){
        date = new Date();
    }
    var yyyy = date.getFullYear().toString(),
        yy = yyyy.substr(2,2),
        m = date.getMonth() + 1,
        mm = m > 9 ? m : '0'+ m.toString(),
        d = date.getDate(),
        dd = d > 9 ? d : '0'+ d.toString(),
        h = date.getHours(),
        hh = h > 9 ? h : '0'+ h.toString(),
        i = date.getMinutes(),
        ii = i > 9 ? i : '0'+ i.toString(),
        s = date.getSeconds(),
        ss = s>9 ? s : '0'+ s.toString();
    return str.replace('yyyy', yyyy).replace('yy', yy).replace('y', yyyy).replace('mm', mm).replace('m', m).replace('dd', dd).replace('d', d).replace('hh', hh).replace('h', h).replace('ii', ii).replace('i', i).replace('ss', ss).replace('s', s);
}

$.dataFormat=function (val, type) {
    if (type == 'int') {
        return parseInt(val, 10);
    }
    else if (type == 'number' || type == 'float') {
        return parseFloat(val);
    }
    else if (type == 'json' || type == 'object') {
        return JSON.parse(val);
    }
    else if (type == 'string') {
        return val ? val.toString() : '';
    }
    else {
        return val;
    }
}

$.dataSelect=function($data,$keys){
     if(!$data){
         return false;
     }
    //console.log($data);
    var dsGetVal = function($d,$k){
        return $d[$k] || null;
    }
    var dsGetObj = function($k){
        var arr = $k.toString().split('.');
        var len = arr.length;
        var val = $data;
        for(var i=0;i<len;i++){
            var $k = arr[i];
            var $v = dsGetVal(val,$k);
            if($v===null){
                return $v;
            }
            val = $v;
        }
        return val;
    }

    var dsGetOne = function($k){
        var tag = $k.toString().indexOf('.');
        if(tag >=0){
            return dsGetObj($k);
        }
        else{
            return dsGetVal($data,$k);
        }
    }
    if($keys===undefined || $keys===null){
        return $data;
    }
    else if(Array.isArray($keys)){
        var $vals = {};
        $keys.forEach(function($k){
            $vals[$k] = dsGetOne($k);
        });
        return $vals;
    }
    else{
        return dsGetOne($keys);
    }

}
//loader
$.loader = function (name) {
    var config = require('../config');
    var $index = name.indexOf('/');
    var $model = name.substring(0, $index);
    var $dir = config['share'][$model] || config['root'];
    var $path = $dir+'/'+name;
    return require($path);
}
//同步/异步 批量执行任务
$.task = function(tasks,worker,callback){
    var self=this,maxNum, curNum = 0,  errNum = 0, errList = [],sync=false;
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
        startSync();
    }
    //异步执行
    this.asyn = function(){
        sync = false;
        for(var i=0;i < maxNum;i++){
            var args = tasks ? tasks[i] : i;
            worker(args,result);
        }
    }
}

$.callback = function(err,ret){
    if(err){
        return false;
    }
    else{
        return ret;
    }
}
//config,format,callback
$.redis = function(config){
    var redis = require('./redis');
    var length = arguments.length;
    if(length < 2){
        throw '$.redis arguments length error';
    }
    else if(length == 2 && typeof arguments[1] == 'function'  ){
        redis.conn(config,arguments[1]);
    }
    else{
        var type = arguments[1];
        var callback = arguments[2] || $.callback;
        if(redis[type]){
            var redis_conn_hash = new redis[type]( arguments[0]);
            return callback(null, redis_conn_hash);
        }
        else{
            throw "$.redis arguments[1] error";
        }
    }
}

$.mongo = function(config){
    var mongo = require('./mongo');
    var length = arguments.length;
    if(length < 2){
        throw '$.mongo arguments length error';
    }
    else if(length == 2 ){
        mongo.conn(config,arguments[1]);
    }
    else{
        var callback = arguments[3] || $.callback;
        var mongo_conn_coll = new mongo.coll(arguments[0],arguments[1],arguments[2]);
        return callback(null,mongo_conn_coll);
    }
}

$.md5 = function(str){
    var crypto = require('crypto');
    var _encrymd5 = crypto.createHash('md5');
    _encrymd5.update(str);
    return _encrymd5.digest('hex');
};

$.base64 = {
    encode:function(str) {
        var code = new Buffer(str);
        return code.toString('base64');
    },
    decode:function (str) {
        var code = new Buffer(str, 'base64')
        return code.toString();
    }
}