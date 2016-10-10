//路由: /foo/
module.exports = function(callback){
    return callback(null,this.path);
}
//路由: /foo/index
module.exports.index = function(callback){
    return callback(null,this.path);
}
