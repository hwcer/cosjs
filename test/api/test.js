
exports.index = function(req,res){
    var uid = 'hwc';
    var data = {'lv':100,"name":'hahah'}
    var session = req['session'];
    session.create(uid,data,function(err,ret){
        if(err){
            res.send(err +':'+ ret);
        }
        else{
            res.send(ret);
        }
    });

}



exports.check = function(req,res){
    //req.session.lock = false;      //只读接口取消session锁
    req.session.get(['lv','name'],function(err,ret){
        if(err){
            res.send(err +':'+ ret);
        }
        else{
            res.send(ret);
        }
    });

}