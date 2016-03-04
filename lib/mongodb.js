var mongodb = require('mongodb');
var formatter = require('./formatter');

exports = module.exports = function(poolKey,collName){
    return new mongoColl(poolKey,collName);
}

exports.cache = function(MPoolKey,RPoolKey,collName){
    return new mongoCache(MPoolKey,RPoolKey,collName);
}

exports.ObjectID = function(str){
    if(!str){
        return mongodb.ObjectID();
    }
    else if(typeof str == 'object' || !mongodb.ObjectID.isValid(str) ){
        return str;
    }
    else{
        return mongodb.ObjectID(str);
    }
}

var mongoColl=function(poolKey,collName) {
    "use strict"
    var self = this, _mongoColl,_mongoMulti;
    this.ErrorLogs = true;                 //写入错误时是否添加日志
    this.ErrorReCall = 10;                 //数据库写入失败后反复尝试的次数
    this.ErrorReTime = 100;                //数据库写入失败后下次重新写入时间
    this.MultiCache = [];
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

    this.multi = function(callback){
        if(!callback){
            callback = Function.callback;
        }
        if(_mongoMulti){
            return callback(null,_mongoMulti);
        }
        _mongoMulti = new mongoMulti(self);
        return callback(null,_mongoMulti);
    }

    this.exec = function(option,callback,ErrorReNums){
        if(self.MultiCache.length < 1){
            return callback(null,'mongodb multi operations empty');
        }

        if(!ErrorReNums){
            ErrorReNums=0;
        }
        ErrorReNums++;

        var result = function(err,ret){
            if(!err){
                self.MultiCache = [];
                return callback(null,ret);
            }
            else if( ErrorReNums>=self.ErrorReCall ){
                var update = self.MultiCache;
                self.MultiCache = [];
                return ErrorLogs('exec',null,update,option,err,callback);
            }
            else{
                setTimeout(function(){
                    self.exec(option,callback,ErrorReNums);
                },ErrorReNums * self.ErrorReTime)
            }
        }

        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.bulkWrite(self.MultiCache,option,result);
        });
    }

    this.coll = function(callback){
        if(_mongoColl){
            return callback(null,_mongoColl);
        }
        var pool = require('./pool');
        pool.connect(poolKey, function (err, conn) {
            if (err) {
                return callback(err, conn);
            } else {
                _mongoColl = conn.collection(collName);
                return callback(false, _mongoColl);
            }
        });
    }

    this.add=function(data,option,callback,ErrorReNums) {
        if(_mongoMulti){
            return _mongoMulti.insert(data,option,callback);
        }
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
        if(!option['fields']){
            option['fields'] = {};
        }
        var mgetCursor = function(err,cursor){
            if(err){
                return callback(err,cursor);
            }
            if(option['dataType']=='cursor'){
                return callback(null,cursor);
            }
            else if(option['dataType']=='json'){
                return getObjFromCursor(cursor,callback);
            }
            else{
                return getArrFromCursor(cursor,callback);
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

    this.incr=function(query,data,option,callback) {
        var update = {"$inc":data};
        self.update(query,update,option,callback);
    }

    this.unset = function(query,data, option,callback) {
        var update = {"$unset":data};
        self.update(query,update,option,callback);
    }

    this.remove=function(query,option,callback,ErrorReNums) {
        if(!("single" in option)) {
            option["single"] = option["multi"] ? false : true;
        }
        if(_mongoMulti){
            return _mongoMulti.delete(query,option,callback);
        }
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

        self.coll(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.remove(query, option, result);
        });
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
                    return getArrFromCursor(cursor,result);
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

    //update,multi and upsert 不能同时使用,findAndModify 不能使用MULTI
    this.update = function(query,update,option,callback,ErrorReNums) {
        if(_mongoMulti){
            return _mongoMulti.update(query,update,option,callback);
        }
        if(!ErrorReNums){
            ErrorReNums=0;
        }
        ErrorReNums++;

        if(option['upsert'] && option['multi']){
            return callback('mongoErr','update upsert and multi is unsafe');
        }

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
    //兼容
    this.insert = this.add;

    this.delete = this.remove;

    var getArrFromCursor = function(cursor,callback){
        cursor.toArray(callback);
    }

    var getObjFromCursor = function(cursor,callback){
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
}

//mongoColl util
mongoColl.prototype.util = {
    multi:function(id){
        if( !id || typeof id == 'object'){
            return true;
        }
        else{
            return false;
        }
    },
    query:function(keys,parse,fk){
        var query = {};
        if(!keys){
            return query;
        }
        if(!fk){
            fk='_id';
        }
        var rk = parse ? this.ObjectID(keys,parse) : keys;
        if(Array.isArray(keys)){
            query[fk]={"$in": rk };
        }
        else{
            query[fk] = rk;
        }
        return query;
    },
    fields:function (keys) {
        var fields = {};
        if(!keys){
            return fields;
        }
        if (Array.isArray(keys)) {
            keys.forEach(function (k) {
                fields[k] = 1;
            });
        }
        else if (typeof keys == 'object') {
            for (var k in keys) {
                fields[k] = 1;
            }
        }
        else {
            fields[keys] = 1;
        }
        return fields;
    },
    values:function (key,val) {
        var value = {};
        if (Array.isArray(key)) {
            key.forEach(function (k) {
                value[k] = val||null;
            });
        }
        else if (typeof key === 'object') {
            value = key;
        }
        else {
            value[key] = val;
        }
        return value;
    },
    ObjectID:function(keys,parse){
        if(!parse || typeof parse != 'function'){
            parse = exports.ObjectID;
        }

        if(Array.isArray(keys)){
            var arr = [];
            keys.forEach(function(k){
                arr.push(parse(k));
            });
            return arr;
        }
        else if(typeof keys=='object'){
            return keys;
        }
        else{
            return parse(keys);
        }
    }
};

//mongoColl multi
var mongoMulti = function(self){
    this.exec = self.exec;

    this.insert = function(data,option,callback){
        if(!callback) callback = Function.callback;
        if(Array.isArray(data)){
            data.forEach(function(d){
                self.MultiCache.push({ insertOne: { document: d } } );
            });
        }
        else{
            self.MultiCache.push({ insertOne: { document: data } } );
        }
        return callback(null,null);
    }
    this.update = function(query,update,option,callback){
        if(!callback) callback = Function.callback;
        var upsert = option['upsert'] ? true : false;
        if(!option['multi']){
            self.MultiCache.push({ updateOne: { filter: query , update : update ,upsert : upsert  } } );
        }
        else{
            self.MultiCache.push({ updateMany: { filter: query , update : update ,upsert : upsert  } } );
        }
        return callback(null,null);
    }
    this.delete = function(query,option,callback){
        if(!callback) callback = Function.callback;
        if(option['single']){
            self.MultiCache.push({ deleteOne: { filter: query } } );
        }
        else{
            self.MultiCache.push({ deleteMany: { filter: query } } );
        }
        return callback(null,null);
    }
}

//mongodb and redis cache
var mongoCache = function(MPoolKey,RPoolKey,collName){
    "use strict"
    var self = this,
        mongo = new mongoColl(MPoolKey,collName),
        redis = require('./redis')(RPoolKey,['cache',collName]);

    this.format = null;

    this.expire = 86400;

    this.Object = false;

    this.multi = function(){
        redis.multi();
        mongo.multi();
    }

    this.exec = function(callback){
        redis.exec(function(err,ret){
            if(err){
                return callback(err,ret);
            }
            mongo.exec({},function(e,r){
                return callback(null,e);
            })
        })
    }
    //data不用使用ARRAY模式批量插入
    this.add = function(data,callback){
        if( !data['_id'] && typeof self.Object == 'function' ){
            return callback('error','MongoDB Cache('+collName+').add data._id empty');
        }
        if(!data['_id']){
            data['_id'] = exports.ObjectID();
        }
        mongo.add(data, {},function(err,ret){
            if( err ){
                return callback(err,ret);
            }
            else{
                var id = data['_id'].toString();
                return updateCache('set',id, data, null, ret, callback);
            }
        });

    }
    //批量时不使用cache,
    this.get = function(id,key,callback){
        if(!id){
            return callback('error','MongoDB Cache('+collName+').get arguments[0] empty');
        }
        if( Array.isArray(id) ){
            return getMulti(id,key,callback);
        }
        else{
            return getSingle(id,key,callback);
        }
    }
    //此处依照REDIS特性,不存在时自动添加
    this.set = function(id, key, val, callback){
        if(!id ){
            return callback('error','MongoDB Cache('+collName+').set arguments[0] empty');
        }
        var query = mongo.util.query(id,self.Object);
        var update = mongo.util.values(key, val);
        var option = {"upsert":true,"multi":false };
        mongo.set(query, update, option, function(err,ret){
            if( err ){
                return callback(err,ret);
            }
            else{
                return updateCache('set',id, key, val, ret, callback);
            }
        });
    };
    //remove or unset
    this.del = function(id,key,callback){
        if(!id ){
            return callback('error','MongoDB Cache('+collName+').del arguments[0] error');
        }
        redis.del(id, key, function(err,ret){
            if(err){
                return callback(err,ret);
            }

            var query = mongo.util.query(id,self.Object);
            var option = {"multi": mongo.util.multi(id)};
            var cmd = 'remove';
            if(key){
                cmd = 'unset';
                option['fields']=mongo.fields(key);
            }
            mongo[cmd](query,option,callback);
        });
    };
    //cache 不支持一次自增多个kay
    this.incr = function(id, key, val, callback){
        if(!id){
            return callback('error','MongoDB Cache('+collName+').incr arguments[0] empty');
        }
        val = parseInt(val);
        if(!val){
            return callback('error','MongoDB Cache('+collName+').incr arguments[2] empty');
        }
        var query = mongo.util.query(id,self.Object);
        var update = mongo.util.values(key, val);
        var option = {"upsert":true,"multi":false};
        mongo.incr(query, update, option, function(err,ret){
            if( err ){
                return callback(err,ret);
            }
            else{
                return updateCache('incr',id, key, val, ret, callback);
            }
        });
    };

    var getMongo = function(id,key,callback) {
        var query = mongo.query(id, self.Object);
        var option = {"multi": mongo.multi(id), "dataType": "json", "fields": mongo.fields(key)};
        mongo.get(query, option, callback);
    }
    //获取多条
    var getMulti = function(ids,key,callback){
        var data = {},nocache=[];
        var taskWork = function(id,taskCallback){
            redis.get(id,key,function(err,ret){
                if(err){
                    return taskCallback(err,id);
                }
                if(!ret){
                    nocache.push(id);
                }
                else{
                    data[id] = formatter(ret,self.format);
                }
                taskCallback(err,ret);
            });
        }

        var taskResult = function(err,ret){
            if(err){
                return getMongo(ids,key,callback);
            }
            else if(nocache.length >0){
                return getMongo(nocache,null,getMongoCallback);
            }
            else{
                return callback(null,data);
            }
        }

        var getMongoCallback = function(err,ret){
            if(err){
                return callback(err,ret);
            }
            else if(!ret){
                return callback(null,data);
            }
            for(var k in ret){
                if(!ret[k]){
                    continue;
                }
                data[k] = filterDataFormKey(ret[k],key);
                updateCache('set',k, ret[k], null, null, $.callback);
            }
            return callback(null,data);
        }

        var task = new $.task(ids,taskWork,taskResult);
        task.breakOnError = true;
        task.sync();
    }
    //获取一条
    var getSingle  = function(id,key,callback){
        var getMongoCallback = function(err,ret){
            if(err || !ret){
                return callback(err,ret);
            }
            updateCache('set',id, ret, null, null, $.callback);
            return callback(null,filterDataFormKey(ret,key) );
        }
        redis.get(id,key,function(err,ret){
            if(err){
                return getMongo(id,key,callback);
            }
            else if(!ret){
                return getMongo(id,null,getMongoCallback);
            }
            else{
                return callback(null,formatter(ret,self.format));
            }
        });
    }

    var updateCache = function(cmd,id,key,val,MRet,callback){
        if( MRet && "nModified" in MRet && MRet['nModified']==0){
            return callback(null,MRet);
        }
        redis[cmd](id, key, val, function (err, ret) {
            if (!err && self.expire > 0) {
                redis.expire(id, self.expire, Function.callback);
            }
            callback(err, ret);
        });
    }

    var filterDataFormKey = function(ret,keys){
        if(!Array.isArray(keys)){
            return ret;
        }
        var data = {};
        keys.forEach(function(key){
            if(key in ret){
                data[key] = ret[key];
            }
        });
        return data;
    }

}