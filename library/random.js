"use strict";
//ROLL点
exports.Roll = function(){
    let min=1,max;
    if(arguments.length >1){
        min = arguments[0],max=arguments[1];
    }
    else{
        max=arguments[0];
    }
    if(min >= max){
        return max;
    }
    let key = max - min + 1;
    let val = min + Math.floor(Math.random()*key);
    return val;
}

//独立概率,默认单位:万
exports.Probability=function(Per,unit){
    unit = unit || 10000;
    if(Per>=unit){
        return true;
    }
    else if(Per <= 0){
        return false;
    }
    let rnd = exports.Roll(1,unit);
    return Per >= rnd;
}

//相对概率（比重）；
exports.Relative = function (items){
    let next = 1,key,filter;
    if(typeof arguments[next] !=="function"){
        key = arguments[next];
        next ++;
    }
    if(typeof arguments[next] ==="function"){
        filter = arguments[next];
    }

    if(!items || typeof items !== 'object'){
        return false;
    }
    let total = 0,per={};

    for (let k in items) {
        let item = items[k];
        if (filter && !filter(item)) {
            continue;
        }
        let val = typeof item == 'object' ?  item[key] : parseInt(item);
        if(val >0){
            per[k] = val;
            total += val;
        }
    }

    if(!total){
        return false;
    }

    let rnd = exports.Roll(1,Math.floor(total));
    for(let k in per){
        rnd -=  per[k];
        if(rnd <=0){
            return k;
        }
    }
    return false;
}