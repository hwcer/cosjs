//好友,
//_id: [uid,fid]
// 索引：uid,fid
exports = module.exports = {
    "uid":{'type':'string','val':''},        //用户对象列表[申请人,确认人]
    "fid":{'type':'string','val':''},
    "type":{'type':'int','val':0},            //类型,0:待确认,1好友,2黑名单,3仇人
    "love":{'type':'int','val':0},            //好感度
    "time":{'type':'int','val':0},            //创建时间时间

    "lv":{'type':'int','val':0},
    "vip":{'type':'int','val':0},
    "name":{'type':'string','val':''},
};
