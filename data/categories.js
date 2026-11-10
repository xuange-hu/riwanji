/* ============================================================
   日理万机 · 品类注册表（v5 · 数千品类版）
   大类 group → 基础品类 base → 细分品类 leaf
   leaf = 基础品类 × 变体 × 交叉维度（协议/尺寸/形态…），
   全部为真实存在的市场品类（如「Zigbee 人体传感器」「55 英寸 OLED 电视」）。
   每个 base 额外产出 root leaf（id = base.id）与精选数据对齐。
   浏览器端：window.DB_CATEGORY_TREE；Node 端：module.exports
   ============================================================ */
(function (root) {
  'use strict';

  function V(s) {
    return String(s || '').split('|').filter(Boolean).map(function (x) {
      var p = x.split(':');
      return { label: p[0], slug: p[1] || p[0].toLowerCase() };
    });
  }
  /* B(id, 名称, 图标, kind, 品牌, 变体, 权重, 交叉维度[可选]) */
  var B = function (id, name, icon, kind, brands, variants, weight, cross) {
    return { id: id, name: name, icon: icon, kind: kind, brands: brands || [],
      variants: V(variants || ''), weight: weight || 1000, cross: V(cross || '') };
  };

  var groups = [
  { id: 'phone-tablet', name: '手机与平板', icon: '📱', bases: [
    B('phone', '手机', '📱', 'phone', ['苹果', '三星', '华为', '小米', 'OPPO', 'vivo', '荣耀', '一加', '索尼', '谷歌', '魅族', '努比亚', '摩托罗拉', '传音', 'realme', 'iQOO', '夏普', '黑莓', 'Fairphone', 'Vertu', '中兴', 'TCL', '诺基亚'], '旗舰手机:flagship|折叠屏手机:foldable|游戏手机:gaming|拍照手机:camera|三防手机:rugged|老人手机:senior|学生手机:student|小屏手机:compact|5G 手机:5g|千元手机:budget|概念手机:concept|定制手机:custom', 36000),
    B('tablet', '平板', '📲', 'phone', ['苹果', '三星', '华为', '小米', '联想', '微软', '荣耀', 'OPPO', 'vivo', '亚马逊', '台电', '酷比魔方'], '旗舰平板:flagship|学习平板:edu|绘画平板:draw|游戏平板:gaming|墨水平板:eink|三防平板:rugged|二合一平板:2in1|儿童平板:kids', 14000),
    B('ereader', '电子书', '📖', 'phone', ['亚马逊', '文石', '掌阅', '汉王', '科大讯飞', '海信'], '6 英寸电子书:6inch|7 英寸电子书:7inch|10 英寸电子书:10inch|彩色墨水屏:color|手写电子书:note', 3500),
    B('rugged-phone', '三防设备', '🛡️', 'phone', ['AGM', 'Ulefone', 'Doogee', 'Cat', '三星', '松下'], '三防手机:phone|三防平板:tablet|工业手持终端:pda|防爆设备:exproof', 1800),
    B('intercom', '对讲机', '📟', 'iot', ['摩托罗拉', '宝锋', '海能达', '建伍', '小米', '北峰'], '公网对讲机:public|模拟对讲机:analog|数字对讲机:digital|儿童对讲机:kids|车载台:mobile', 2800),
    B('satellite-phone', '卫星通信', '🛰️', 'iot', ['铱星', '海事卫星', '华为', '中兴', '北斗'], '卫星电话:phone|卫星通信终端:terminal|卫星随身信标:beacon|卫星路由器:router', 700)
  ]},
  { id: 'computer', name: '电脑与整机', icon: '💻', bases: [
    B('laptop', '笔记本', '💻', 'compute', ['联想', '苹果', '华为', '戴尔', '华硕', '惠普', '小米', '微软', '宏碁', '微星', '雷蛇', '机械革命', '神舟', 'VAIO', '富士通', '松下', '东芝', '框架', 'System76', 'GPD'], '轻薄本:thin|游戏本:gaming|商务本:biz|移动工作站:workstation|上网本:netbook|二合一笔记本:2in1|设计师本:creator|学生本:student', 26000),
    B('desktop', '台式整机', '🖥️', 'compute', ['联想', '惠普', '戴尔', '苹果', '华硕', '宏碁', 'Alienware', 'ROG', '零刻', '铭凡', '极摩客', '英特尔'], '游戏整机:gaming|办公整机:office|设计师主机:creator|迷你主机:mini|一体机:aio|瘦客户机:thin|水冷主机:water', 9000),
    B('workstation', '工作站与服务器', '🗄️', 'compute', ['戴尔', '惠普', '联想', '超微', '浪潮', '华为', '曙光', '宁畅'], '塔式工作站:tower|移动工作站:mobile|机架服务器:rack|塔式服务器:tserver|刀片服务器:blade|边缘服务器:edge|存储服务器:storage', 3200),
    B('mini-pc', '迷你电脑', '🧳', 'compute', ['零刻', '铭凡', '英特尔', '华硕', '联想', '苹果', '极摩客', '天钡'], '家用迷你主机:home|软路由主机:soft|工控迷你机:ipc|电视棒电脑:stick|口袋主机:pocket|NUC:nuc', 3800)
  ]},
  { id: 'pc-parts', name: '电脑配件（台式机细分）', icon: '🧩', bases: [
    B('cpu', 'CPU 处理器', '🔲', 'pcpart', ['Intel', 'AMD', '苹果', '华为', '兆芯', '海光', '龙芯', '飞腾'], '台式处理器:desktop|移动处理器:mobile|服务器处理器:server|嵌入式处理器:embedded|超频限量版:oc|国产处理器:cn', 6500),
    B('gpu', '显卡', '🎮', 'pcpart', ['NVIDIA', 'AMD', 'Intel', '蓝宝石', '华硕', '微星', '技嘉', '七彩虹', '影驰', '撼讯', '摩尔线程'], '消费级显卡:consumer|发烧级显卡:enthusiast|专业图形卡:pro|移动版显卡:m|外置显卡坞:egpu|计算加速卡:compute', 5500),
    B('motherboard', '主板', '🧩', 'pcpart', ['华硕', '微星', '技嘉', '华擎', '映泰', '昂达', '七彩虹', '铭瑄', '华南金牌'], 'ATX 主板:atx|M-ATX 主板:matx|ITX 主板:itx|E-ATX 主板:eatx|服务器主板:server|工控主板:ipc', 5800),
    B('ram', '内存', '🧠', 'pcpart', ['金士顿', '芝奇', '美光', '海盗船', '英睿达', '威刚', '宇瞻', '十铨', '光威', '紫光'], '台式机内存:ddr|笔记本内存:so|服务器内存:ecc|超频内存:oc|国产内存:cn', 4800),
    B('storage', '硬盘存储', '💾', 'pcpart', ['三星', '西部数据', '希捷', '致态', '闪迪', '铠侠', '金士顿', '美光', '海康威视', '朗科'], 'SATA SSD:sata|NVMe SSD:nvme|机械硬盘:hdd|移动固态硬盘:portable|存储卡:card|U 盘:usb|NAS 硬盘:nas|磁带库:tape', 8500),
    B('psu', '电源', '🔌', 'pcpart', ['海韵', '海盗船', '酷冷至尊', '振华', '台达', '长城', '航嘉', '全汉', '安钛克', '鑫谷'], '全模组电源:full|半模组电源:half|SFX 电源:sfx|1U 服务器电源:1u|白金电源:platinum|钛金电源:titanium|DC-ATX 电源:dc', 3800),
    B('pc-case', '机箱', '🧰', 'pcpart', ['联力', '追风者', '乔思伯', '酷冷至尊', '海盗船', '分形工艺', '爱国者', '先马', 'Tt', '迎广'], '中塔机箱:mid|全塔机箱:full|ITX 机箱:itx|开放式机箱:open|异形机箱:weird|静音机箱:silent|水冷机箱:water|铝制机箱:alu', 3500),
    B('cooler', '散热器', '❄️', 'pcpart', ['利民', '猫头鹰', 'NZXT', '酷冷至尊', '海盗船', '九州风神', '华硕', 'Arctic', '超频三'], '风冷散热器:air|一体式水冷:aio|分体水冷:custom|水冷头:block|冷排风扇:fan|显卡散热器:gpu|散热底座:pad|导热硅脂:paste', 4000),
    B('expansion', '扩展卡与配件', '🧮', 'pcpart', ['华硕', '创新', '绿联', '乐扩', '英特尔', 'Elgato', '天创恒达'], '采集卡:capture|声卡:sound|网卡:nic|RAID 卡:raid|万兆网卡:10g|USB 扩展卡:usb|视频转换卡:video', 3000, 'PCIe:pcie|USB:usb'),
    B('case-fan', '机箱风扇', '🌀', 'pcpart', ['猫头鹰', '利民', '酷冷至尊', '海盗船', 'ARCTIC', '联力', 'Tt'], '12cm 风扇:12|14cm 风扇:14|RGB 风扇:rgb|无光风扇:plain|积木风扇:stack|水冷风扇:radiator', 2200, 'PWM:pwm|DC:dc'),
    B('cable-sleeve', '线材与模组线', '🔌', 'pcpart', ['定制线', '银欣', 'Tt', '联力', '绿联'], '模组电源线:psu|延长线:ext|镀银线:sleeved|理线配件:cable|硅胶线:silicone', 1300),
    B('thermal', '导热材料', '🧴', 'pcpart', ['利民', '信越', '暴力熊', '霍尼韦尔', '九州风神'], '导热硅脂:paste|导热垫片:pad|液态金属:lm|相变片:pcm|导热凝胶:gel', 900, '台式:desktop|笔记本:laptop')
  ]},
  { id: 'display-av', name: '显示与影音', icon: '🖥️', bases: [
    B('monitor', '显示器', '🖥️', 'display', ['戴尔', 'LG', '三星', '华硕', '明基', 'AOC', '飞利浦', '小米', '苹果', '联合创新', '优派', 'HKC', '惠普'], '电竞显示器:esports|专业设计显示器:pro|商务显示器:biz|便携显示器:portable|带鱼屏:ultrawide|4K 显示器:4k|Mini LED 显示器:miniled|OLED 显示器:oled|墨水屏显示器:eink|曲面屏显示器:curved|触控显示器:touch', 18000, '24 英寸:24|27 英寸:27|32 英寸:32|34 英寸:34|40 英寸以上:40'),
    B('tv', '电视', '📺', 'display', ['索尼', '三星', 'LG', 'TCL', '海信', '小米', '华为', '创维', '长虹', '康佳', '夏普'], 'OLED 电视:oled|Mini LED 电视:miniled|激光电视:laser|智能电视:smart|游戏电视:game|艺术电视:art|商显大屏:biz|8K 电视:8k|投影电视:projection', 14000, '32 英寸:32|43 英寸:43|50 英寸:50|55 英寸:55|65 英寸:65|75 英寸:75|85 英寸:85|98 英寸以上:98'),
    B('projector', '投影仪', '📽️', 'display', ['极米', '当贝', '坚果', '爱普生', '明基', '索尼', '峰米', '小米', '奥图码', 'NEC'], '家用投影:home|便携投影:portable|激光电视:laser|商务投影:biz|工程投影:project|游戏投影:game|智能投影:smart', 7000, 'LED 光源:led|激光光源:laser|灯泡光源:bulb|三色激光:tricolor'),
    B('soundbar', '回音壁', '🎶', 'audio', ['索尼', '三星', 'LG', 'B&O', 'JBL', '天龙', '雅马哈', 'Bose', '飞利浦', '华为'], '旗舰回音壁:flagship|中端回音壁:mid|一体式回音壁:allinone|无线低音炮套装:bass|后环绕套装:surround', 2800, '2.1 声道:21|5.1 声道:51|7.1 声道:71'),
    B('tvbox', '电视盒子', '📼', 'iot', ['苹果', '小米', '华为', '当贝', '天猫魔盒', '亚马逊', '谷歌', 'NVIDIA'], '智能电视盒子:box|流媒体棒:stick|Apple TV:atv|游戏盒子:game|IPTV 盒子:iptv', 2400),
    B('headphone', '耳机', '🎧', 'audio', ['索尼', '苹果', 'Bose', '森海塞尔', '拜雅', '铁三角', '歌德', '舒尔', 'B&O', 'JBL', '华为', '小米', '水月雨', 'HIFIMAN', 'FINAL', 'AKG', 'Marshall', '万魔', '漫步者'], '头戴耳机:overear|入耳耳机:inear|真无线耳机:tws|HiFi 耳机:hifi|降噪耳机:anc|运动耳机:sport|游戏耳机:gaming|骨传导耳机:bone|平面振膜耳机:planar|监听耳机:monitor', 20000),
    B('speaker', '音箱', '🔊', 'audio', ['Devialet', 'B&O', 'KEF', '真力', 'Bose', 'JBL', 'Marshall', '哈曼卡顿', '索尼', '漫步者', '惠威', '丹拿', '宝华韦健'], '智能音箱:smart|书架音箱:bookshelf|落地音箱:floor|便携音箱:portable|监听音箱:monitor|HiFi 音箱:hifi|户外音箱:outdoor|低音炮:sub|有源音箱:active', 9000, '有源:active|无源:passive|蓝牙:ble'),
    B('hifi', 'HiFi 器材', '🎛️', 'audio', ['Chord', '索尼', '山灵', '飞傲', 'iBasso', '凯音', '马兰士', '天龙', '麦景图', '柏林之声', '雅马哈'], '解码器:dac|耳放:amp|功放:av|CD 机:cd|黑胶唱机:turntable|便携播放器:dap|数字转盘:transport|前级:pre|电源处理器:power', 4500, '分体式:separate|合并式:combined'),
    B('mic', '麦克风与录音', '🎙️', 'audio', ['罗德', '舒尔', '铁三角', '森海塞尔', '索尼', 'ZOOM', 'Tascam', '大疆', '猛犸', '闪克'], '电容麦克风:condenser|动圈麦克风:dynamic|无线麦克风:wireless|录音笔:recorder|USB 麦克风:usb|领夹麦:lav|枪麦:shotgun', 3500, '有线:wired|无线:wireless'),
    B('earbud-case', '耳机配件', '🎧', 'audio', ['索尼', '苹果', '华为', '小米', '水月雨', 'Final'], '耳机升级线:cable|耳机套:tips|便携收纳盒:case|蓝牙耳挂:hook', 1600),
    B('instrument', '电子乐器', '🎹', 'audio', ['罗兰', '雅马哈', '卡西欧', 'Korg', 'Arturia', 'Native Instruments', 'Novation', '美得理', '吟飞', '珠江'], '电钢琴:piano|合成器:synth|MIDI 键盘:midi|电子鼓:drum|DJ 控制器:dj|吉他效果器:fx|智能吉他:guitar|电吉他:eguitar', 4500),
    B('photo-frame', '数码相框', '🖼️', 'display', ['爱国者', '佳的美', '索尼', '三星', '华为', '小米', 'Nixplay', '京东方'], '联网相框:network|触屏相框:touch|电子墨水相框:eink|视频相框:video', 2500)
  ]},
  { id: 'imaging', name: '影像与无人机', icon: '📷', bases: [
    B('camera', '相机', '📷', 'imaging', ['索尼', '佳能', '尼康', '富士', '徕卡', '哈苏', '松下', '奥林巴斯', '宾得', '理光', '禄来', '柯达', '适马', '大疆', 'GoPro', 'Blackmagic'], '微单相机:mirrorless|单反相机:dslr|卡片相机:compact|中画幅相机:medium|旁轴相机:rangefinder|胶片相机:film|拍立得:instant|运动相机:action|全景相机:360|电影机:cine|摄像机:camcorder|水下相机:underwater', 15000, '全画幅:ff|APS-C 画幅:apsc|M43 画幅:m43|中画幅:mf'),
    B('lens', '镜头', '🔭', 'imaging', ['索尼', '佳能', '尼康', '富士', '适马', '腾龙', '图丽', '徕卡', '蔡司', '老蛙', '七工匠', '铭匠'], '标准定焦:prime|变焦镜头:zoom|广角镜头:wide|长焦镜头:tele|微距镜头:macro|鱼眼镜头:fisheye|移轴镜头:tiltshift|电影镜头:cine|手动镜头:manual', 12000, 'E 卡口:e|EF 卡口:ef|F 卡口:f|Z 卡口:z|RF 卡口:rf'),
    B('camera-gear', '摄影器材', '🎚️', 'imaging', ['大疆', '智云', '曼富图', '捷信', '百诺', '神牛', '爱图仕', '南光', 'SmallRig'], '三脚架:tripod|云台稳定器:gimbal|闪光灯:flash|影视灯:light|监视器:monitor|兔笼套件:cage|滑轨:slider|摄影包:bag|滤镜:filter', 8000),
    B('studio-gear', '演播室与影视灯光', '🎬', 'imaging', ['神牛', '南光', '爱图仕', '智云', 'Aputure', 'Nanlite', 'Godox', 'SmallRig', '曼富图'], '补光灯:key|柔光箱:softbox|绿幕抠像:greenscreen|提词器:teleprompter|导播台:switcher|摄影棚灯:studio|反光板:reflector|灯架:stand|背景架:backdrop|追光灯:follow|影视电源:vlock|无线图传:wireless', 4200, 'LED:led|COB:cob'),
    B('drone', '无人机', '🚁', 'imaging', ['大疆', '道通', '哈博森', '飞米', 'Parrot', 'Autel'], '航拍无人机:camera|穿越机:fpv|行业无人机:industrial|农业无人机:agri|编程无人机:edu|水下无人机:underwater|玩具无人机:toy', 3800),
    B('printer-photo', '照片打印', '🖨️', 'peripheral', ['佳能', '爱普生', '惠普', '富士', '汉印', '兄弟', '得力'], '照片打印机:photo|拍立得相纸:instant|热升华打印机:dye|标签打印机:label|大幅面打印机:wide', 2600)
  ]},
  { id: 'gaming', name: '游戏与互动', icon: '🎮', bases: [
    B('console', '游戏主机', '🎮', 'gaming', ['索尼', '任天堂', '微软', 'Valve', 'AYANEO', 'GPD', '安伯尼克', '世嘉', '雅达利', 'SNK', 'Playdate', 'Analogue'], '家用主机:home|掌上游戏机:handheld|复古主机:retro|云游戏主机:cloud|街机设备:arcade|开源掌机:open', 7000, '光驱版:disc|数字版:digital'),
    B('game-accessory', '游戏外设', '🕹️', 'gaming', ['索尼', '微软', '任天堂', '雷蛇', '罗技', '北通', '飞智', '八位堂', '图马思特'], '游戏手柄:pad|街机摇杆:stick|游戏键鼠:kbm|游戏耳机:headset|方向盘模拟器:wheel|飞行摇杆:flight|体感设备:motion', 5800),
    B('rc-model', '遥控模型', '🛩️', 'robot', ['大疆', '乐迪', '双鹰', '美嘉欣', 'JJRC', '伟力', '拓驰', '环奇', '优迪'], '遥控车:car|遥控飞机:plane|遥控船:boat|穿越机:fpv|遥控直升机:heli|工程模型:engine|攀爬车:crawler|竞速赛车:racing|模型配件:part', 3200, '电动:electric|油动:nitro'),
    B('vr', 'VR/AR 设备', '🥽', 'gaming', ['Meta', '苹果', '索尼', 'PICO', 'HTC', '雷鸟', 'XREAL', 'Rokid', '大朋', 'NOLO'], 'VR 一体机:standalone|PC VR 头显:pcvr|AR 眼镜:ar|MR 设备:mr|VR 外设:acc|动作捕捉:mocap', 3000, '6DoF:6dof|3DoF:3dof'),
    B('gaming-furniture', '电竞桌椅与家具', '🪑', 'peripheral', ['傲风', '迪瑞克斯', '安德斯特', '西昊', '保友', '网易严选', '乐歌', '赛途'], '电竞椅:chair|升降桌:desk|人体工学椅:ergo|显示器支架臂:arm|电竞桌:gamingdesk|脚踏:footrest|懒人支架:lazy|理线桌:cable', 4200, '电动升降:electric|手动升降:manual')
  ]},
  { id: 'wearable', name: '智能穿戴与个护', icon: '⌚', bases: [
    B('watch', '智能手表', '⌚', 'wearable', ['苹果', '华为', '三星', '小米', '佳明', '颂拓', '卡西欧', 'OPPO', 'vivo', 'Amazfit', 'Withings', 'Polar', 'COROS'], '旗舰智能手表:flagship|运动手表:sport|户外手表:outdoor|健康手表:health|儿童手表:kids|奢侈智能手表:luxury|eSIM 手表:esim|机械智能表:mech', 15000, '方形表盘:square|圆形表盘:round|长续航:ultra'),
    B('band', '智能手环', '📳', 'wearable', ['小米', '华为', '苹果', 'Fitbit', 'OPPO', '荣耀', 'Keep', '乐心'], '运动手环:sport|健康手环:health|儿童手环:kids|智能戒指:ring|智能鞋垫:insole|智能服饰:cloth', 6000, '彩屏:color|黑白屏:mono'),
    B('fitness', '健身器材', '🏋️', 'appliance', ['舒华', '乔山', '速尔', 'Keep', '华为', '小米', '亿健', '英派斯', '麦瑞克', '野小兽'], '跑步机:treadmill|动感单车:bike|划船机:rower|椭圆机:elliptical|综合训练器:gym|智能健身镜:mirror|筋膜枪:gun|健腹轮:wheel|智能跳绳:rope|体测仪:analyze|力量器械:strength|瑜伽设备:yoga', 6500, '智能互联:smart|基础款:basic'),
    B('personal-care', '个护健康', '🪥', 'appliance', ['欧乐B', '飞利浦', '松下', '戴森', '博朗', '华为', '小米', '云麦', '攀高', '倍轻松', '鱼跃', '欧姆龙'], '电动牙刷:toothbrush|剃须刀:shaver|吹风机:hairdryer|美容仪:beauty|体脂秤:scale|血压计:bp|血氧仪:spo2|按摩仪:massage|筋膜枪:gun|助听器:hearing|电子体温计:thermo|制氧机:oxygen|冲牙器:flosser|卷发棒:curler|洁面仪:cleanser|脱毛仪:ipl|足浴盆:footbath|颈椎按摩仪:neck|眼部按摩仪:eye|智能药盒:pill', 13000, '便携:portable|家用:home'),
    B('glasses', '智能眼镜', '👓', 'wearable', ['华为', '小米', 'Bose', '亚马逊', 'Meta', '雷鸟', 'XREAL', 'Rokid'], '音频眼镜:audio|拍摄眼镜:camera|AR 眼镜:ar|翻译眼镜:translate|运动眼镜:sport|助视眼镜:aid', 2000)
  ]},
  { id: 'smart-home', name: '智能家居 IoT', icon: '🏠', bases: [
    B('smart-speaker', '智能音箱', '🔈', 'smart', ['小米', '华为', '苹果', '亚马逊', '天猫精灵', '百度', '索尼', 'JBL', '哈曼卡顿', 'Sonos'], '带屏音箱:screen|无屏音箱:audio|智能中控屏:panel|家庭助手:assistant|儿童音箱:kids|高保真智能音箱:hifi', 7000),
    B('smart-lock', '智能门锁', '🔒', 'smart', ['小米', '华为', '德施曼', '凯迪仕', '鹿客', '飞利浦', '三星', '耶鲁', 'TCL', '王力'], '指纹锁:fingerprint|人脸识别锁:face|推拉智能锁:push|密码锁:code|猫眼锁:peephole|挂锁:padlock|保险柜:safe|掌静脉锁:palm|指静脉锁:vein', 5500, 'WiFi:wifi|Zigbee:zigbee|蓝牙:ble'),
    B('smart-cam', '安防摄像头', '📹', 'smart', ['小米', '华为', '萤石', '海康威视', '360', 'Aqara', '乐橙', 'TP-LINK', '乔安', '大华'], '室内摄像头:indoor|室外摄像头:outdoor|云台机:ptz|门铃猫眼:doorbell|低功耗摄像头:lowpower|4G 摄像头:4g|太阳能摄像头:solar|NVR 套装:nvr|可视门铃:videodoor|全景摄像头:pano', 12000, '1080P:1080p|2K:2k|4K:4k|WiFi:wifi|PoE:poe|4G:4g'),
    B('smart-light', '智能灯具', '💡', 'smart', ['小米', 'Yeelight', '飞利浦', '宜家', 'Nanoleaf', 'Aqara', '华为', '松下', '明基', '欧普', '雷士'], '智能灯泡:bulb|吸顶灯:ceiling|台灯:desk|灯带:strip|智能吊灯:pendant|氛围灯:ambient|庭院灯:yard|屏幕挂灯:bar|夜灯:night|智能蜡烛:candle|路灯:street|镜前灯:mirror', 10000, '暖光:warm|冷光:cool|全光谱:fullspec|RGB:rgb'),
    B('smart-plug', '智能开关插座', '⚡', 'smart', ['小米', 'Aqara', '华为', '公牛', '飞利浦', '欧瑞博', '施耐德', '西门子'], '智能插座:plug|智能开关:switch|智能排插:powerstrip|窗帘电机:curtain|智能电表:meter|断路器:breaker|无线开关:button|智能水阀:valve', 8500, 'WiFi:wifi|Zigbee:zigbee|蓝牙 Mesh:mesh|单火线:sp|零火线:np'),
    B('sensor', '传感器', '🌡️', 'smart', ['小米', 'Aqara', '华为', '青萍', '霍尼韦尔', '海曼', '博联', '益杉', '涂鸦'], '温湿度传感器:th|人体传感器:pir|门窗传感器:door|烟雾报警器:smoke|水浸传感器:water|燃气报警器:gas|光照传感器:lux|空气质量传感器:aq|震动传感器:vibe|雷达传感器:radar|甲醛传感器:ch2o|CO2 传感器:co2|噪音传感器:noise|液位传感器:level|气压传感器:baro|倾角传感器:tilt|加速度传感器:accel|霍尔传感器:hall|接近传感器:prox|称重传感器:weight|超声波测距:ultra|TOF 测距:tof|PM2.5 传感器:pm25|TVOC 传感器:tvoc|水压传感器:wpressure|雨量传感器:rain|电流传感器:current|电压传感器:voltage|功率计量:power|火焰传感器:flame|光栅传感器:lightgate|磁簧传感器:reed', 14000, 'WiFi:wifi|Zigbee:zigbee|蓝牙:ble|LoRa:lora|NB-IoT:nbiot|433MHz:433|Z-Wave:zwave|Matter:matter'),
    B('gateway', '网关与中枢', '📡', 'smart', ['小米', 'Aqara', '华为', '苹果', '三星', '亚马逊', '博联', '欧瑞博'], '智能网关:gateway|多模网关:multi|家庭中枢:hub|万能遥控器:ir|Zigbee 网关:zigbee|蓝牙 Mesh 网关:mesh|Matter 设备:matter|Thread 边界路由:thread', 3800, 'WiFi:wifi|Zigbee:zigbee|Matter:matter'),
    B('smart-appliance', '智能大家电', '🌀', 'appliance', ['小米', '石头', '科沃斯', '追觅', '戴森', '海尔', '美的', '格力', '西门子', '博世', '松下', '云鲸', 'iRobot'], '扫地机器人:vacuum|拖地机器人:mop|洗地机:wetdry|智能马桶:toilet|智能晾衣架:rack|智能冰箱:fridge|智能空调:ac|智能热水器:heater|智能油烟机:hood|擦窗机器人:window|智能门铃:doorbell|智能床垫:mattress', 16000),
    B('smart-garden', '智能庭院与灌溉', '🌿', 'smart', ['小米', '拓乐', 'Rain Bird', 'Hunter', '博世', '牧田', '大疆', 'Husqvarna', '科沃斯'], '智能浇灌:irrigation|智能庭院灯:gardenlight|割草机器人:mower|智能围栏:fence|庭院音响:audio|智能喷灌:sprinkler|雨量传感器:rain|庭院监控:cam|智能花盆:pot|温室控制器:greenhouse|喂鸟器:birdfeeder|泳池清洁:pool', 3600, '太阳能:solar|市电:mains'),
    B('router', '路由器', '📡', 'network', ['华硕', '小米', 'TP-LINK', '网件', '华为', '中兴', '华三', '领势', '爱快', '锐捷'], '家用路由器:home|电竞路由器:esports|企业路由器:biz|Mesh 组网:mesh|随身 WiFi:mifi|软路由:soft|4G 路由器:4g|5G 路由器:5g|电力猫:plc|AP 接入点:ap|旁路由:side', 9000, 'WiFi 5:wifi5|WiFi 6:wifi6|WiFi 6E:wifi6e|WiFi 7:wifi7|万兆:10g'),
    B('nas', '网络存储', '🗄️', 'network', ['群晖', '威联通', '极空间', '绿联', '海康威视', '华芸', '铁威马'], '双盘位 NAS:2bay|四盘位 NAS:4bay|六盘位 NAS:6bay|企业级 NAS:enterprise|NAS 硬盘柜:das|私有云:cloud|软路由 NAS:soft', 3400, 'x86:x86|ARM:arm'),
    B('pet-device', '宠物智能设备', '🐾', 'smart', ['小米', 'CATLINK', '霍曼', '有陪', '小佩', 'petkit'], '智能喂食器:feeder|智能饮水机:fountain|智能猫砂盆:litter|宠物摄像头:cam|智能项圈:collar|宠物烘干箱:box|智能鱼缸:aquarium|宠物玩具:toy', 2400),
    B('baby-monitor', '母婴智能', '👶', 'smart', ['小米', '华为', '海马爸比', '小白', '萤石', '小值', '爱贝适', '美德时'], '婴儿监护器:monitor|智能体温计:thermo|智能摇篮:cradle|吸奶器:pump|智能尿湿:diaper|儿童摄像头:cam|智能餐椅:chair|婴儿秤:scale|智能牙刷:brush|防丢器:tracker', 2800, 'WiFi:wifi|离线:offline'),
    B('smart-kitchen-iot', '智能厨房小电', '🍽️', 'smart', ['小米', '美的', '苏泊尔', '九阳', '松下', '飞利浦'], '智能电饭煲:rice|智能热水壶:kettle|智能空气炸锅:fryer|智能咖啡机:coffee|智能破壁机:blender|智能养生壶:pot|智能炒菜机:cooker|净饮机:water', 4500)
  ]},
  { id: 'home-appliance', name: '厨房与生活电器', icon: '🍳', bases: [
    B('kitchen', '厨房电器', '🍳', 'appliance', ['德龙', '美善品', '米家', '苏泊尔', '九阳', '美的', '松下', '飞利浦', 'Breville', '西门子', '博世', '老板', '方太'], '咖啡机:coffee|电饭煲:rice|空气炸锅:fryer|破壁机:blender|料理机:processor|蒸烤箱:oven|微波炉:microwave|净水器:purifier|电热水壶:kettle|油烟机:hood|洗碗机:dishwasher|电磁炉:induction|厨师机:mixer|面包机:bread|豆浆机:soy|绞肉机:mincer|电压力锅:pressure|电饼铛:griddle|酸奶机:yogurt|制冰机:ice|多士炉:toaster|电蒸锅:steamer|气泡水机:sparkling|炒菜机器人:robot|嵌入式一体机:builtin|母婴温奶器:warmer|冰淇淋机:gelato|真空封口机:sealer|食物烘干机:dehydrator|电动开罐器:opener', 16000, '台式:counter|嵌入式:builtin'),
    B('cleaning', '清洁电器', '🧹', 'appliance', ['戴森', '追觅', '必胜', '石头', '科沃斯', '小米', '美的', '莱克', '卡赫'], '洗地机:wetdry|吸尘器:vacuum|扫地机器人:robot|擦窗机器人:window|蒸汽清洁机:steam|除螨仪:mite|高压洗车机:wash|消毒柜:sterilize|超声波清洗机:ultrasonic', 9500, '无线:wireless|有线:corded'),
    B('climate', '环境电器', '🌬️', 'appliance', ['戴森', 'Blueair', '小米', '松下', '智米', '美的', '格力', '大金', '霍尼韦尔', '352'], '空气净化器:purifier|新风机:fresh|除湿机:dehumid|加湿器:humid|电风扇:fan|取暖器:heater|空调:ac|智能温控器:thermostat|甲醛检测仪:ch2o|循环扇:circulator|暖风机:warmfan|冷风扇:coolfan|冰柜:freezer|酒柜:winecooler|恒温箱:incubator', 11500, '家用:home|商用:biz'),
    B('laundry', '洗护电器', '🫧', 'appliance', ['海尔', '小天鹅', '西门子', '博世', '松下', '美的', '石头', 'LG', '三星', '卡萨帝'], '洗衣机:washer|洗烘一体机:combo|烘干机:dryer|洗烘套装:set|挂烫机:steamer|电熨斗:iron|衣物护理机:care|缝纫机:sewing|锁边机:overlock|织物蒸汽护理:fabriccare|熨烫台:board', 7000, '滚筒:drum|波轮:pulse|迷你:mini')
  ]},
  { id: 'iot-diy', name: '物联网与电子 DIY', icon: '🔌', bases: [
    B('devboard', '开发板', '🧰', 'iot', ['Raspberry Pi', 'NVIDIA', 'Arduino', 'Seeed Studio', '乐鑫', 'BeagleBoard', 'Micro:bit', '香橙派', '全志', '瑞芯微'], '树莓派:rpi|Jetson 开发板:jetson|Arduino 开发板:arduino|RISC-V 开发板:riscv|FPGA 开发板:fpga|国产开发板:cn|工业开发板:industrial|AI 开发板:ai|多媒体开发板:media', 7000, '官方:official|兼容板:compatible'),
    B('mcu', '单片机', '🔲', 'iot', ['ST', '乐鑫', 'Arduino', 'Microchip', 'NXP', '兆易创新', '合宙', '沁恒', '国民技术', '灵动微'], '51 单片机:51|STM32 系列:stm32|ESP32 系列:esp32|ESP8266:esp8266|合宙系列:luatos|AVR 单片机:avr|PIC 单片机:pic|RISC-V MCU:riscv|树莓派 Pico:pico|国产 MCU:cn|CPLD 可编程:cpld', 9000, '开发板:board|最小系统板:mini|核心模组:module'),
    B('iot-module', '物联网模块', '📶', 'iot', ['移远', '广和通', '乐鑫', '涂鸦', '中移物联', 'Sierra', 'u-blox'], '4G 模组:4g|5G 模组:5g|WiFi 模组:wifi|蓝牙模组:ble|Zigbee 模组:zigbee|LoRa 模组:lora|NB-IoT 模组:nbiot|GNSS 定位模组:gnss|RFID 模组:rfid|Matter 模组:matter|以太网模组:eth', 7500, 'UART 接口:uart|SPI 接口:spi|USB 接口:usb'),
    B('sensor-module', '传感器模块', '🧷', 'iot', ['Seeed Studio', 'DFRobot', '禾赛', '奥比中光', '博世', 'TDK', '汉威', '炜盛', '维特智能'], '温湿度模块:th|红外模块:ir|超声波模块:ultra|IMU 模块:imu|摄像头模块:cam|气体传感器模块:gas|压力传感器模块:pressure|光敏模块:light|雷达模块:radar|指纹模块:fp|称重模块:weight|TOF 测距:tof|电流检测模块:current|电压检测模块:voltage|编码器模块:encoder|继电器扩展:relay|语音识别模块:voice|OLED 显示模块:oled', 10000, '模拟输出:analog|数字输出:digital'),
    B('motor', '电机与驱动', '⚙️', 'iot', ['Dynamixel', '雷赛', '鸣志', '幻尔', '拓达', '东方马达', '日本电产'], '舵机:servo|步进电机:stepper|直流无刷电机:brushless|伺服驱动器:driver|电机驱动板:board|减速电机:gear|直线电机:linear|云台电机:gimbal', 5500, '12V:12v|24V:24v|48V:48v|高压:hv'),
    B('power-module', '电源模块', '🔋', 'iot', ['明纬', '台达', '金升阳', '伟创力', '艾德克斯', '优利德'], 'DC-DC 模块:dcdc|锂电池模块:li|太阳能控制器:solar|UPS 电源:ups|可调电源:bench|无线供电模块:wireless|充电管理模块:charge|超级电容:cap', 4500, '隔离型:iso|非隔离型:noniso'),
    B('diy-tool', '电子工具与仪器', '🛠️', 'instrument', ['泰克', '是德', '优利德', '普源', 'FNIRSI', 'JBC', '白光', '拓竹', '创想三维', 'ZLG'], '示波器:scope|万用表:multimeter|逻辑分析仪:logic|电烙铁:solder|热风枪:hotair|电源发生器:psu|频谱分析仪:sa|编程器:programmer|3D 打印机:3dp|激光雕刻机:laser|CNC 雕刻机:cnc|面包板套件:breadboard|焊接台:station|电子负载:load', 8500, '手持:hand|台式:bench'),
    B('measure-tool', '测量与检测仪器', '📏', 'instrument', ['博世', '得力', '优利德', '华盛昌', '胜利', '福禄克', '泰克', '标智', '希玛', '海康微影'], '激光测距仪:dist|激光水平仪:level|热成像仪:thermal|工业内窥镜:scope|金属探测器:metal|噪音计:spl|照度计:lux|辐射检测仪:rad|数显卡尺:caliper|红外测温枪:irtherm|风速仪:anemo|温湿度记录仪:logger|测厚仪:thick|转速表:tacho|钳形电流表:clamp|土壤检测:soil|水质检测:water|甲醛检测仪:ch2o', 7200, '手持:hand|台式:bench'),
    B('power-tool', '电动工具', '🔧', 'instrument', ['博世', '得伟', '牧田', '东成', '威克士', '大有', '史丹利', '喜利得', '锐奇'], '手电钻:drill|冲击钻:hammer|电动螺丝刀:screw|角磨机:grinder|电锤:rotaryhammer|电磨机:rotary|热熔胶枪:glue|电动扳手:wrench|电动剪:shear|激光水平仪:level|充电式电钻:cordless|电动曲线锯:jigsaw|砂光机:sander|吹风机:blower|电动割草机:mower', 6800, '锂电:li|插电:corded'),
    B('relay-module', '继电器与开关模块', '🔀', 'iot', ['Seeed Studio', 'DFRobot', '欧姆龙', '宏发', '松乐'], '单路继电器:1ch|多路继电器:multi|固态继电器:ssr|MOS 管模块:mos|光耦隔离模块:opto|大电流模块:high', 3400, 'WiFi:wifi|Zigbee:zigbee|蓝牙:ble'),
    B('components', '电子元器件', '🧬', 'iot', ['德州仪器', 'ST', 'NXP', '村田', '太阳诱电', '国巨', '风华高科', '三星', '东芝', '安森美', '意法半导体', '亚德诺'], '贴片电阻:resistor|贴片电容:cap|贴片电感:inductor|二三极管:diode|芯片 IC:ic|连接器:connector|晶振:xtal|继电器:relay|PCB 板:pcb|电源管理芯片:pmic|运放芯片:opamp|单片机芯片:mcu|传感器元件:sensor|散热片:heatsink|轻触开关:switch|保险丝:fuse|接插件端子:terminal|蜂鸣器:buzzer|LED 灯珠:led|三极管阵列:array', 9500, '插件:tht|贴片:smd'),
    B('battery', '电池与储能', '🔋', 'power', ['宁德时代', '比亚迪', '松下', '三星 SDI', 'LG 新能源', '亿纬锂能', '国轩高科', '天能', '超威', '南孚', 'GP 超霸'], '锂电池:li|18650 电芯:18650|纽扣电池:button|充电电池:recharge|铅酸电池:lead|移动储能:powerstation|电池组:pack|电池管理 BMS:bms|太阳能储能:solar|磷酸铁锂:lfp|镍氢电池:nimh|聚合物电池:polymer', 6200, '家用:home|工业:industrial'),
    B('robot', '机器人', '🤖', 'robot', ['大疆', '宇树', '优必选', 'LEGO', '幻尔', 'myCobot', 'Adeept', '乐高', '能力风暴'], '教育机器人:edu|机器狗:dog|人形机器人:humanoid|机械臂:arm|编程机器人:code|陪伴机器人:companion|送餐机器人:serve|竞赛机器人:contest|水下机器人:rov|轮式机器人:wheeled|履带机器人:tracked', 5500),
    B('3d-printer', '3D 打印与制造', '🖨️', 'instrument', ['拓竹', '创想三维', '闪铸', '纵维立方', 'Formlabs', 'Prusa'], 'FDM 3D 打印机:fdm|光固化 3D 打印机:resin|3D 扫描仪:scan|耗材:filament|激光切割机:cut|真空注型机:cast', 3800, '桌面级:desktop|工业级:industrial')
  ]},
  { id: 'network-office', name: '网络与办公', icon: '🖧', bases: [
    B('network-device', '网络设备', '🌐', 'network', ['华为', '华三', 'TP-LINK', '锐捷', '思科', 'Juniper', 'UBNT', '中兴', '爱快', '网件'], '交换机:switch|无线 AP:ap|光猫:modem|防火墙:firewall|上网行为管理:ac|SD-WAN 设备:sdwan|企业网关:gateway|KVM 切换器:kvm|光纤收发器:fiber|串口服务器:serial|负载均衡:loadbalance', 8000, '网管型:managed|非网管型:unmanaged'),
    B('peripheral', '电脑外设', '⌨️', 'peripheral', ['罗技', '雷蛇', '樱桃', '斐尔可', 'HHKB', '海盗船', '杜伽', 'IKBC', '绿联', 'CalDigit', 'Wacom', '明基', '兄弟'], '机械键盘:mech|客制化键盘:custom|游戏鼠标:gaming|办公鼠标:office|触控板:trackpad|显示器支架:arm|扩展坞:dock|读卡器:reader|摄像头:webcam|鼠标垫:pad|手写板:tablet|扫描仪:scanner|碎纸机:shredder|考勤机:attendance|键帽:keycaps|键盘轴体:switch|桌面音箱支架:stand|理线器:clip', 18000),
    B('video-conf', '视频会议', '📹', 'peripheral', ['罗技', '华为', 'Poly', 'Jabra', '亿联', '小鱼易连', 'MAXHUB', '皓丽', '索尼'], '会议摄像头:cam|会议全向麦:mike|一体会议机:allinone|视频会议终端:terminal|电子白板:whiteboard|演示器:presenter', 3000),
    B('printer', '打印机', '🖨️', 'peripheral', ['惠普', '佳能', '爱普生', '兄弟', '联想', '拓竹', '创想三维', '闪铸', '得力', '汉印'], '喷墨打印机:inkjet|激光打印机:laser|3D 打印机:3d|热敏打印机:thermal|标签打印机:label|针式打印机:dot|工程绘图仪:plotter|照片打印机:photo|塑封机:laminator|装订机:binder|覆膜机:film', 6000, '家用:home|商用:biz'),
    B('drawing-display', '数位屏与创作板', '🎨', 'display', ['Wacom', '和冠', '绘王', '高漫', '苹果', '微软', 'XPPen', '友基'], '数位屏:screen|手绘屏:pen|数位板:tablet|绘画平板:slate|压感笔:stylus|透写台:lightpad', 3200, '压感 8192:pro|压感 4096:mid')
  ]},
  { id: 'vehicle', name: '车载与出行', icon: '🚗', bases: [
    B('car-electronics', '车载电子', '🚗', 'vehicle', ['70 迈', '盯盯拍', '凌渡', 'Garmin', '小米', '飞利浦', '索尼', '先锋', '阿尔派'], '行车记录仪:dashcam|车载导航:nav|车载充电:charger|HUD 抬头显示:hud|胎压监测:tpms|车载音响:audio|车载冰箱:fridge|车载净化器:purifier|OBD 检测:obd|流媒体后视镜:mirror|车载吸尘器:vacuum|无线充支架:magmount|车载按摩垫:mat|应急启动电源:jump|车载加湿器:humid|电子狗雷达:radar|车载充气泵:pump|车载香氛:fragrance|车载对讲:intercom|OBD 盒子:obdbox', 9000, '通用:universal|专车专用:oem'),
    B('ev-charger', '新能源充电', '⚡', 'vehicle', ['特来电', '星星充电', '挚达', '特斯拉', '小米', '蔚来', '普诺得', '公牛'], '家用充电桩:home|便携充电枪:portable|直流快充桩:dc|充电模块:module|V2G 设备:v2g|电池检测仪:tester', 2400, '7kW:7kw|11kW:11kw|21kW 以上:21kw'),
    B('mobility', '智能出行', '🛴', 'vehicle', ['小米', 'Ninebot', '雅迪', '小牛', '大疆', '崔克', '佳明', '迈金'], '电动滑板车:scooter|电动自行车:ebike|平衡车:balance|电动摩托车:moto|智能头盔:helmet|骑行码表:computer|电动车电池:battery', 3800),
    B('outdoor', '户外电子', '🏕️', 'vehicle', ['正浩', '华宝新能', '电小二', '小米', '摩托罗拉', '宝锋', 'Garmin', '纳丽德'], '户外电源:power|太阳能板:solar|对讲机:radio|GPS 手持机:gps|户外手表:watch|头灯:headlamp|露营灯:lantern|卫星通信器:sat|户外投影:projector|车载电台:rig', 5500)
  ]},
  { id: 'edu-b2b', name: '教育与商用', icon: '📚', bases: [
    B('edu', '教育电子', '📚', 'iot', ['科大讯飞', '有道', '步步高', '小天才', '希沃', '读书郎', '优学派', '阿尔法蛋', '卡西欧', '罗兰'], '学习机:study|词典笔:pen|翻译机:translator|早教机:kids|智能钢琴:piano|电子鼓:drum|点读笔:reader|错题打印机:printer|智能画板:board|编程教具:code|电子辞典:dict|护眼灯:eyelamp|智能书桌:desk|天文望远镜:telescope|显微镜:microscope', 7000),
    B('calculator', '计算器与办公文具', '🧮', 'iot', ['卡西欧', '得力', '德州仪器', '惠普', '夏普', '晨光', '齐心', '三木'], '科学计算器:sci|图形计算器:graph|函数计算器:func|办公计算器:office|语音计算器:voice|编程计算器:code|电子词典:dict|标签机:label|考勤机:attendance|点钞机:count', 1800, '学生用:student|办公用:office'),
    B('commercial', '商用设备', '🏢', 'iot', ['商米', '美团', '阿里', '京东', '海尔', '新大陆', '联迪', '中科英泰', '视源'], '收银机:pos|POS 终端:terminal|自助终端:kiosk|电子价签:esl|排队叫号:queue|门禁闸机:gate|快递柜:locker|售货机:vending|点餐机:order|商显广告机:signage|盘点机:pda|条码扫描枪:barcode|钱箱:drawer|收银秤:scale|热敏小票机:receipt|验钞机:bill|访客机:visitor|呼叫器:buzzer', 4800),
    B('megaphone', '扩音与广播设备', '📢', 'audio', ['得胜', '爱课', '漫步者', '先科', '新科', '长虹', '惠威', '哈曼卡顿'], '扩音器:megaphone|喊话器:bullhorn|校园广播:pa|会议音响:conference|拉杆音箱:trolley|调音台:mixer|无线话筒套装:wireless|公共广播:ip', 2800, '有线:wired|无线:wireless'),
    B('medical', '医疗电子', '🩺', 'instrument', ['欧姆龙', '鱼跃', '三诺', '强生', '罗氏', '乐普', '华为', '苹果', 'Withings'], '电子血压计:bp|血糖仪:glucose|血氧仪:spo2|心电记录仪:ecg|电子听诊器:stetho|雾化器:nebulizer|理疗仪:therapy|睡眠监测:sleep|智能药盒:pill|助听器:hearing|胎心仪:fetal|排卵监测:ovulation|体外除颤器:aed|呼吸机:cpap|制氧机:oxygen|轮椅:wheelchair|助行器:walker|康复训练:rehab|听力计:audiometer', 5500)
  ]},
  { id: 'power-charge', name: '充电与电源', icon: '🔋', bases: [
    B('powerbank', '充电储能', '🔋', 'power', ['Anker', '小米', '紫米', '绿联', '倍思', '罗马仕', '品胜', '公牛'], '充电宝:bank|氮化镓充电器:gan|无线充电器:wireless|移动电源:power|车充:car|太阳能充电宝:solar|多口充电器:multi|笔记本电源适配器:adapter', 8000, '20W:20w|65W:65w|100W 以上:100w'),
    B('powerbank-case', '充电配件', '🔌', 'power', ['Anker', '绿联', '倍思', '小米'], '数据线:cable|快充线:fastcable|磁吸线:magsafe|插线板:strip|转换插头:travel|电池盒:batterycase', 4000)
  ]},
  { id: 'robot-clean', name: '清洁机器人', icon: '🤖', bases: [
    B('robot-vacuum', '扫地机器人', '🧹', 'robot', ['石头', '科沃斯', '追觅', 'iRobot', '云鲸', '小米', '美的', '海尔'], '扫拖一体机:combo|纯扫机器人:scan|自清洁机器人:selfclean|集尘机器人:dustbin|洗地机器人:wash|割草机器人:mow', 12000, 'LDS 激光导航:lds|视觉导航:vslam|dToF 导航:dtof')
  ]},
  { id: 'vintage', name: '海外经典与上世纪机型', icon: '🕰️', bases: [
    B('retro-computer', '复古电脑', '🖥️', 'compute', ['苹果', 'IBM', 'Commodore', 'Atari', 'Sinclair', 'Amstrad', '夏普', 'NEC', '富士通', '康柏', '戴尔', '惠普', '联想', '苹果', '松下', '东芝', 'AST', 'Packard Bell'], '8 位家用电脑:8bit|16 位家用电脑:16bit|老式台式机:desktop|复古笔记本:portable|复古一体机:aio|软盘时代工作站:workstation|学习机:educomputer', 9000),
    B('retro-phone', '功能机与早期手机', '📱', 'phone', ['诺基亚', '摩托罗拉', '爱立信', '西门子', '索尼爱立信', '松下', '三星', '飞利浦', '阿尔卡特', '波导', '夏新', '东信'], '大哥大:brick|功能手机:feature|翻盖手机:flip|直板手机:bar|滑盖手机:slider|早期智能手机:pda|小灵通:pas|对讲式手机:radio', 9000),
    B('retro-audio', '随身听与复古音响', '🎧', 'audio', ['索尼', '松下', '爱华', '三洋', '东芝', '胜利', '建伍', '飞利浦', '夏普', '山水', '健伍', '安桥'], '磁带随身听:walkman|CD 随身听:discman|MD 播放器:md|迷你音响:mini|卡带收录机:boombox|晶体管收音机:radio|黑胶唱机:turntable|复古功放:amp', 8000),
    B('retro-tv', 'CRT 电视与显示', '📺', 'display', ['索尼', '松下', '夏普', '东芝', '日立', 'JVC', '飞利浦', '三洋', '金星', '长虹', '牡丹'], 'CRT 电视:crt|背投电视:projection|便携小电视:portable|黑白电视:mono|彩电:color|CRT 显示器:monitor', 6000),
    B('retro-console', '复古游戏机', '🎮', 'gaming', ['任天堂', '世嘉', '雅达利', 'NEC', 'SNK', '索尼', '卡西欧', '万代', 'Tiger'], '8 位主机:8bit|16 位主机:16bit|32 位主机:32bit|复古掌机:handheld|街机基板:arcade|电子宠物:virtualpet|复古游戏手表:watch', 6000),
    B('retro-camera', '胶片与复古影像', '📷', 'imaging', ['柯达', '宝丽来', '尼康', '佳能', '美能达', '奥林巴斯', '徕卡', '禄来', '雅西卡', '确善能', '富士'], '傻瓜胶片机:compact|单反胶片机:slr|旁轴相机:rangefinder|一次成像相机:instant|胶片电影机:cine|箱式相机:box|折叠皮腔机:folding', 7000)
  ]}
  ];

  /* ---------- 展开为 leaf 注册表 ---------- */
  var leaves = [];
  var leafById = {};
  groups.forEach(function (g) {
    g.leaves = [];
    g.bases.forEach(function (b) {
      var combos = [];
      if (b.cross.length && b.variants.length) {
        b.variants.forEach(function (v) {
          b.cross.forEach(function (c) {
            combos.push({ label: v.label + ' ' + c.label, slug: v.slug + '-' + c.slug });
          });
        });
      } else if (b.variants.length) {
        combos = b.variants;
      }
      var root = { id: b.id, name: b.name, icon: b.icon, kind: b.kind,
        groupId: g.id, groupName: g.name, baseId: b.id, baseName: b.name,
        brands: b.brands, weight: Math.round(b.weight * 0.18) };
      leaves.push(root); leafById[root.id] = root; g.leaves.push(root);
      combos.forEach(function (v) {
        var leaf = { id: b.id + '-' + v.slug, name: b.name + ' · ' + v.label, icon: b.icon,
          kind: b.kind, groupId: g.id, groupName: g.name, baseId: b.id, baseName: b.name,
          variant: v.label, brands: b.brands, weight: Math.round(b.weight * 0.82 / combos.length) };
        leaves.push(leaf); leafById[leaf.id] = leaf; g.leaves.push(leaf);
      });
    });
  });

  var TREE = {
    version: 5,
    groups: groups,
    leaves: leaves,
    leafById: leafById,
    stats: {
      groups: groups.length,
      bases: groups.reduce(function (n, g) { return n + g.bases.length; }, 0),
      leaves: leaves.length,
      totalWeight: leaves.reduce(function (n, l) { return n + l.weight; }, 0)
    }
  };

  root.DB_CATEGORY_TREE = TREE;
  if (typeof module !== 'undefined' && module.exports) module.exports = TREE;
})(
  typeof window !== 'undefined' ? window :
  typeof globalThis !== 'undefined' ? globalThis : this
);
