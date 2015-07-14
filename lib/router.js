var url    = require('url');
var config = [];

//API调用
exports.router = function(match,path){
    config.push([1,match,path]);
}
//静态路由
exports.static = function(match,path){
    config.push([0,match,path]);
}

//匹配
exports.match = function (cosjs, pathname) {
    for (var k in config) {
        var RegExp = config[k][1];
        var Match = typeof RegExp == 'object' ? parseRouterRegExp(RegExp, pathname) : parseRouterString(RegExp, pathname);
        if(Match){
            return rewrite(cosjs,config[k],Match );
        }
    }
    return false;
}


var rewrite = function(cosjs, config, Match){
    var source = config[2];
    if(typeof source=='function'){
        var path = source(cosjs,Match);
    }
    else{
        var path = matchReplace(source,Match);
    }
	if(!path){
		return false;
	}
	
    if(path.indexOf('?')>=0){
        var pathParse = url.parse(path, true);
        for(var k in pathParse['query']){
            cosjs['set'](k,pathParse['query'][k]);
        }
        return [config[0],pathParse['pathname']];
    }
    else{
        return [config[0],path];
    }

}


var parseRouterString = function(reg,pathname){
    if(pathname.substr(0,reg.length) == reg){
        return pathname.split('/');
    }
    else{
        return false;
    }
}

var parseRouterRegExp = function(RegExp,pathname){
    return pathname.match(RegExp);
}

var matchReplace = function(str,obj){
    for(var k in obj){
        var mk = '$'+k;
        str = str.replace(mk,obj[k]);
    }
    return str;
}