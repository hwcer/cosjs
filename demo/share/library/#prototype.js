Math.roll = function(){
    if(arguments.length>1){
        var min = arguments[0];
        var max = arguments[1];
    }
    else if(arguments.length == 1){
        var min = 1;
        var max = arguments[0];
    }
    else{
        var min = 1;
        var max = 100;
    }
    var key = max - min + 1;
    return Math.floor(min+Math.random()*key);
}

JSON.tryParse = function(text,reviver){
    if(typeof text == 'object'){
        return text;
    }
    var json = null;
    try {
        json = JSON.parse(text,reviver);
    }
    catch(e){
        json = null;
    }
    return json;
}

//判断是否为对象
Object.isObject = function(obj){
    return obj && typeof obj == 'object' && !Array.isArray(obj);
}

//对象初始化
Object.format = function(data,config,initialize){
    if(!data){
        return data;
    }
    if(Object.isObject(data)){
        return initialize ? complete(data,config) : transform(data,config);
    }
    else{
        return vformat(data,config);
    }
}


var vformat=function (val, type) {
    if (type == 'int' || type == 'number' ) {
        return parseInt(val, 10)||0;
    }
    else if(type == 'float'){
        return parseFloat(val)||0;
    }
    else if (type == 'json' || type == 'object' || type == 'array' ) {
        return typeof val =='object' ? val: JSON.tryParse(val)||val;
    }
    else if (type == 'string') {
        return val.toString ? val.toString() : '';
    }
    else if (type == 'time') {
        return val ? new Date(val).getTime() : 0;
    }
    else {
        return val;
    }
}

var complete = function(json,config){
    for(var k in config){
        if( !(k in  json) ){
            var v = config[k]['val'];
            json[k] = typeof v == 'object' ? Object.clone(v) :v ;
        }
        else if(config[k]['format'] && typeof json[k] == 'object'){
            json[k] = complete(json[k],config[k]['format']);
        }
        else{
            json[k] = vformat(json[k], config[k]['type']);
        }
    }
    return json;
}

var transform = function(json,config){
    for(var k in json){
        if(!config[k]){
            continue;
        }
        if(config[k]['format'] && typeof json[k] == 'object'){
            json[k] = transform(json[k],config[k]['format']);
        }
        else{
            json[k] = vformat(json[k], config[k]['type']);
        }
    }
    return json;
}