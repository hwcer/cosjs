exports = module.exports = function(tasks,worker,callback){
    return new task(tasks,worker,callback);
}
//ͬ��/�첽 ����ִ������
var task = function(tasks,worker,callback){
    var self=this, maxNum, curNum = 0,  errNum = 0, errList = [],sync=false;
    this.breakOnError = false;

    if(!Array.isArray(tasks)){
        maxNum = parseInt(tasks);
        tasks  = null;
    }
    else{
        maxNum = tasks.length;
    }
    var result = function(err,ret){
        curNum ++;
        if( err && self.breakOnError){
            return callback(err,ret);
        }
        else if(err){
            errNum ++;
            errList.push({"err":err,"ret":ret});
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

    //ͬ��ִ��
    this.sync = function(){
        sync = true;
        if(maxNum<1){
            return callback(errNum,errList);
        }
        else{
            startSync();
        }

    }
    //�첽ִ��
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

