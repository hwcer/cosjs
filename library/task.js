"use strict";
//同步/异步 执行多任务
function task(handle,worker,callback){
    if (!(this instanceof task)) {
        return new task(handle,worker,callback)
    }
    this.breakOnError = false;
    var maxNum, curNum = 0,  errNum = 0, errList = [],interval=0;
    var self = this;

    //顺序执行
    this.start = function(ms){
        if(Array.isArray(handle)){
            maxNum = handle.length;
        }
        else if(typeof handle =='object'){
            handle = Object.keys(handle);
            maxNum = handle.length;
        }
        else{
            maxNum = parseInt(handle);
            handle  = null;
        }
        interval = parseInt(ms||0);
        if(maxNum<1){
            return callback(errNum,errList);
        }
        else{
            asyn_start();
        }
    }


    function asyn_start(){
        var args = handle ? handle[curNum] : curNum;
        worker(args,asyn_result);
    }

    function asyn_result(err,ret){
        curNum ++;
        if(err){
            errNum ++;
            errList.push([err,ret]);
        }

        if( err && self.breakOnError){
            return callback(errNum,errList);
        }

        if(curNum >= maxNum){
            return callback(errNum,errList);
        }
        setTimeout(asyn_start,interval);
    }
}
module.exports = task;

