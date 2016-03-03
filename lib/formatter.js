/**
 * formatter 对象格式化
 * @param data 需要格式化的对象
 * @param name 对象结构信息,如果是结构名称,必须使用formatter.config = function(name){},定义取配置的方法
 * @param initialize 是否需要完善对象,将不存在的值自动填充成默认值
 * @returns {*}
 * example:
 * myFormatConfig
 *  {
    "id":{'type':'string','val':''},
    "other":{'type':'json','val':{},'format':' otherFormat'},
    "time":{'type':'int','val':0}
    }
 *
 *otherFormat
 * {
    "exp":{'type':'int','val':0},
    "name":{'type':'string','val':''}
    }
 use formatter:   formatter({},myFormatConfig,true);
 return:          {id:"",other:{exp:0,name:""},time:0 }
 */
var formatter = function(data,name,initialize){
    if(!data){
        return null;
    }
    if(typeof data=='string' && data.substr(0,1)=='{'){
        data = JSON.parse(data);
    }
    if( !name || !Object.isObject(data)){
        return data;
    }
    var format = config(name);
    if(!format){
        return data;
    }
    return initialize ? complete(data,format) : transform(data,format);
}

var transform = function(data,config){
    for(var k in data){
        if(!config[k]){
            continue;
        }
        data[k] = parse(data[k], config[k]['type']);
        if(config[k]['format'] && typeof data[k] == 'object'){
            data[k] = formatter(data[k],config[k]['format'],true);
        }
    }
    return data;
}

var complete = function(data,config){
    for(var k in config){
        if( !k in  data){
            var v = config[k]['val'];
            data[k] = typeof v == 'object' ? Object.clone(v) :v ;
        }
        else{
            data[k] = parse(data[k], config[k]['type']);
        }
        if(config[k]['format'] && typeof data[k] == 'object'){
            data[k] = formatter(data[k],config[k]['format'],true);
        }
    }
    return data;
}

var parse = function (val, type) {
    if (type == 'int' || type == 'number' ) {
        return parseInt(val, 10)||0;
    }
    else if(type == 'float'){
        return parseFloat(val)||0;
    }
    else if (type == 'json' || type == 'object' || type == 'array' ) {
        return typeof val =='object' ? val : JSON.parse(val);
    }
    else if (type == 'string') {
        return val ? val.toString() : '';
    }
    else if (type == 'time') {
        return val ? new Date(val).getTime() : 0;
    }
    else {
        return val;
    }
}

var config = function(name){
   return typeof name == 'string'? exports.config(name) : name;
}

exports = module.exports = formatter;
//检查结构是否完整
exports.is = function(data,name){
    var format = config(name);
    if(!format){
        return true;
    }
    for(var k in format){
        if(!k in data){
            return false;
        }
    }
    return true;
}
//数据类型转换
exports.parse = parse;
//设置数据结构加载方式
exports.config = function(name){
    return typeof name == 'object'? name : {};
}