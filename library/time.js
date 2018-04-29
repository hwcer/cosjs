"use strict";
const HOURTOTMS  = 3600 * 1000;
const DAYTOTALMS = 86400 * 1000;

//每日时间重置点
exports.reset = 0;

//本周开始时间
exports.week = function(DAYRESET){
    DAYRESET = DAYRESET || exports.reset;
    let today = exports.today(DAYRESET);
    let nowDate = new Date(today);
    let nowWeek = nowDate.getDay() || 7;
    return today - (nowWeek - 1)* DAYTOTALMS;
}



//本日开始时间
exports.today = function(DAYRESET){
    DAYRESET = DAYRESET || exports.reset;
    let newDate;
    if(DAYRESET > 0) {
        let DAYRESETMS = DAYRESET * HOURTOTMS;
        let nowTime = Date.now();
        newDate = new Date(nowTime - DAYRESETMS);
    }
    else {
        newDate = new Date();
    }
    newDate.setHours(DAYRESET,0,0,0);
    return newDate.getTime();
}

//有效天数
exports.expire = function(time,days,DAYRESET){
    DAYRESET = DAYRESET || exports.reset;
    let newDate = typeof time === 'object' ? time : new Date(time);
    newDate.setHours(DAYRESET,0,0,0);
    let newTime = newDate.getTime();
    return newTime + days * DAYTOTALMS;
}

//每日时间标签
exports.sign = function(time,format,DAYRESET){
    time = time || Date.now();
    format = format || 'yyMMdd';
    DAYRESET = DAYRESET || exports.reset;
    let DAYRESETMS = DAYRESET * HOURTOTMS;
    let newDate = new Date( time- DAYRESETMS);
    return parseInt(module.exports.format(format,newDate));
}


exports.format = function(format,time){
    let date;
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