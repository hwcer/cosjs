/**
 * Created by hwc on 2016-06-29.
 */

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
//将一个数组分组成num大小的多组
exports.split = function(arr,num){
    var i = 0,length = arr.length,ret=[];
    while(i < length){
        ret.push(arr.slice(i,i+num));
        i += num;
    }
    return ret;
}
