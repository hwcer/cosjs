/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var mongodb = require('mongodb');
var client = {};
var delayTime  = 100;
var delayNums = 10;
//host:port/db,返回DB对象
exports.conn=function(config, callback) {
    if(!config){
        return callback('mongo_config_error');
    }
    var key      = $.md5(config),
        delayCurrNums = delayNums;

    var delayConn = function () {
        delayCurrNums --;
        setTimeout(returnConn, delayTime);
    }

    var createConn = function(){
        var url = "mongodb://" + config;
        client[key] = "connection";
        mongodb.MongoClient.connect(url, function (err, db) {
            if(err){
                client[key] = false;
                console.log(err.message);
            }
            else{
                console.log('mongo[' + config + '] connection success');
                client[key] = db;
            }
        });
        return client[key];
    }

    var returnConn = function(){
        var conn = client[key] ? client[key] : createConn();
        var ready = typeof conn == 'object';
        if( !ready && delayCurrNums <= 0 ){
            callback('mongo_connected_failure');
        }
        else if( !ready ){
            delayConn();
        }
        else{
            callback(null,conn);
        }

    }

    returnConn();

}

exports.coll=function(config, dbName, collName) {
    var self = this, $conn, $coll, $config = [config,dbName].join('/');

    this.coll = function(callback){
        if($coll){
            return callback(null,$coll);
        }
        exports.conn($config, function (err, ret) {
            if (err) {
                return callback(err, ret);
            } else {
                $conn = ret;
                $coll = $conn.collection(collName);
                return callback(false, $coll);
            }
        });
    }


    this.add=function(info,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = $.callback;
        }
        if(!option){
            option = {};
        }
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            obj.insert(info,option,callback);
        });
    }


    this.get=function(query,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = $.callback;
        }
        if(!option){
            option = {};
        }
        option["multi"] = option["multi"] || false;
        if(!option['fields']){
            option['fields'] = {};
        }
        var dataType = option['dataType'] || 'json';
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            if(option["multi"]){
                obj.find(query, option, function(err,$cursor){
                    if(err){
                        return callback(err,$cursor);
                    }
                    if(dataType=='json'){
                        return getObj($cursor,callback);
                    }
                    else{
                        return getArr($cursor,callback);
                    }
                });
            }
            else{
                obj.findOne(query, option, callback);
            }
        });
    }


   this.set = function(query,info, option,callback) {
       if(typeof option == 'function'){
           callback = option;
           option = {};
       }
       else if(typeof callback !='function'){
           callback = $.callback;
       }
        if(!option){
            option = {};
        }
        if(typeof(option["upsert"])==='undefined'){
            option["upsert"] = false;
        }
        if(typeof(option["multi"])==='undefined'){
            option["multi"] = false;
        }
        var update = {"$set":info};
        self.coll(function(err,obj){
            if(err){
               return callback(err,obj);
            }
            obj.update(query,update, option, callback);
        });
    }

    this.del=function(query,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = $.callback;
        }
        if(!option){
            option = {};
        }
        if(typeof(option["single"])==='undefined'){
            option["single"] = true;
        }
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            obj.remove(query, option, callback);
        });
    }

    this.incr=function(query,info,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = $.callback;
        }
        if(!option){
            option = {};
        }
        option['upsert'] = true;
        option['new'] = true;
        var update = {"$inc":info};
        var sort = option['sort'] || [];
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            obj.findAndModify(query,sort,update,option, callback);
        });
    }
    this.count=function(query,callback){
        if(typeof callback !='function'){
            callback = $.callback;
        }
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            obj.count(query,callback);
        });
    }

//分页显示
    this.page=function($query, $page, $size, $sort, option,callback){
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = $.callback;
        }


        $size = $size || 10;
        if($page<1){
            $page = 1;
        }
        option['multi'] = true;
        option['limit'] = $size;
        option['skip']  = ($page - 1 ) * $size;
        option['sort'] = $sort;
        if(!option['fields']){
            option['fields'] = {};
        }
        var dataType = option['dataType'] || 'array';
        var rows = {"page":$page,"size":$size,"total":0,"rows":[]};

        var result = function(err,data){
            if(err){
                return callback(err,data);
            }
            rows['rows'] = data;
            return callback(false,rows);
        }

        var find = function(obj){
            obj.find($query, option, function(err,$cursor){
                if(err){
                    return callback(err,$cursor);
                }
                if(dataType=='json'){
                    return getObj($cursor,result);
                }
                else{
                    return getArr($cursor,result);
                }
            });
        }
        var count = function(obj) {
            obj.count($query, function (err, num) {
                if (err) {
                    return callback(err, num);
                }
                if (num < 1) {
                    return callback(false, rows);
                }
                rows['total'] = num;
                find(obj);
            });
        }
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            count(obj);
        });
    }

    //update
    this.update = function(query,update,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = $.callback;
        }
        if(!option){
            option = {};
        }

        if(typeof(option["upsert"])==='undefined'){
            option["upsert"] = false;
        }
        if(typeof(option["multi"])==='undefined'){
            option["multi"] = false;
        }
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            obj.update(query,update, option, callback);
        });
    }
}



var getArr = function($cursor,callback){
    $cursor.toArray(function(err,arr){
        if(err){
            return callback(err,arr);
        }
        return callback(false,arr);
    });
}

var getObj = function($cursor,callback){
    var rows = {};
    $cursor.each(function(err,item){
        if(err){
            return callback(err,item);
        }
        else if(item===null){
            return callback(false,rows);
        }
        else{
            var id = item['_id']||'';
            rows[id] = item;
        }
    });
}