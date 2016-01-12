
var library = require('./library');

exports = module.exports = function(data){
    return new dataset(data);
}

var dataset = function(data){
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
        if(key===null || key ===undefined){
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

    //设置一个值,如果KEY是对象,则直接深度复制
    this.set = function(key,val){
        var fun = function(d,k){
            d[k] = val;
        }
        if(typeof key == 'object'){
            library.extend(true,source,key)
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
        return source.keys();
    }

    this.exist = function(key){
        return select(key,function(ret,k){
            return library.exist(ret,k);
        });
    }

}