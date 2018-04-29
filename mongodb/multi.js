"use strict"
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
    option = option||{};
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


function mongodb_callback(err,ret){
    return err ? false : ret;
}

module.exports = MultiColl;
