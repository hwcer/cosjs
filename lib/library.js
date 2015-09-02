
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
//检查tar是否在source中存在
exports.exist = function(source,tar){
    for(var k in source){
		if(source[k] == tar){
			return true;
		}
	}
	return false;
}

exports.md5 = function(str){
    var crypto = require('crypto');
    var _encrymd5 = crypto.createHash('md5');
    _encrymd5.update(str);
    return _encrymd5.digest('hex');
}
//将字符或者数组补充到指定长度
exports.pad = function(source,max,char){
    var isArray = Array.isArray(source);
    var len = isArray ? source.length : source.toString().length ;
    if(len >= max){
        return source;
    }
    if(isArray){
        var val = source;
    }
    else{
        var val = [source];
    }
    for(var i=len;i<max;i++){
        val.push(char);
    }
    return isArray ? val : val.join('');
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
    if(!time){
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

var arrayFormat = function(str,format){	
    var val = typeof str =='object' ? str : JSON.parse(str);
	if(!Array.isArray(val)){
		val = [];
	}
    if(!format["val"]){
        return val;
    }
    else if(!Array.isArray(val)){
        return format["val"];
    }
    var curlength = val.length;
    var maxlength = format["val"].length;
    if(curlength >= maxlength){
        return val;
    }
    for(var i=curlength;i<maxlength;i++){
        val.push(format["val"][i]);
    }
    return val;
}

exports.dataFormat=function (val, type) {
    var format;
    if(typeof type == 'object'){
        format = type;
        type = format['type'];
    }
    else{
        format = {};
    }
    if (type == 'int' || type == 'number' ) {
        return parseInt(val, 10);
    }
    else if(type == 'float'){
        return parseFloat(val);
    }
    else if (type == 'json' || type == 'object' ) {
        return typeof val =='object' ? val : JSON.parse(val);
    }
    else if( type == 'array'){
        return arrayFormat(val,format);
    }
    else if (type == 'string') {
        return val ? val.toString() : '';
    }
    else {
        return val;
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
