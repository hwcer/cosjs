"use strict";
const HOURTOTMS  = 3600 * 1000;
const DAYTOTALMS = 86400 * 1000;

function time(DAYRESET){
    if (!(this instanceof time)) {
        return new time(DAYRESET)
    }
    this.DAYRESET = DAYRESET;
}

module.exports = time;


//本周开始时间
module.exports.week = function(DAYRESET){
    DAYRESET = DAYRESET || 0;
    var DAYRESETMS = DAYRESET * HOURTOTMS;
    var nowTime = Date.now();
    var newDate = new Date( nowTime -  DAYRESETMS );
    var newTime = newDate.getTime();
    var week = newDate.getDay() || 7;
    var TEMP = newTime - (week - 1)* DAYTOTALMS;
    var SDate = new Date(TEMP);
    SDate.setHours(DAYRESET,0,0,0);
    return SDate.getTime();
}


//本日开始时间
module.exports.today = function(DAYRESET){
    DAYRESET = DAYRESET || 0;
    var DAYRESETMS = DAYRESET * HOURTOTMS;
    var nowTime = Date.now();
    var newDate = new Date( nowTime -  DAYRESETMS );
    newDate.setHours(DAYRESET,0,0,0);
    return newDate.getTime();
}

//有效天数
module.exports.expire = function(time,days,DAYRESET){
    DAYRESET = DAYRESET || 0;
    var newDate = typeof time == 'object' ? time : new Date(time);
    newDate.setHours(DAYRESET,0,0,0);
    var newTime = newDate.getTime();
    return newTime + days * DAYTOTALMS;
}

//每日时间标签
module.exports.sign = function(time,format,DAYRESET){
    format = format || 'yyMMdd';
    DAYRESET = DAYRESET || 0;
    var DAYRESETMS = DAYRESET * HOURTOTMS;
    var time = time || Date.now();
    var newDate = new Date( time- DAYRESETMS);
    return parseInt(exports.format(format,newDate));
}


module.exports.format = function(format,time){
    var date;
    if(!time){
        date = new Date();
    }
    else if(typeof time =='object'){
        date = time;
    }
    else{
        date = new Date(time);
    }
    var o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        //"q+": Math.floor((date.getMonth() + 3) / 3), //季度
        //"S": date.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return format;
}




time.prototype.week = function(){
    return module.exports.week(this.DAYRESET);
}

time.prototype.today = function(){
    return module.exports.today(this.DAYRESET);
}

time.prototype.expire = function(stime,days){
    return module.exports.expire(stime,days,this.DAYRESET);
}

time.prototype.sign = function(time,format){
    return module.exports.sign(time,format,this.DAYRESET);
}

time.prototype.format = module.exports.format;