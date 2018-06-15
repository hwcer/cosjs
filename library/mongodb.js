"use strict"
const mongodb = require('mongodb');
const mongodb_util = require('../mongodb/util');
const mongodb_multi = require('../mongodb/multi');

class cosjs_mongodb{
    constructor(opts,DBName,CollName,upsert) {
        this.util         = new mongodb_util();
        this.upsert       = upsert||false;
        this.callback     = mongodb_callback;

        this.ErrorReCall = 10;                              //数据库写入失败后反复尝试的次数
        this.ErrorReTime = 100;                             //数据库写入失败后下次重新写入时间

        this._opts        = opts;
        this._DBName      = DBName;
        this._CollName    = CollName;

        this._MongoColl  = null;
        this._MultiColl  = null;

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
            let db = client.db(this._DBName);
            this._MongoColl = db.collection(this._CollName);
            callback(null,this._MongoColl);
        });
    }

    setOnInsert(){
        return null;
    }

    exec(callback,ErrorReNum){
        if(!this._MultiColl){
            return callback(null, 'mongodb multi empty');
        }
        let options = {};
        callback = callback || mongodb_callback;
        if(this._MultiColl._MultiCache.length < 1){
            return callback(null,'mongodb multi operations empty');
        }

        ErrorReNum = ErrorReNum || 0;
        ErrorReNum++;

        this.collection((err,coll)=>{
            if(err){
                return callback(err,coll);
            }
            coll.bulkWrite(this._MultiColl._MultiCache,options, exec_result.bind(this,ErrorReNum,callback ));
        });
    }


    save(callback){
        this.exec(callback);
    }

    multi(){
        if(!this._MultiColl){
            this._MultiColl = new mongodb_multi(this);
        }
        return this._MultiColl;
    }
    //id,key,dataType,callback
    get(id){
        let next = 1,key,dataType,callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next ++;
        }
        if(typeof arguments[next] !== 'function'){
            dataType = arguments[next];
            next ++;
        }
        callback = arguments[next];

        let query  = this.util.query(id);
        let option = {"multi":this.util.isMulti(id),"fields":this.util.fields(key)};
        if(typeof dataType === "object"){
            Object.assign(option,dataType)
            if(!option["dataType"]){
                option["dataType"] = "json";
            }
        }
        else{
            option["dataType"] = dataType||"json";
        }

        this.collection(function(err,coll){
            if(err){
                return callback(err,coll);
            }
            if(option["multi"]){
                let result = mongodb_multiResult.bind(this,option,callback);
                coll.find(query, option, result);
            }
            else{
                let result = mongodb_singleResult.bind(this,key,callback);
                coll.findOne(query, option, result);
            }
        });
    }
