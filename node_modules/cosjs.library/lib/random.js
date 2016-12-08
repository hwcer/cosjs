"use strict";

exports.roll = function(min,max){
    if(min >= max){
        return max;
    }
    var key = max - min + 1;
    var val = min + Math.floor(Math.random()*key);
    return val;
}