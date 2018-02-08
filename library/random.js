"use strict";
//ROLL点
exports.Roll = function(min,max){
    if(min >= max){
        return max;
    }
    var key = max - min + 1;
    var val = min + Math.floor(Math.random()*key);
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
function Relative(items,key,filter){
    if (!(this instanceof Relative)) {
        return new Relative(items,key,filter)
    }
    key = key||"per";
    this.total = 0;
    this.items = [];
    this.unique = true;

    if( items && typeof items === 'object') {
        for (let k in items) {
            let item = items[k];
            if (typeof filter === 'function' && !filter(item)) {
                continue;
            }
            let val = typeof item === 'object' ? item[key] : parseInt(item);
            if (val > 0) {
                this.total += val;
                this.items.push([k,val]);
            }
        }
    }
}

Relative.prototype.roll = function(){
    if(!this.total){
        return false;
    }
    this.items.sort(()=>0.5 - Math.random() );
    let ret=false,total = Math.floor(this.total),random = exports.Roll(1,total);

    for(let i=0;i<this.items.length;i++){
        random -=  this.items[i][1];
        if(random <=0){
            ret = this.items[i][0];
            if(this.unique){
                total -= this.items[i][1];
                this.items.splice(i,1)
            }
            break;
        }
    }
    return ret;
}

exports.Relative = Relative;