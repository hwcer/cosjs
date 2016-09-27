

//邮件,索引：time,uid
exports = module.exports = {
    "uid":{'type':'string','val':''},
    "fid":{'type':'string','val':''},        //发件人id,  fid=='',系统,fid=='msg' 内置消息
    "type":{'type':'int','val':0},             //类型,0-普通,1-内置消息
    "title":{'type':'string','val':''},
    "content":{'type':'string','val':''},
    "time":{'type':'int','val':0},
    "stat":{'type':'int','val':0},            //状态 0-未读,1-已读[附件未领],2-可清理 9-已标记删除
    "attr":{'type':'array','val':[]},
    "fname":{'type':'string','val':''},      //发件人名称

};
