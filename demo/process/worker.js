//http启动脚本
"use strict";
module.exports = function(){
    console.log("worker start");
    setInterval(function(){
        //console.log("worker do something");
    },5000)
};
