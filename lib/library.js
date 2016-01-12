//判断是不是对象(array排除)
Object.isObject = function(obj){
    return typeof obj == 'object' && !Array.isArray(obj);
}
//将一个数组分组成num大小的多组
Array.split = function(arr,num){
    var i = 0,length = arr.length,ret=[];
    while(i < length){
        ret.push(arr.slice(i,i+num));
        i += num;
    }
    return ret;
}

//MD5加密
exports.md5 = function(str){
    var crypto = require('crypto');
    var _encrymd5 = crypto.createHash('md5');
    _encrymd5.update(str);
    return _encrymd5.digest('hex');
}

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
    if(Array.isArray(source)){
        return source.indexOf(tar) >= 0;
    }
    else{
        return tar in source;
    }
}
//对象复制
exports.clone = function(source){
    return JSON.parse(JSON.stringify(source));
}
//对象合并
exports.extend = function() {
    var options, name, src, copy, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;

        // skip the boolean and the target
        target = arguments[ i ] || {};
        i++;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && typeof target != 'function' ) {
        target = {};
    }

    for ( ; i < length; i++ ) {
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];

                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if ( deep && copy && typeof copy == 'object' ) {
                    if ( Array.isArray(copy)  ) {
                        clone = src && Array.isArray(src) ? src : [];

                    } else {
                        clone = src && Object.isObject(src) ? src : {};
                    }

                    // Never move original objects, clone them
                    target[ name ] = exports.extend( deep, clone, copy );

                    // Don't bring in undefined values
                } else if ( copy !== undefined ) {
                    target[ name ] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};
