exports = module.exports = function(tasks,worker,callback){
    return new task(tasks,worker,callback);
}
//同步/异步 批量执行任务
var task = function(tasks,worker,callback){
    var self=this, maxNum, curNum = 0,  errNum = 0, errList = [],sync=false;
    this.breakOnError = false;

    if(Array.isArray(tasks)){
        maxNum = tasks.length;
    }
    else if(typeof tasks =='object'){
        tasks = Object.keys(tasks);
        maxNum = tasks.length;
    }
    else{
        maxNum = parseInt(tasks);
        tasks  = null;
    }
    var result = function(err,ret){
        curNum ++;
        if(err){
            errNum ++;
            errList.push([err,ret]);
        }

        if( err && self.breakOnError){
            return callback(errNum,errList);
        }

        if(curNum >= maxNum){
            callback(errNum,errList);
        }
        else if(sync){
            startSync();
        }
    }

    var startSync = function(){
        var args = tasks ? tasks[curNum] : curNum;
        worker(args,result);
    }
    //同步执行
    this.sync = function(){
        sync = true;
        if(maxNum<1){
            return callback(errNum,errList);
        }
        else{
            startSync();
        }

    }
    //异步执行
    this.asyn = function(){
        sync = false;
        if(maxNum<1){
            return callback(errNum,errList);
        }
        for(var i=0;i < maxNum;i++){
            var args = tasks ? tasks[i] : i;
            worker(args,result);
        }
    }
}

