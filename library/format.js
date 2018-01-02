"use strict";
const json = require('./json');
const clone = json.clone;

module.exports = function(data,format,initialize){
    if(!format){
        return data;
    }
    else if(typeof format === 'function'){
        return format(data);
    }
    else if(typeof format === 'object'){
        data = data || {};
        return initialize ? complete(data,format) : transform(data,format);
    }
    else {
        for(var k in data){
            data[k] = module.exports.parse(data[k],format);
        }
        return data;
    }
};

module.exports.parse = function (val, type,defaultValue) {
    if (type === 'int' ) {
        return Math.max(0,parseInt(val, 10)||defaultValue||0);
    }
    else if(type === 'float' || type === 'number'){
        return parseFloat(val)||defaultValue||0;
    }
    else if (type === 'json' || type === 'object' ) {
        return (typeof val =='object') ? val: (json.parse(val) || defaultValue || null);
    }
    else if ( type === 'array' ) {
        return (Array.isArray(val)) ? val: (json.parse(val) || defaultValue || null);
    }
    else if (type === 'string') {
        return (val.toString ? val.toString() : "")||defaultValue||"";
    }
    else if (type === 'time') {
        return val ? new Date(val).getTime() : defaultValue || 0;
    }
    else {
        return val;
    }
}

var complete = function(json,config){
    for(var k in config){
        if( !(k in json) ){
            var v = config[k]['val'];
			if(v!==null){
				json[k] = typeof v == 'object' ? clone(v) :v ;
			}
        }
        else if(config[k]['format'] && typeof json[k] == 'object'){
            json[k] = complete(json[k],config[k]['format']);
        }
        else{
            json[k] = module.exports.parse(json[k], config[k]['type'],config[k]['val']);
        }
    }
    return json;
}

var transform = function(json,config){
    for(var k in json){
        if(config[k]===null){
            continue;
        }
        if(config[k]['format'] && typeof json[k] == 'object'){
            json[k] = transform(json[k],config[k]['format']);
        }
        else{
            json[k] = module.exports.parse(json[k], config[k]['type'],config[k]['val']);
        }
    }
    return json;
}