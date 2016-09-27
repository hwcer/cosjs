var cosjs = require('cosjs');
var mongodb = require('mongodb');

exports = module.exports = function(poolKey,collName){
    return new Collection(poolKey,collName);
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

//错误日志
var ErrorLogs = function(method,query,update,option,error,callback){
    var code = error['code']||0;
    var name = error['name']||'MongoError';
    console.error(
        new Date().toLocaleString(),
        name,
        method,JSON.stringify(query),
        JSON.stringify(update),
        JSON.stringify(option),
        code,error['errmsg']||error['message']||''
    );
    return callback(name,code);
}

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

var Collection = function(key,name) {
    "use strict"
    this.key = key;
    this.name = name;

    this.ErrorReCall = 10;                 //数据库写入失败后反复尝试的次数
    this.ErrorReTime = 100;                //数据库写入失败后下次重新写入时间


    this._MongoColl = null;
    this._MultiColl = null;

}



Collection.prototype.multi = function(){
    if(!this._MultiColl){
        this._MultiColl = new MultiColl(this);
    }
    return this._MultiColl;
}

Collection.prototype.exec = function(option,callback,ErrorReNum){
    if(!this._MultiColl){
        return callback('mongodb multi empty');
    }

    if(typeof option == 'function'){
        callback = option;
        option = null;
    }
    else if(typeof callback!='function'){
        callback = function(){}
    }
    if(this._MultiColl._MultiCache.length < 1){
        return callback(null,'mongodb multi operations empty');
    }

    var self = this;
    ErrorReNum = ErrorReNum || 0;
    ErrorReNum++;

    var result = function(err,ret){
        if(!err){
            self._MultiColl._MultiCache = [];
            return callback(null,ret);
        }
        else if( ErrorReNum >= self.ErrorReCall ){
            var update = self._MultiColl._MultiCache;
            self._MultiColl._MultiCache = [];
            return ErrorLogs('exec',null,update,option,err,callback);
        }
        else{
            setTimeout(function(){
                self.exec(option,callback,ErrorReNum);
            },ErrorReNum * self.ErrorReTime)
        }
    }

    this.collection(function(err,coll){
        if(err){
            return callback(err,coll);
        }
        coll.bulkWrite(self._MultiColl._MultiCache,option,result);
    });
}

Collection.prototype.collection = function(callback){
    if(this._MongoColl){
        return callback(null,this._MongoColl);
    }
    var self = this;
    cosjs.pool.get(this.key, function (err, db) {
        if (err) {
            return callback(err, db);
        } else {
            self._MongoColl = db.collection(this.name);
            return callback(false, self._MongoColl);
        }
    });
}


Collection.prototype.get = function(query,option,callback) {
    if(!option['fields']){
        option['fields'] = {};
    }
    var result = function(err,cursor){
        if(err){
            return callback(err,cursor);
        }
        if(option['dataType']=='array'){
            return getArrFromCursor(cursor,callback);
        }
        else if(option['dataType']=='json'){
            return getObjFromCursor(cursor,callback);
        }
        else{
            return callback(null,cursor);
        }
    }
    this.collection(function(err,coll){
        if(err){
            return callback(err,coll);
        }
        if(option["multi"]){
            coll.find(query, option, result);
        }
        else{
            coll.findOne(query, option, callback);
        }
    });
}

Collection.prototype.set = function(query, data, option,callback) {
    var update = {"$set":data};
    this.update(query,update,option,callback);
}

Collection.prototype.incr=function(query,data,option,callback) {
    var update = {"$inc":data};
    this.update(query,update,option,callback);
}

Collection.prototype.unset = function(query,data, option,callback) {
    var update = {"$unset":data};
    this.update(query,update,option,callback);
}

Collection.prototype.delete = Collection.prototype.remove = function(query,option,callback,ErrorReNum) {
    if(!("multi" in option)) {
        option["multi"] = option["single"] ? false : true;
    }
    if(this._MultiColl){
        return this._MultiColl.delete(query,option,callback);
    }

    var self = this;
    ErrorReNum = ErrorReNum || 0;
    ErrorReNum++;

    var result = function(err,ret){
        if(!err){
            return callback(null,ret['result']);
        }
        else if( ErrorReNum>=self.ErrorReCall ){
            return ErrorLogs('delete',query,'',option,err,callback);
        }
        else{
            setTimeout(function(){
                self.remove(query,option,callback,ErrorReNum);
            },ErrorReNum * self.ErrorReTime)
        }
    }

    this.collection(function(err,coll){
        if(err){
            return callback(err,coll);
        }
        if(option["multi"]){
            coll.deleteMany(query, option, result);
        }
        else {
            coll.deleteOne(query, option, result);
        }
    });
}

Collection.prototype.insert = function(data,option,callback,ErrorReNum) {
    if(this._MultiColl){
        return this._MultiColl.insert(data,option,callback);
    }
    var self = this;
    ErrorReNum = ErrorReNum || 0;
    ErrorReNum++;
    var result = function(err,ret){
        if(!err){
            return callback(null,ret['result']);
        }
        else if( err['code'] == '11000' || ErrorReNum>=self.ErrorReCall ){
            return ErrorLogs('add','',data,option,err,callback);
        }
        else{
            setTimeout(function(){
                self.add(data,option,callback,ErrorReNum);
            },ErrorReNum * self.ErrorReTime)
        }
    }
    this.collection(function(err,coll){
        if(err){
            return callback(err,coll);
        }
        if(Array.isArray(data)){
            coll.insertMany(data,option,result);
        }
        else{
            coll.insertOne(data,option,result);
        }

    });
}

Collection.prototype.count=function(query,callback){
    this.collection(function(err,coll){
        if(err){
            return callback(err,coll);
        }
        coll.count(query,callback);
    });
}

//分页显示
Collection.prototype.page=function(query, page, size, sort, option, callback){
    size = size || 10;
    if(page<1){
        page = 1;
    }
    option['multi'] = true;
    option['limit'] = size;
    option['skip']  = (page - 1 ) * size;
    option['sort'] = sort;

    var rows = {"page":page,"total":1, "size":size,"count":option['count']||0,"rows":[] };

    var result = function(err,ret){
        if(err){
            return callback(err,ret);
        }
        rows['rows'] = ret;
        return callback(null,rows);
    }

    var find = function(coll){
        if(rows['count'] > 0 ){
            rows['total'] = Math.ceil(rows['count'] / rows['size']);
        }
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
                rows['count'] = ret;
                find(coll);
            }
        });
    }
    this.collection(function(err,coll){
        if(err){
            return callback(err,coll);
        }
        if(!option['count']){
            count(coll);
        }
        else{
            find(coll);
        }

    });
}