//id,key,[val,callback]
    set(id,key) {
        let val,next = 2,callback;
        if(typeof arguments[next] !== 'function'){
            val = arguments[next];
            next++;
        }
        callback = (typeof arguments[next] === 'function') ? arguments[next] : mongodb_callback;

        let query = this.util.query(id);
        let update = {"$set":this.util.values(key,val)};
        let option = {"multi":this.util.isMulti(id)};
        this.update(query,update,option,callback);
    }
    //删除一条,或者一个字段
    del(id) {
        let key,next = 1,callback;
        if(typeof arguments[next] !== 'function'){
            key = arguments[next];
            next++;
        }
        callback = arguments[next] || mongodb_callback;
        let query  = this.util.query(id);
        let option = {"multi":this.util.isMulti(id)};
        if(!key){
            this.remove(query,option,callback);
        }
        else{
            let update = {"$unset":this.util.values(key,1)};
            this.update(query,update,option,callback);
        }
    }

    add(){
        return this.insert.apply(this,arguments);
    }

    incr(id, key,val,callback) {
        callback = callback || mongodb_callback;
        let query  = this.util.query(id);
        let update = {"$inc":this.util.values(key,val)};
        let option = {"multi":this.util.isMulti(id)};
        let result;
        if(!option['multi']){
            option['fields'] = this.util.fields(key);
            result = mongodb_singleResult.bind(this,key,callback);
        }
        else{
            result = callback;
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
        let data = {"page":page,"size":size,"total":0,"records":0,"rows":[] };
        let skip  = (page - 1 ) * size ,limit = size ;

        this.collection((err,coll)=>{
            if(err){
                return callback(err,coll);
            }
            coll.find(query, option, (e2,cursor)=>{
                if(e2){
                    return callback(e2,cursor);
                }
                cursor.count((e3,r3)=>{
                    if(e3){
                        return callback(e3,r3);
                    }
                    data['records'] = r3;
                    cursor.skip(skip).limit(limit).toArray((e4,r4)=>{
                        if(e4){
                            return callback(e4,r4);
                        }
                        data['total'] = Math.ceil(data['records'] / data['size']);
                        data['rows'] = Array.isArray(r4)?r4:[];
                        callback(null,data);
                    });
                });
            });
        });
    }
    //删除
    remove(query,option,callback,ErrorReNum) {
        callback = callback || mongodb_callback;
        if(this._MultiColl){
            return this._MultiColl.delete(query,option,callback);
        }
        ErrorReNum = ErrorReNum || 0;
        ErrorReNum++;

        this.collection((err,coll)=>{
            if(err){
                return callback(err,coll);
            }
            let remove_result_bind = remove_result.bind(this,query,ErrorReNum,callback);
            if(option["multi"]){
                coll.deleteMany(query, option,remove_result_bind );
            }
            else {
                coll.deleteOne(query, option, remove_result_bind);
            }
        });
    }
    //data,[option],callback,[ErrorReNum]
    insert(data) {
        let next=1,option={},callback = mongodb_callback,ErrorReNum=0;
        if(typeof arguments[next] === 'object'){
            option = arguments[next];
            next ++;
        }
        if(typeof arguments[next] === 'function'){
            callback = arguments[next];
            next ++;
        }
        if(typeof arguments[next] === 'number'){
            ErrorReNum = arguments[next];
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
        ErrorReNum++;
        this.collection((err,coll)=>{
            if(err){
                return callback(err,coll);
            }
            let insert_result_bind = insert_result.bind(this,data,option,ErrorReNum,callback );
            if(Array.isArray(data)){
                coll.insertMany(data,option,insert_result_bind);
            }
            else{
                coll.insertOne(data,option,insert_result_bind );
            }
        });
    }

    count(query,callback){
        this.collection((err,coll)=>{
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
        let result = mongodb_multiResult.bind(this,option,callback);
        this.collection((err,coll)=>{
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
        if(!("upsert" in option)){
            option['upsert'] = this.upsert;
        }
        if(this._MultiColl){
            return this._MultiColl.update(query,update,option,callback);
        }

        ErrorReNum = ErrorReNum || 0;
        ErrorReNum++;

        if( option['multi'] && ( option['upsert'] || option['fields'] ) ){
            return callback('MongoError','mongodb.update use multi but set upsert or fields');
        }
        if(option['upsert'] && typeof this.setOnInsert === 'function' ){
            option["$setOnInsert"] = this.setOnInsert(query,update);
        }

        if( option['upsert'] && option["$setOnInsert"] ){
            if(!update["$set"]){
                update["$set"] = {};
            }
            Object.assign(update["$set"],option["$setOnInsert"]);
            delete option["$setOnInsert"];
        }


        this.collection((err,coll)=>{
            if(err){
                return callback(err,coll);
            }
            let update_result_bind = update_result.bind(this,query,update,option,ErrorReNum,callback);
            if(option['fields']){
                option['projection'] = option['fields'];
                coll.findOneAndUpdate(query,update,option, update_result_bind);
            }
            else if(option['multi']){
                coll.updateMany(query, update, option, update_result_bind);
            }
            else{
                coll.updateOne(query, update, option, update_result_bind);
            }
        });
    }

    aggregate(pipeline, options, callback){
        let result = mongodb_multiResult.bind(this,options,callback);
        this.collection((err,coll)=>{
            if(err){
                return callback(err,coll);
            }
            else{
                return coll.aggregate(pipeline, options, result);
            }
        });
    }
}


function exec_result(ErrorReNum,callback,err,ret){
    if(!err){
        this._MultiColl = null;
        return callback(null,ret);
    }
    else if( ErrorReNum >= this.ErrorReCall ){
        let update = this._MultiColl._MultiCache;
        this._MultiColl = null;
        return mongodb_ErrorLogs('exec',null,update,err,callback);
    }
    else{
        setTimeout(()=>{ this.exec(callback,ErrorReNum);},ErrorReNum * this.ErrorReTime)
    }
}

function remove_result(query,ErrorReNum,callback,err,ret){
    if(!err){
        return callback(null,ret['result']);
    }
    else if( ErrorReNum>=this.ErrorReCall || err['code'] == 11000 ){
        return mongodb_ErrorLogs('remove',query,'',err,callback);
    }
    else{
        setTimeout(()=>{ this.remove(query,callback,ErrorReNum); },ErrorReNum * this.ErrorReTime)
    }
}

function insert_result(update,option,ErrorReNum,callback,err,ret){
    if(!err){
        return callback(null,ret['result']);
    }
    else if( err['code'] == '11000' || ErrorReNum>=this.ErrorReCall ){
        return mongodb_ErrorLogs('insert','',update,err,callback);
    }
    else{
        setTimeout(()=>{ this.add(update,option,callback,ErrorReNum); },ErrorReNum * this.ErrorReTime)
    }
}

function update_result(query,update,option,ErrorReNum,callback,err,ret){
    if(!err){
        if(option['fields']){
            return callback(null,ret['value']);
        }
        else{
            return callback(null,ret['result']);
        }
    }
    else if( ErrorReNum >= this.ErrorReCall ){
        return mongodb_ErrorLogs('update',query,update,err,callback);
    }
    else{
        setTimeout(()=>{  this.update(query,update,option,callback,ErrorReNum); },ErrorReNum * this.ErrorReTime)
    }
}

function mongodb_connect(opts,callback) {
    let MongoClient = mongodb.MongoClient;
    if(opts instanceof MongoClient){
        callback(null,opts);
    }
    else if(typeof opts === "string"){
        let mongodbUrl = opts.substr(0,10)=== 'mongodb://' ? opts : 'mongodb://' + opts;
        MongoClient.connect(mongodbUrl,callback)
    }
    else {
        let encodeOpts = mongodb_url_encode(opts);
        let mongodbUrl = 'mongodb://' + encodeOpts.url;
        MongoClient.connect(mongodbUrl, encodeOpts.opts, callback)
    }
}

function mongodb_insert(data){
    if(!data["_id"]){
        let ObjectID = this.ObjectID || this.util.ObjectID;
        data["_id"] = ObjectID();
    }
}

function mongodb_callback(err,ret){
    return err ? false : ret;
}

//错误日志
function mongodb_ErrorLogs(method,query,update,error,callback){
    let code = error['code']||0;
    let name = error['name']||'MongoError';
    console.error(
        new Date().toLocaleString(),
        name,
        method,JSON.stringify(query),
        JSON.stringify(update),
        code,error['errmsg']||error['message']||''
    );
    return callback(name,code);
}

function mongodb_multiResult(option,callback,err,ret){
    if(err || !ret ){
        return callback(err,ret);
    }
    let dataType = option['dataType'] || 'json';
    if(dataType === 'array'){
        getArrFromCursor(ret,callback);
    }
    else if(dataType === 'json' || dataType === 'object'){
        getObjFromCursor(ret, option,callback);
    }
    else {
        callback(err,ret);
    }
}

function mongodb_singleResult(key,callback,err,ret){
    if(err ||!ret || !key || typeof key === 'object'){
        return callback(err,ret);
    }
    else{
        return callback(null,ret[key]||null);
    }
}


function getArrFromCursor(cursor,callback){
    cursor.toArray(callback);
}

function getObjFromCursor(cursor,option,callback){
    let key =  option["key"] || '_id',rows = {};
    cursor.each(function(err,ret){
        if(err){
            return callback(err,ret);
        }
        else if(ret===null){
            return callback(null,rows);
        }
        else{
            let id = ret[key];
            rows[id] = ret;
        }
    });
}


function mongodb_url_encode(config){
    let url,args = [],opts;
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

    let keys = ['url','host','port','database','username','password'];
    for(let k in config){
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