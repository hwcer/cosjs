exports = module.exports = function(poolKey,collName){
    return new coll(poolKey,collName);
}

var coll=function(poolKey,collName) {
    var self = this, _coll,_callback=function(err,ret){};

    this.coll = function(callback){
        if(_coll){
            return callback(null,_coll);
        }
        var pool = require('./pool');
        pool.connect(poolKey, function (err, conn) {
            if (err) {
                return callback(err, conn);
            } else {
                _coll = conn.collection(collName);
                return callback(false, _coll);
            }
        });
    }


    this.add=function(info,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = _callback;
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
            callback = _callback;
        }
        if(!option){
            option = {};
        }
        option["multi"] = option["multi"] || false;
        if(!option['fields']){
            option['fields'] = {};
        }
        var dataType = option['dataType'] || 'array';
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            if(option["multi"]){
                obj.find(query, option, function(err,$cursor){
                    if(err){
                        return callback(err,$cursor);
                    }
                    if(dataType=='cursor'){
                        return callback(null,$cursor);
                    }
                    else if(dataType=='json'){
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
           callback = _callback;
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

    this.unset = function(query,info, option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = _callback;
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
        var update = {"$unset":info};
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            obj.update(query,update, option, callback);
        });
    }

    this.remove=function(query,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = _callback;
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
            callback = _callback;
        }
        if(!option){
            option = {};
        }
        if(option['upsert']===undefined){
            option['upsert'] = true;
        }
        if(option['new']===undefined){
            option['new'] = true;
        }
        var update = {"$inc":info};
        var sort = option['sort'] || [];
        self.coll(function(err,obj){
            if(err){
                return callback(err,obj);
            }
            obj.findAndModify(query,sort,update,option, function(e,r){
                if(e){
                    return callback(e,r);
                }
                return callback(null,r['value']||r);
            });
        });
    }

    this.count=function(query,callback){
        if(typeof callback !='function'){
            callback = _callback;
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
            callback = _callback;
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
        var rows = {"page":$page,"size":$size,"total":option['total']||0,"rows":[]};

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
			if(!option['total']){
				count(obj);
			}
			else{
				find(obj);
			}
            
        });
    }

    //update
    this.update = function(query,update,option,callback) {
        if(typeof option == 'function'){
            callback = option;
            option = {};
        }
        else if(typeof callback !='function'){
            callback = _callback;
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
            if(option['findAndModify']){
                option['new'] = true;
                obj.findAndModify(query,[],update,option, callback);
            }
            else{
                obj.update(query, update, option, callback);
            }
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
            var id = (item['_id']||'').toString();
            rows[id] = item;
        }
    });
}