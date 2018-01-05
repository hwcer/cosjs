"use strict"
const mongodb = require('mongodb');



class cosjs_mongodb{
    constructor(opts,DBName,CollName) {
        this.callback    = mongodb_callback;
        this.ErrorReCall = 10;                              //数据库写入失败后反复尝试的次数
        this.ErrorReTime = 100;                             //数据库写入失败后下次重新写入时间

        this._opts        = opts;
        this._DBName      = DBName;
        this._CollName    = CollName;

        this._MongoColl  = null;
        this._MultiColl  = null;
        Object.defineProperty(this, 'util', { enumerable: true,  configurable: false, get: defineUtilProperty.bind(this)  });
    }

    collection(callback){
        callback = callback || mongodb_callback;
        if(this._MongoColl){
            return callback(null,this._MongoColl);
        }
        mongodb_connect(this._opts,(err,client)=>{
            if(err){
                return callback(err,client);
            }
            var db = client.db(this._DBName);
            this._MongoColl = db.collection(this._CollName);
            callback(null,this._MongoColl);
        });
    }

    exec(callback,ErrorReNum){
        if(!this._MultiColl){
            return callback(null, 'mongodb multi empty');
        }
        var options = {};
        callback = callback || mongodb_callback;
        if(this._MultiColl._MultiCache.length < 1){
            return callback(null,'mongodb multi operations empty');
        }

        var self = this;
        ErrorReNum = ErrorReNum || 0;
        ErrorReNum++;

        var result = function(err,ret){
            if(!err){
                self._MultiColl = null;
                return callback(null,ret);
            }
            else if( ErrorReNum >= self.ErrorReCall ){
                var update = self._MultiColl._MultiCache;
                self._MultiColl = null;
                return mongodb_ErrorLogs('exec',null,update,options,err,callback);
            }
            else{
                setTimeout(function(){
                    self.exec(callback,ErrorReNum);
                },ErrorReNum * self.ErrorReTime)
            }
        }

        this.collection(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.bulkWrite(self._MultiColl._MultiCache,options,result);
        });
    }

    save(callback){
        this.exec(callback);
    }

    multi(){
        if(!this._MultiColl){
            this._MultiColl = new MultiColl(this);
        }
        return this._MultiColl;
    }
    //id,key,dataType,callback
    get(id){
        var next = 1,key,dataType,callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next ++;
        }
        if(typeof arguments[next] !== 'function'){
            dataType = arguments[next];
            next ++;
        }
        callback = arguments[next];

        var query  = this.util.query(id);
        var option = {"multi":this.util.isMultiWrite(id),"fields":this.util.fields(key),"dataType":dataType||"json"};
        this.collection(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            if(option["multi"]){
                var result = mongodb_multiResult.bind(this,option,callback);
                coll.find(query, option, result);
            }
            else{
                var result = mongodb_singleResult.bind(this,key,callback);
                coll.findOne(query, option, result);
            }
        });
    }
