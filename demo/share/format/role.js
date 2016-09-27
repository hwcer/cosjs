//用户基本信息,索引：oid, name,club.id(sparse)
exports = module.exports = {
    "oid":{'type':'string','val':''},
    "sid":{'type':'int','val':1},
    "step":{'type':'array','val':[0,0]},            //主线剧情(关卡),[普通,精英]
    "name":{'type':'string',"val":""},
    "guide":{'type':'string',"val":""},             //新手引导步骤
    "zhiye":{'type':'int','val':1},                  //职业
    "lv":{'type':'int','val':1,'name':'角色等级'},
    "exp":{'type':'int','val':0},
    "ap":{'type':'int','val':0,'name':'角色战斗力'},                      //战斗力
    "rmb":{'type':'int','val':0,'name':'累计充值'},
    "vip":{'type':'int','val':0,'name':'VIP等级'},
    "vipExp":{'type':'int','val':0},                 //VIP经验点数
    "club":{'type':'json','val':club},               //公会信息

    "topLv":{'type':'int','val':1,'name':'巅峰等级'},                     //巅峰等级
    "topExp":{'type':'int','val':0},                    //巅峰经验值
    //OOXX资源类 以B结尾
    "zb":{'type':'int','val':0,'achieve':1},                        //砖石
    "gb":{'type':'int','val':0,'achieve':1},                        //金币
    "zsb":{'type':'int','val':0,'achieve':1},                       //战神币
    "jjb":{'type':'int','val':0,'achieve':1},                       //竞技币
    "swb":{'type':'int','val':0,'achieve':1},                       //声望
    "jsb":{'type':'int','val':0,'achieve':1},                       //晶石币
    "dkp":{'type':'int','val':0,'achieve':1},                       //公会dkp
    "gxd":{'type':'int','val':0,'achieve':1},                       //公会贡献度
    "cjb":{'type':'int','val':0,'achieve':1},                       //成就点数
    "honor":{'type':'int','val':0,'achieve':1},                       //荣誉

    "power":{'type':'int','val':0},                     //体力
    "dayPower":{'type':'int','val':0},                  //每日消耗体力
    //"energy":{'type':'int','val':0},                     //活力


    "powerTime":{'type':'int','val':0},
    //"energyTime":{'type':'int','val':0},

    "task" : {'type':'json','val':{}},                              //主线任务
    "PUse":{'type':'array','val':[]},                                   //当前激活女武神
    "TUse":{'type':'array','val':[0,0]},                            //当前激活称号[显示,属性]
    "SPos":{'type':'array','val':[1,1,1,1,1,1]},                    //技能等级[第一个为自动攻击]
    "EPos":{'type':'array','val':$.pad([],10,null)},               //已经穿戴的装备[{equipid:{}} ,{equipid:{}}]
    "GPos":{'type':'array','val': $.pad([],41,0)},                  //宝石镶孔[0,1~40]

    "medal":{'type':'int','val':1},                                   //[勋章等级,完成任务]
    "ambit":{'type':'array','val':[0,0]},                            //界限突破[lv,exp]
    "talent":{'type':'array','val':[0,0,0,0,0,0,0,0,0]},             //天赋[第一个0无效,和策划思维保持一致]
    "element":{'type':'json','val':{}},                              //元素之力,this.element.key=val
    "paragon":{'type':'json','val':{}},                              //巅峰等级点数
    "soul":{'type':'json','val':{}},                                 //灵魂图签
    "pet":{'type':'json','val':{}},                                 //女武神
    "raid":{'type':'json','val':{}},                                //地下城通关记录

    "skill" : {'type':'json','val':{}},                             //技能符文,sikll=>符文
    "title" : {'type':'json','val':{}},                             //已获得称号列表,this.title.id>=ttl,ttl=0 用不过期,ttl>0:到期时间
    "story" : {'type':'json','val':{}},                             //章节信息

    "wtree":{'type':'int','val':0},                                 //世界树最高层数,
    "wtreeTime":{'type':'int','val':0},                             //世界树最高层数使用时间(S),

    "battle" : {'type':'string','val':''},                          //战斗状态,格式:类型|副本(玩家)ID|开始时间... 开始时间超过30分钟可以无视
    "ladder":{'type':'int','val':-1},                              //战神殿最佳排名
    "laddcd":{'type':'int','val':0},                                //战神殿冷却时间

    //"code":{'type':'json','val':{}},                                //已经使用的激活码类型,{id:time}
    //"shop":{'type':'json','val':{}},                                //商城购买记录,礼包购买次数
    "fundbuy":{'type':'int','val':null},                            //成长基金是否购买
    "fundlog":{'type':'array','val':[]},                            //成长基金领取记录
    "payment":{'type':'json','val':{}},                             //充值礼包
    "payweal":{'type':'json','val':{}},                             //月卡购买


    //"destroy" :{'type':'int','val':0},                               //删除标记,>0,已经删除,代表删除时间

    "time":{'type':'int','val':0},                                    //创建时间
    "login":{'type':'int','val':0},                                   //最后登录时间
    //"online":{'type':'int','val':0},                                   //最后活动时间,用于判断是否在线,仅存在于缓存中
    //"getchat":{'type':'int','val':0},                                 //最后聊天拉取聊天内容时间,仅存在于缓存中



    "credit":{'type':'int','val':0},                                  //神秘数字,记录非法操作
    "guide":{'type':'string','val':''},                               //新手引导
    "freeDraw":{'type':'json','val':{}},                              //上次免费抽奖时间
    //"count":{'type':'json','val':{}},
    "daily":{'type':'json','val':{}},                                 //日常数据
    "weekly":{'type':'json','val':{}},                                //周数据
    "goblin":{'type':'int','val':0},                                   //当前哥布林ID
    "setting":{'type':'json','val':{}},                               //前端设置
};