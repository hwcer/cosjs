"use strict";
const cosjs_library = require('cosjs.library');
const cosjs_promise = cosjs_library.require("promise");

module.exports = handle_message;

//必须在userAgent下执行
function handle_message() { 
    let err,ret;
    if( arguments[0] && arguments[0] instanceof Error ){
        this.status = 500;
        err = arguments[0].message;ret = process.env.NODE_ENV === "production" ? arguments[0].code : arguments[0].stack;
        console.log(arguments[0]);   //始终输出系统错误
    }
    else if( arguments[0] && arguments[0] instanceof cosjs_promise.error ){
        err = arguments[0]["err"];ret = arguments[0]["ret"];
    }
    else if( arguments[0] && typeof arguments[0]==='object' && arguments[0]['name'] == 'MongoError'){
        err = arguments[0]["name"];ret = arguments[0]["errmsg"];
    }
    else {
        err = String(arguments[0]||''); ret = arguments[1]||'';
    }
    return [err,ret];
}


