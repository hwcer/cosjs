exports = module.exports = function(poolKey,collName){
    return new coll(poolKey,collName);
}

var coll=function(poolKey,collName) {
    var self = this, mongoColl;

    this.ErrorLogs = true;                 //写入错误时是否添加日志
    this.ErrorReCall = 10;                 //数据库写入失败后反复尝试的次数
    this.ErrorReTime = 100;                //数据库写入失败后下次重新写入时间
    //错误日志
    var ErrorLogs = function(method,query,update,option,err,callback){
        var code = err['code']||0;
        var name = err['name']||'MongoError';
        if(self.ErrorLogs){
            console.error(
                new Date().toLocaleString(),
                name,
                method,JSON.stringify(query),
                JSON.stringify(update),
                JSON.stringify(option),
                code,err['errmsg']||err['message']||''
            );
        }
        return callback(name,code);
    }

    this.coll = function(callback){
        if(mongoColl){
            return callback(null,mongoColl);
        }
        var pool = require('./pool');
        pool.connect(poolKey, function (err, conn) {
            if (err) {
                return callback(err, conn);
            } else {
                mongoColl = conn.collection(collName);
                return callback(false, mongoColl);
            }
        });
    }

    this.add=function(data,option,callback,ErrorReNums) {
        if(!ErrorReNums){
            ErrorReNums=0;
        }
        ErrorReNums++;

        var result = function(err,ret){
            if(!err){
                return callback(null,ret['result']);
            }
            else if( err['code'] == '11000' || ErrorReNums>=self.ErrorReCall ){
                return ErrorLogs('add',null,data,option,err,callback);
            }
            else{
                setTimeout(function(){
                    self.add(data,option,callback,ErrorReNums);
                },ErrorReNums * self.ErrorReTime)
            }
        }
        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.insert(data,option,result);
        });
    }

    this.get = function(query,option,callback) {
        var mgetCursor = function(err,cursor){
            if(err){
                return callback(err,cursor);
            }
            if(option['dataType']=='cursor'){
                return callback(null,cursor);
            }
            else if(option['dataType']=='json'){
                return getObj(cursor,callback);
            }
            else{
                return getArr(cursor,callback);
            }
        }
        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            if(option["multi"]){
                coll.find(query, option, mgetCursor);
            }
            else{
                coll.findOne(query, option, callback);
            }
        });
    }


    this.set = function(query, data, option,callback) {
        var update = {"$set":data};
        self.update(query,update,option,callback);
    }

    this.unset = function(query,data, option,callback) {
        var update = {"$unset":data};
        self.update(query,update,option,callback);
    }

    this.remove=function(query,option,callback,ErrorReNums) {
        if(!ErrorReNums){
            ErrorReNums=0;
        }
        ErrorReNums++;

        var result = function(err,ret){
            if(!err){
                return callback(null,ret['result']);
            }
            else if( ErrorReNums>=self.ErrorReCall ){
                return ErrorLogs('remove',query,null,option,err,callback);
            }
            else{
                setTimeout(function(){
                    self.remove(query,option,callback,ErrorReNums);
                },ErrorReNums * self.ErrorReTime)
            }
        }

        option["single"] = option["multi"]? false:true;
        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.remove(query, option, result);
        });
    }

    this.incr=function(query,data,option,callback) {
        var update = {"$inc":data};
        self.update(query,update,option,callback);
    }

    this.count=function(query,callback){
        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.count(query,callback);
        });
    }

    //分页显示
    this.page=function(query, page, size, sort, option, callback){
        size = size || 10;
        if(page<1){
            page = 1;
        }
        option['multi'] = true;
        option['limit'] = size;
        option['skip']  = (page - 1 ) * size;
        option['sort'] = sort;

        var rows = {"page":page,"size":size,"total":option['total']||0,"rows":[]};

        var result = function(err,ret){
            if(err){
                return callback(err,ret);
            }
            rows['rows'] = ret;
            return callback(null,rows);
        }

        var find = function(coll){
            coll.find(query, option, function(err,cursor){
                if(err){
                    return callback(err,cursor);
                }
                else{
                    return getArr(cursor,result);
                }
            });
        }
        var count = function(coll) {
            coll.count(query, function (err, ret) {
                if (err) {
                    return callback(err, ret);
                }
                else if (ret < 1) {
                    return callback(null, rows);
                }
                else{
                    rows['total'] = ret;
                    find(coll);
                }
            });
        }
        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            if(!option['total']){
                count(coll);
            }
            else{
                find(coll);
            }

        });
    }

    //update,multi and upsert 不能同时使用
    this.update = function(query,update,option,callback,ErrorReNums) {
        if(!ErrorReNums){
            ErrorReNums=0;
        }
        ErrorReNums++;

        var result = function(err,ret){
            if(!err){
                return callback(null,ret['value'] || ret['result']);
            }
            else if( ErrorReNums>=self.ErrorReCall ){
                return ErrorLogs('update',query,update,option,err,callback);
            }
            else{
                setTimeout(function(){
                    self.update(query,update,option,callback,ErrorReNums);
                },ErrorReNums * self.ErrorReTime)
            }
        }

        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            if(option['fields']){
                option['new'] = true;
                var sort = option['sort'] ||{};
                coll.findAndModify(query,sort,update,option, result);
            }
            else{
                coll.update(query, update, option, result);
            }
        });
    }
}

var getArr = function(cursor,callback){
    cursor.toArray(callback);
}

var getObj = function(cursor,callback){
    var rows = {};
    cursor.each(function(err,ret){
        if(err){
            return callback(err,ret);
        }
        else if(ret===null){
            return callback(null,rows);
        }
        else{
            var id = (ret['_id']||'').toString();
            rows[id] = ret;
        }
    });
}