//update,multi and upsert 不能同时使用,findAndModify 不能使用MULTI
Collection.prototype.update = function(query,update,option,callback,ErrorReNum) {
    if(this._MultiColl){
        return this._MultiColl.delete(query,option,callback);
    }

    var self = this;
    ErrorReNum = ErrorReNum || 0;
    ErrorReNum++;

    if( option['multi'] && ( option['upsert'] || option['fields'] ) ){
        return callback('MongoError','mongodb.update use multi but set upsert or fields');
    }

    var result = function(err,ret){
        if(!err){
            return callback(null,ret['value'] || ret['result']);
        }
        else if( ErrorReNum >= self.ErrorReCall ){
            return ErrorLogs('update',query,update,option,err,callback);
        }
        else{
            setTimeout(function(){
                self.update(query,update,option,callback,ErrorReNum);
            },ErrorReNum * self.ErrorReTime)
        }
    }

    this.collection(function(err,coll){
        if(err){
            return callback(err,coll);
        }
        if(option['fields']){
            option['projection'] = option['fields'];
            coll.findOneAndUpdate(query,update,option, result);
        }
        else if(option['multi']){
            coll.updateMany(query, update, option, result);
        }
        else{
            coll.updateOne(query, update, option, result);
        }
    });
}


//扩展
Collection.prototype.isMulti = function(id){
        if( !id || typeof id == 'object'){
            return true;
        }
        else{
            return false;
        }
    }

Collection.prototype.query = function(keys,parse,fk){
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
    };

Collection.prototype.fields = function (keys) {
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
        fields = keys;
    }
    else {
        fields[keys] = 1;
    }
    return fields;
};

Collection.prototype.values = function (key,val) {
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
};

Collection.prototype.ObjectID = function(keys,parse){
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
};


//mongoColl multi
var MultiColl = function(){
    this._MultiCache = [];
}

MultiColl.prototype.insert = function(data,option,callback){
    if(!callback) {
        callback = function (){};
    }
    if(Array.isArray(data)){
        data.forEach(function(d){
            this._MultiCache.push({ insertOne: { document: d } } );
        });
    }
    else{
        this._MultiCache.push({ insertOne: { document: data } } );
    }
    return callback(null,null);
}

MultiColl.prototype.update = function(query,update,option,callback){
    if(!callback) {
        callback = function (){};
    }
    var upsert = option['upsert'] ? true : false;
    if(!option['multi']){
        this._MultiCache.push({ updateOne: { filter: query , update : update ,upsert : upsert  } } );
    }
    else{
        this._MultiCache.push({ updateMany: { filter: query , update : update ,upsert : upsert  } } );
    }
    return callback(null,null);
}

MultiColl.prototype.delete = function(query,option,callback){
    if(!callback) {
        callback = function (){};
    }
    if(!("single" in option)) {
        option["single"] = option["multi"] ? false : true;
    }
    if(option['single']){
        this._MultiCache.push({ deleteOne: { filter: query } } );
    }
    else{
        this._MultiCache.push({ deleteMany: { filter: query } } );
    }
    return callback(null,null);
}