//id,key,[val,callback]
    set(id,key) {
        var val,next = 2,callback;
        if(typeof arguments[next] !== 'function'){
            val = arguments[next];
            next++;
        }
        callback = (typeof arguments[next] === 'function') ? arguments[next] : mongodb_callback;

        var query = this.util.query(id);
        var update = {"$set":this.util.values(key,val)};
        var option = {"upsert": false,"multi":this.util.isMultiWrite(id)};
        this.update(query,update,option,callback);
    }
    //删除一条,或者一个字段
    del(id) {
        var key,next = 1,callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next++;
        }
        callback = arguments[next] || mongodb_callback;
        var query  = this.util.query(id);
        var option = {"multi":this.util.isMultiWrite(id)};
        if(!key){
            this.remove(query,option,callback);
        }
        else{
            var update = {"$unset":this.util.values(key,1)};
            this.update(query,update,option,callback);
        }
    }
    incr(id, key,val,callback) {
        callback = callback || mongodb_callback;
        var query  = this.util.query(id);
        var update = {"$inc":this.util.values(key,val)};
        var option = {"upsert": false,"multi":this.util.isMultiWrite(id)};
        if(!option['multi']){
            option['fields'] = this.util.fields(key);
            var result = mongodb_singleResult.bind(this,key,callback);
        }
        else{
            var result = callback;
        }
        this.update(query,update,option,result);
    }
    //分页显示
    page(query, page, size, sort, option, callback){
        size = size || 10;
        if(page<1){
            page = 1;
        }
        option['multi'] = true;
        option['sort'] = sort;
        option['fields'] = option['fields'] || {};
        var data = {"page":page,"size":size,"total":0,"records":option['records']||0,"rows":[] };
        var cursor , skip  = (page - 1 ) * size ,limit = size ;

        var result = function (err,ret) {
            data['total'] = Math.ceil(data['records'] / data['size']);
            data['rows'] = Array.isArray(ret)?ret:[];
            callback(null,data);
        }

        var getCount = function(err,ret){
            if(err){
                return callback(err,ret);
            }
            data['records'] = ret;
            setPage();
        }

        var setPage = function(){
            cursor.skip(skip).limit(limit).toArray(result);
        }

        var getCursorCallback = function(err,ret){
            if(err){
                return callback(err,ret);
            }
            cursor = ret;
            if(!data['records']){
                cursor.count(getCount);
            }
            else {
                setPage();
            }
        }

        this.collection(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.find(query, option, getCursorCallback);
        });
    }
    //删除
    remove(query,option,callback,ErrorReNum) {
        callback = callback || mongodb_callback;
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
            else if( ErrorReNum>=self.ErrorReCall || err['code'] == 11000 ){
                return mongodb_ErrorLogs('remove',query,'',option,err,callback);
            }
            else{
                setTimeout(function(){
                    self.remove(id,callback,ErrorReNum);
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
    //data,[option],callback,[ErrorReNum]
    insert(data,callback,ErrorReNum) {
        var next=1,option={},callback = mongodb_callback,ErrorReNum=0;
        if(typeof arguments[next] == 'object'){
            option = arguments[next];
            next ++;
        }
        if(typeof arguments[next] == 'function'){
            callback = arguments[next];
            next ++;
        }
        if(typeof arguments[next] == 'number'){
            ErrorReNum = arguments[next];
            next ++;
        }

        if(Array.isArray(data)){
            for(let v of data){
                mongodb_insert.call(this,v);
            }
        }
        else{
            mongodb_insert.call(this,data);
        }


        if(this._MultiColl){
            return this._MultiColl.insert(data,option,callback);
        }
        var self = this;
        ErrorReNum++;
        var result = function(err,ret){
            if(!err){
                return callback(null,ret['result']);
            }
            else if( err['code'] == '11000' || ErrorReNum>=self.ErrorReCall ){
                return mongodb_ErrorLogs('insert','',data,option,err,callback);
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

    count(query,callback){
        this.collection(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            coll.count(query,callback);
        });
    }
    //id,keys,[option],callback
    find(query,option,callback) {
        if(!option['fields']){
            option['fields'] = {};
        }
        var result = mongodb_multiResult.bind(this,option,callback);
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
    //update,multi and upsert 不能同时使用,findAndModify 不能使用MULTI
    update(query,update,option,callback,ErrorReNum) {
        if(typeof callback !== 'function'){
            callback = this.callback;
        }
        if(this._MultiColl){
            return this._MultiColl.update(query,update,option,callback);
        }

        var self = this;
        ErrorReNum = ErrorReNum || 0;
        ErrorReNum++;

        if( option['multi'] && ( option['upsert'] || option['fields'] ) ){
            return callback('MongoError','mongodb.update use multi but set upsert or fields');
        }

        var result = function(err,ret){
            if(!err){
                if(option['fields']){
                    return callback(null,ret['value']);
                }
                else{
                    return callback(null,ret['result']);
                }
            }
            else if( ErrorReNum >= self.ErrorReCall ){
                return mongodb_ErrorLogs('update',query,update,option,err,callback);
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

    aggregate(pipeline, options, callback){
        this.collection(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            else{
                return coll.aggregate(pipeline, options, callback);
            }
        });
    }
}





//mongoColl multi
function MultiColl(){
    this._MultiCache = [];
}

MultiColl.prototype.insert = function(data,option,callback){
    callback = callback || mongodb_callback;
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
    callback = callback || mongodb_callback;
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
    callback = callback || mongodb_callback;
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





function mongodb_util(){
    if (!(this instanceof mongodb_util)) {
        return new mongodb_util()
    }
}

mongodb_util.prototype.query = function mongodb_util_query(keys ,fk) {
    var query = {};
    if (!keys) {
        return query;
    }
    fk = fk || '_id';
    var ObjectID = this.ObjectID ;
    if (Array.isArray(keys)) {
        var rk = [];
        keys.forEach(function(k){
            rk.push(ObjectID(k));
        });
        query[fk] = {"$in": rk};
    }
    else {
        query[fk] = ObjectID(keys);
    }
    return query;
}

mongodb_util.prototype.fields = function mongodb_util_fields(keys) {
    var fields = {};
    if (!keys) {
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
}

mongodb_util.prototype.values = function mongodb_util_values(key, val) {
    var value = {};
    if (Array.isArray(key)) {
        key.forEach(function (k) {
            value[k] = val || null;
        });
    }
    else if (typeof key === 'object') {
        value = key;
    }
    else {
        value[key] = val;
    }
    return value;
}

mongodb_util.prototype.ObjectID = mongodb_ObjectID;

mongodb_util.prototype.isMultiWrite = function mongodb_util_isMultiWrite(id) {
    if (!id || typeof id == 'object') {
        return true;
    }
    else {
        return false;
    }
}

function defineUtilProperty(){
    if(!this._define_util){
        Object.defineProperty(this, '_define_util', { enumerable: false,  configurable: false, value: mongodb_util()  });
    }
    return this._define_util;
}

function mongodb_connect(opts,callback) {
    var MongoClient = mongodb.MongoClient;
    if(opts instanceof MongoClient){
        callback(null,opts);
    }
    else if(typeof opts === "string"){
        var mongodbUrl = opts.substr(0,10)=== 'mongodb://' ? opts : 'mongodb://' + opts;
        MongoClient.connect(mongodbUrl,callback)
    }
    else {
        var encodeOpts = mongodb_url_encode(opts);
        var mongodbUrl = 'mongodb://' + encodeOpts.url;
        MongoClient.connect(mongodbUrl, encodeOpts.opts, callback)
    }
}

function mongodb_insert(data){
    if(!data["_id"]){
        data["_id"] = this.util.ObjectID();
    }
}

function mongodb_callback(err,ret){
    return err ? false : ret;
}


function mongodb_ObjectID(id){
    return id ? id : mongodb.ObjectID().toString();
}
//错误日志
function mongodb_ErrorLogs(method,query,update,option,error,callback){
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

function mongodb_multiResult(option,callback,err,ret){
    if(err || !ret ){
        return callback(err,ret);
    }
    var dataType = option['dataType'] || 'json';
    if(dataType === 'array'){
        getArrFromCursor(ret,callback);
    }
    else if(dataType === 'json' || dataType === 'object'){
        getObjFromCursor(ret, callback);
    }
    else {
        callback(err,ret);
    }
}

function mongodb_singleResult(key,callback,err,ret){
    if(err || !key || typeof key === 'object'){
        return callback(err,ret);
    }
    else{
        return callback(null,ret[key]||null);
    }
}


function getArrFromCursor(cursor,callback){
    cursor.toArray(callback);
}

function getObjFromCursor(cursor,callback){
    var key =  '_id',rows = {};
    cursor.each(function(err,ret){
        if(err){
            return callback(err,ret);
        }
        else if(ret===null){
            return callback(null,rows);
        }
        else{
            var id = ret[key].toString();
            rows[id] = ret;
        }
    });
}


function mongodb_url_encode(config){
    var url,args = [],opts;
    if(config['url']){
        url = Array.isArray(config['url']) ? config['url'].join(','):config['url'];
    }
    else{
        url = [config['host'],config['port']||27017].join(':');
    }
    if(config['database']){
        url +=  ('/'+ config['database']);
    }
    if(config['username'] && config['password']){
        url = config['username'] + ':'+ config['password'] + '@' + url;
    }

    var keys = ['url','host','port','database','username','password'];
    for(var k in config){
        var v = config[k],t = typeof v,i = keys.indexOf(k);
        if( i < 0 && (t ==='string' || t === 'number') ){
            args.push(k+'='+v);
        }
        else{
            opts[k] = v;
        }
    }
    if(args.length>0){
        url += ('?' + args.join('&'));
    }
    return {url:url,opts:opts};
};



module.exports = cosjs_mongodb;
module.exports.connect = mongodb_connect;