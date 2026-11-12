#!/usr/bin/env node
/* ============================================================
   tools/gen-bulk-v2.js
   演示（合成）数据生成器 v2 —— 按品类 kind 模板生成规范数据：
     · 参数表来自同 kind 参数池（不再出现「3D 打印机带示波器参数」的参数沙拉）
     · 价格区间按 kind 约束，年份加权散布 1954–2024（不再 96% 挤在 2020s）
     · 命名 = 品牌 + 系列 + 型号（不再用品类词当产品名、不再 "Brand Brand"）
     · pros/cons 组合去重（不再 1,408 条重复文案）
     · 每条带 source:'bulk' + synthetic:true 溯源字段（问题 45）
   用法： node tools/gen-bulk-v2.js [--count 10000] [--per-shard 200] [--seed 20261112]
   输出： data/gen/bulk-static-NN.js（覆盖旧 bulk-static-*，多余旧文件自动清理）
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'data', 'gen');

const args = process.argv.slice(2);
const argNum = (name, dft) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : dft;
};
const COUNT = argNum('count', 10000);
const PER_SHARD = argNum('per-shard', 200);
const SEED = argNum('seed', 20261112);

/* ---- 确定性 RNG（mulberry32）：同 seed 产出完全一致 ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
const ri = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));   // 整数 [lo,hi]
const rf = (lo, hi, d) => +(lo + rng() * (hi - lo)).toFixed(d == null ? 1 : d);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

/* ---- 品类树 ---- */
const treeWin = {};
new Function('window', fs.readFileSync(path.join(ROOT, 'data', 'categories.js'), 'utf8'))(treeWin);
const TREE = treeWin.DB_CATEGORY_TREE || { groups: [] };
const BASES = [];
for (const g of TREE.groups || []) for (const b of g.bases || []) BASES.push(b);

/* ---- kind 模板：specs 值生成器 + 系列词 + 卖点 + 优缺点 + 价格区间 + 评分维度 ---- */
/* 每个 kind 的参数键固定属于本品类语义域，杜绝跨品类参数混搭 */
const KIND = {
  phone: {
    price: [400, 9999], dims: ['屏幕素质', '性能', '续航', '影像', '系统'],
    series: ['Nova', 'Aurora', 'Vertex', 'Prime', 'Edge', 'Lite', 'Ultra', 'Max', 'Neo', 'Air'],
    points: ['影像调校', '轻薄手感', '性能释放', '续航表现', '屏幕观感'],
    specs: [
      ['屏幕', (r) => r.rf(5.4, 7.0) + ' 英寸 OLED · ' + r.pick(['120Hz', '90Hz', '60Hz', '144Hz'])],
      ['处理器', (r) => r.pick(['骁龙 8 系', '天玑 9000 系', 'A 系仿生', 'Exynos 旗舰', '骁龙 7 系'])],
      ['内存', (r) => r.pick(['8GB', '12GB', '16GB', '6GB'])],
      ['存储', (r) => r.pick(['128GB', '256GB', '512GB', '1TB'])],
      ['电池', (r) => r.ri(3200, 6000) + 'mAh'],
      ['充电', (r) => r.pick(['25W', '45W', '67W', '120W', '80W']) + ' 快充'],
      ['后置影像', (r) => r.pick(['5000 万主摄 + 超广角', '1.08 亿主摄 + 长焦', '4800 万三摄', '6400 万双摄'])],
      ['防护', (r) => r.pick(['IP68', 'IP67', 'IP54', '生活防泼溅'])],
      ['重量', (r) => r.ri(155, 235) + 'g'],
      ['接口', () => 'USB-C']
    ],
    pros: ['屏幕观感出色', '性能释放激进', '夜景成像干净', '系统更新周期长', '握持手感轻盈',
      '快充回血迅速', '振动马达质感好', '信号表现稳定', '影像玩法丰富', '散热堆料扎实',
      '扬声器外放通透', '配件生态丰富'],
    cons: ['无线充电缺席', '长焦端画质一般', '机身偏重', '附赠壳质感一般', '夜景涂抹感略重',
      '高负载发热明显', '缺少 3.5mm 接口', '曲面屏边缘偏色', '待机功耗偏高', '溢价偏高']
  },
  compute: {
    price: [1999, 29999], dims: ['性能', '屏幕', '续航', '扩展性', '便携'],
    series: ['Book', 'Mate', 'Pro', 'Air', 'Studio', 'Creator', 'Slim', 'Max', 'Nano', 'Flex'],
    points: ['性能释放', '屏幕素质', '扩展接口', '便携性', '静音表现'],
    specs: [
      ['屏幕', (r) => r.pick(['13.3', '14', '15.6', '16', '17.3']) + ' 英寸 ' + r.pick(['IPS', 'OLED', 'mini-LED']) + ' · ' + r.pick(['2560×1600', '1920×1080', '3072×1920', '3456×2234'])],
      ['处理器', (r) => r.pick(['酷睿 i7', '酷睿 i9', '锐龙 7', '锐龙 9', 'M 系列', '至强移动版'])],
      ['内存', (r) => r.pick(['16GB', '32GB', '64GB', '8GB']) + ' LPDDR5'],
      ['硬盘', (r) => r.pick(['512GB', '1TB', '2TB']) + ' NVMe SSD'],
      ['显卡', (r) => r.pick(['核芯显卡', 'RTX 4060', 'RTX 4070', 'RTX 4050', '专业图形卡'])],
      ['电池', (r) => r.ri(50, 100) + 'Wh'],
      ['重量', (r) => r.rf(1.0, 2.8) + 'kg'],
      ['接口', () => '雷电 4 ×2 · USB-A · HDMI'],
      ['键盘', () => '1.5mm 键程背光键盘']
    ],
    pros: ['性能释放稳定', '屏幕色准优秀', '键盘手感扎实', '接口齐全', '风噪控制得当',
      '续航超出预期', '机身做工精致', '扩展内存可换', '触控板面积大', '扬声器素质高',
      '摄像头带物理开关', '充电器小巧'],
    cons: ['高负载风扇声明显', '内存板载不可升级', '屏幕反光明显', '电源适配器偏大', '方向键半高',
      '指纹识别位置别扭', '摄像头画质一般', '机身偏重', '价格偏贵', '接口偏少']
  },
  audio: {
    price: [99, 6999], dims: ['音质', '降噪', '续航', '佩戴', '连接'],
    series: ['Studio', 'Pulse', 'Aero', 'Wave', 'Tune', 'Sonic', 'Quiet', 'Beat', 'Pro', 'Go'],
    points: ['降噪深度', '调音风格', '佩戴舒适', '续航表现', '通话质量'],
    specs: [
      ['类型', (r) => r.pick(['头戴式', '入耳式', '真无线', '颈挂式', '开放式'])],
      ['单元', (r) => r.pick(['40mm 动圈', '10mm 动圈', '圈铁混合', '平板振膜', '12mm 复合振膜'])],
      ['降噪', (r) => r.pick(['主动降噪 -42dB', '主动降噪 -35dB', '主动降噪 -30dB', '被动降噪'])],
      ['蓝牙', (r) => r.pick(['蓝牙 5.3', '蓝牙 5.2', '蓝牙 5.4']) + ' · ' + r.pick(['SBC/AAC/LDAC', 'SBC/AAC', 'SBC/AAC/aptX Adaptive'])],
      ['续航', (r) => r.ri(6, 60) + ' 小时（含充电盒）'],
      ['充电', (r) => r.pick(['USB-C 快充 10 分钟听 3 小时', '无线充电支持', 'USB-C 充电'])],
      ['防护', (r) => r.pick(['IPX4', 'IPX5', 'IP55', 'IPX2'])],
      ['重量', (r) => r.ri(5, 320) + 'g'],
      ['编解码', (r) => r.pick(['LDAC', 'LDAC / LHDC', 'aptX HD', 'AAC / SBC'])]
    ],
    pros: ['降噪深度同价位突出', '低频下潜有力', '佩戴久戴不累', 'App 调音可玩性高', '通话收音清晰',
      '多设备切换顺畅', '折叠收纳方便', '高频通透不刺耳', '人声贴耳自然', '做工质感越级',
      '无线充电补齐', '游戏模式延迟低'],
    cons: ['低频量感偏多', '降噪耳压感明显', '通话降噪一般', 'App 功能臃肿', '不支持多点连接',
      '佩戴稳固性一般', '高频毛刺感', '收纳盒偏大', '触控易误触', '通话麦克风偏远']
  },
  display: {
    price: [699, 29999], dims: ['画质', '色彩', '刷新率', '接口', '做工'],
    series: ['Vision', 'Ultra', 'Pro', 'Edge', 'Creator', 'Game', 'Slim', 'Max', 'Q', 'O'],
    points: ['面板素质', '色准表现', '游戏响应', '接口配置', '支架设计'],
    specs: [
      ['尺寸', (r) => r.pick(['24', '27', '32', '34', '42', '55', '65', '75']) + ' 英寸'],
      ['面板', (r) => r.pick(['IPS', 'VA', 'OLED', 'mini-LED', 'QD-OLED', 'Fast-IPS'])],
      ['分辨率', (r) => r.pick(['2560×1440', '3840×2160', '1920×1080', '3440×1440', '5120×2160'])],
      ['刷新率', (r) => r.pick(['60Hz', '75Hz', '144Hz', '165Hz', '240Hz'])],
      ['色域', (r) => r.pick(['99% sRGB', '98% DCI-P3', '95% DCI-P3', '100% sRGB', '99% AdobeRGB'])],
      ['亮度', (r) => r.ri(250, 1200) + 'nit'],
      ['HDR', (r) => r.pick(['HDR400', 'HDR600', 'HDR10', 'Dolby Vision', '无'])],
      ['接口', () => 'HDMI 2.1 ×2 · DP 1.4 · USB-C'],
      ['响应', (r) => r.pick(['1ms GTG', '2ms GTG', '4ms GTG', '0.03ms GTG'])]
    ],
    pros: ['色准出厂校准', '暗部细节保留好', '支架调节维度丰富', '接口给得足', '游戏拖影控制好',
      '亮度激发积极', 'OSD 菜单逻辑清晰', '做工扎实不晃', '内置音箱够用', 'Type-C 一线连',
      '背光均匀性好', '响应速度同级领先'],
    cons: ['可视角度一般', 'HDR 亮度不够激发', '支架占地大', 'OSD 按键手感差', '内置音箱听个响',
      '边框略宽', '漏光控制一般', '待机功耗偏高', '无 KVM', '遥控器做工一般']
  },
  imaging: {
    price: [899, 49999], dims: ['画质', '对焦', '操控', '视频', '便携'],
    series: ['X', 'Pro', 'R', 'S', 'Mini', 'Classic', 'Mark', 'Film', 'Zoom', 'Prime'],
    points: ['画质解析', '对焦性能', '色彩科学', '视频能力', '机身操控'],
    specs: [
      ['传感器', (r) => r.pick(['全画幅 CMOS', 'APS-C CMOS', 'M4/3 CMOS', '中画幅 CMOS', '1 英寸 CMOS'])],
      ['像素', (r) => r.pick(['2400 万', '3300 万', '4500 万', '6100 万', '1.02 亿'])],
      ['对焦', (r) => r.pick(['相位对焦 693 点', '混合对焦 425 点', '深度学习对焦', '十字对焦'])],
      ['连拍', (r) => r.pick(['8fps', '12fps', '20fps', '30fps 电子快门'])],
      ['视频', (r) => r.pick(['4K 60p', '4K 120p', '6K 30p', '8K 30p', '4K 30p'])],
      ['防抖', (r) => r.pick(['机身五轴防抖 5.5 档', '机身五轴防抖 7 档', '镜头防抖', '无机身防抖'])],
      ['取景器', (r) => r.pick(['369 万点 EVF', '236 万点 EVF', '光学旁轴取景', '576 万点 EVF'])],
      ['屏幕', (r) => r.pick(['3 英寸翻转触屏', '3.2 英寸翻折屏', '3 英寸固定屏'])],
      ['重量', (r) => r.ri(280, 900) + 'g（含电池）'],
      ['卡口', (r) => r.pick(['E 卡口', 'RF 卡口', 'Z 卡口', 'L 卡口', 'X 卡口', 'M4/3 卡口'])]
    ],
    pros: ['直出色彩讨喜', '对焦又快又稳', '高感控噪优秀', '翻转屏取景方便', '机身按键布局合理',
      '视频规格越级', '镜头群丰富', '续航扎实', '握持手柄饱满', 'EVF 观感细腻',
      '机身防护可靠', '快门声音清脆'],
    cons: ['菜单逻辑复杂', '机身发热明显', 'App 联机不稳定', '附赠电池续航一般', '屏幕素质一般',
      '视频裁切明显', '机身偏重', '翻转屏角度有限', '缺少耳机监听口', '高帧率果冻效应']
  },
  gaming: {
    price: [199, 6999], dims: ['性能', '屏幕', '操控', '续航', '生态'],
    series: ['Play', 'Box', 'Deck', 'Core', 'Arena', 'Quest', 'VR', 'One', 'Mini', 'Pro'],
    points: ['游戏阵容', '掌机体验', '性能表现', '手柄手感', '沉浸感'],
    specs: [
      ['平台', (r) => r.pick(['家用主机', '掌机', 'VR 一体机', '街机复刻'])],
      ['性能', (r) => r.pick(['4K 120fps', '4K 60fps', '1080p 120fps', '2K 90fps'])],
      ['存储', (r) => r.pick(['512GB', '1TB', '2TB', '64GB + 扩展'])],
      ['屏幕', (r) => r.pick(['7 英寸 IPS 120Hz', '6.8 英寸 OLED', 'LCD 60Hz', 'Micro-OLED'])],
      ['手柄', (r) => r.pick(['力反馈扳机', '霍尔摇杆', 'HD 震动', '触觉反馈'])],
      ['续航', (r) => r.ri(2, 12) + ' 小时'],
      ['网络', () => 'Wi-Fi 6 · 蓝牙 5.2'],
      ['重量', (r) => r.ri(180, 650) + 'g']
    ],
    pros: ['独占阵容强大', '掌机形态便携', '手柄震动质感一流', '休眠唤醒迅速', '散热控制得当',
      '屏幕色彩通透', '生态联动顺畅', 'VR 沉浸感强', '系统 UI 爽快', '风扇噪音低',
      '摇杆无漂移', '快充回血快'],
    cons: ['存储空间紧张', '续航偏短', '首发游戏少', '机身容易沾指纹', '配件偏贵',
      '系统功能简陋', '屏幕分辨率一般', '手柄握感偏小', '发热集中在背部', '订阅服务贵']
  },
  wearable: {
    price: [99, 8999], dims: ['健康监测', '续航', '屏幕', '系统', '佩戴'],
    series: ['Watch', 'Band', 'Fit', 'Pro', 'Ultra', 'Loop', 'Sense', 'Air', 'Ring', 'Glass'],
    points: ['健康监测', '运动模式', '续航表现', '屏幕观感', '生态联动'],
    specs: [
      ['屏幕', (r) => r.pick(['1.5 英寸 AMOLED', '1.9 英寸 LTPO', '1.32 英寸圆形 OLED', 'Micro-LED'])],
      ['健康', (r) => r.pick(['心率 / 血氧 / 睡眠', '心率 / 血氧 / ECG / 睡眠', '心率 / 压力 / 睡眠'])],
      ['定位', (r) => r.pick(['双频 GPS', 'GPS', 'GPS + 北斗 + GLONASS'])],
      ['续航', (r) => r.ri(6, 30) + ' 天'],
      ['防护', (r) => r.pick(['5ATM + IP68', 'IP68', '10ATM', 'IPX7'])],
      ['重量', (r) => r.ri(18, 65) + 'g（不含表带）'],
      ['系统', (r) => r.pick(['RTOS', 'Wear OS', '自研系统', 'watchOS 兼容'])]
    ],
    pros: ['健康数据维度全', '续航远超同类', '屏幕亮度充足', '表盘市场丰富', '运动模式识别准',
      '睡眠监测细腻', '表带亲肤舒适', '消息提醒及时', '充电速度快', 'GPS 轨迹精准',
      '扬声器通话清晰', '系统流畅跟手'],
    cons: ['第三方 App 少', '血氧仅供参考', '屏幕常亮耗电', '表带接口专有', '无线充电缺失',
      '运动轨迹偶尔漂移', '通知管理粗放', '机身偏厚', 'iOS 联动受限', '皮肤检测偶有误报']
  },
  network: {
    price: [129, 19999], dims: ['速率', '信号', '稳定性', '功能', '散热'],
    series: ['Mesh', 'Pro', 'AX', 'BE', 'Link', 'Grid', 'NAS', 'Home', 'Core', 'Max'],
    points: ['覆盖能力', '多设备并发', '组网体验', '读写性能', '静音表现'],
    specs: [
      ['无线', (r) => r.pick(['Wi-Fi 6 AX3000', 'Wi-Fi 6E AX5400', 'Wi-Fi 7 BE3600', 'Wi-Fi 5 AC1200'])],
      ['速率', (r) => r.ri(1200, 5400) + 'Mbps'],
      ['网口', () => '2.5G WAN/LAN ×1 · 千兆 ×3'],
      ['天线', (r) => r.ri(2, 8) + ' 高增益天线'],
      ['存储', (r) => r.pick(['无', 'M.2 插槽 ×2', '4 盘位', '2 盘位'])],
      ['散热', (r) => r.pick(['被动散热', '静音风扇', '主动风扇 ×2'])],
      ['内存', (r) => r.pick(['512MB', '1GB', '2GB', '4GB'])]
    ],
    pros: ['穿墙覆盖稳定', '多设备并发不掉速', '组网配对傻瓜化', '固件更新勤快', '2.5G 网口给足',
      '读写速度达标', '风扇噪音低', 'App 管理清晰', '散热设计合理', 'USB 扩展实用',
      '家长控制完善', '访客网络隔离好'],
    cons: ['固件偶发断流', '体积偏大', 'App 广告多', '高负载发热明显', 'IPv6 支持不完善',
      'USB 读写偏慢', '待机功耗偏高', '天线不可拆', '指示灯刺眼', '设置项藏得深']
  },
  smart: {
    price: [49, 6999], dims: ['智能化', '联动', '稳定性', '隐私', '安装'],
    series: ['Home', 'Sense', 'Guard', 'Link', 'Eye', 'Lock', 'Air', 'Go', 'Mini', 'Pro'],
    points: ['联动体验', '识别准确率', '安装门槛', '隐私保护', '本地化能力'],
    specs: [
      ['类型', (r) => r.pick(['智能音箱', '智能门锁', '摄像头', '灯具', '插座', '传感器', '网关'])],
      ['连接', (r) => r.pick(['Wi-Fi + 蓝牙', 'Zigbee 3.0', 'Matter over Thread', '蓝牙 Mesh'])],
      ['语音', (r) => r.pick(['双麦远场拾音', '四麦阵列', '本地语音唤醒', '无'])],
      ['传感器', (r) => r.pick(['人体存在 + 光照', '1080p 广角', '温湿度 + 气压', '门磁 + 震动'])],
      ['供电', (r) => r.pick(['内置电池 ' + r.ri(2000, 6000) + 'mAh', 'USB-C 供电', '干电池 ×' + r.ri(2, 4), '市电直供'])],
      ['本地化', (r) => r.pick(['支持本地执行', '支持 Matter', '支持 HomeKit', '仅云端'])]
    ],
    pros: ['联动场景丰富', '识别准确率高', '安装零门槛', '本地执行不依赖云', '隐私开关物理化',
      'App 配网顺畅', '固件更新稳定', '外观百搭', '功耗极低', '语音唤醒灵敏',
      '门锁指纹快', '夜视效果清晰'],
    cons: ['依赖厂商云', 'App 权限索取多', '配件偏贵', '误报率略高', '离线功能受限',
      '订阅才解锁云存储', '塑料感明显', '指示灯无法关闭', '配网偶发失败', '语音助手生态封闭']
  },
  iot: {
    price: [29, 3999], dims: ['稳定性', '协议', '功耗', '扩展', '易用'],
    series: ['Node', 'Link', 'Bridge', 'Sense', 'Cast', 'Pad', 'Talk', 'Hub', 'Mini', 'Air'],
    points: ['协议兼容', '功耗控制', '组网能力', '开发友好度', '稳定性'],
    specs: [
      ['协议', (r) => r.pick(['Zigbee 3.0', 'Z-Wave', 'Matter over Thread', 'Wi-Fi', 'LoRa', '蓝牙 Mesh'])],
      ['主控', (r) => r.pick(['ESP32-S3', 'nRF52840', 'RTL8720', '全志 T113', '瑞芯微 RV1106'])],
      ['供电', (r) => r.pick(['USB-C 5V', 'DC 12V', '锂电池 ' + r.ri(1000, 5000) + 'mAh', '干电池 ×' + r.ri(2, 4)])],
      ['传感器', (r) => r.pick(['温湿度 + 光照', '人体红外 + 微波', '烟雾 + 燃气', '门磁 + 震动', '无'])],
      ['天线', (r) => r.pick(['内置 PCB 天线', '外置 3dBi', '外置 5dBi'])],
      ['本地化', (r) => r.pick(['支持本地执行', '支持 MQTT', '支持开源固件', '仅云端'])]
    ],
    pros: ['协议兼容面广', '待机功耗极低', '开源固件可刷', '组网扩容无压力', 'App 配对简单',
      '传感器数据准', '天线信号扎实', '外壳可拆解', '支持 MQTT 自建', '看门狗不掉线',
      'OTA 升级稳', 'DIY 可玩性高'],
    cons: ['说明文档缺失', 'App 体验粗糙', '云服务依赖强', '外壳做工一般', '只支持 2.4G',
      '接线端子偏小', '散热依赖被动', '指示灯亮度刺眼', '无断电记忆', '恢复出厂难触发']
  },
  pcpart: {
    price: [99, 29999], dims: ['性能', '散热', '做工', '兼容', '静音'],
    series: ['Master', 'Edge', 'Forge', 'Prime', 'Titan', 'Core', 'Blade', 'X', 'Pro', 'Max'],
    points: ['性能释放', '散热规模', '堆料程度', '兼容性', '灯效同步'],
    specs: [
      ['类型', (r) => r.pick(['显卡', '处理器', '主板', '内存', '固态硬盘', '电源', '散热器', '机箱'])],
      ['规格', (r) => r.pick(['PCIe 5.0 ×16', 'AM5 / LGA1700', 'DDR5-6000', 'Gen4 ×4', 'ATX 3.0', '360 水冷'])],
      ['规模', (r) => r.pick(['16+2 相供电', '三风扇 3.2 槽', '双塔双风扇', '全模组 850W', '12 热管'])],
      ['灯效', (r) => r.pick(['ARGB 神光同步', 'ARGB', '无光', '单色灯'])],
      ['兼容', (r) => r.pick(['支持 E-ATX', '兼容 360 冷排', '限高 165mm', '支持 PCIe 4.0'])],
      ['质保', (r) => r.pick(['3 年质保', '5 年质保', '10 年质保', '终身质保'])]
    ],
    pros: ['性能释放激进', '散热堆料扎实', '供电规模豪华', '静音表现惊喜', '灯效同步顺畅',
      '兼容性覆盖广', 'PCB 做工规整', '背板金属加固', 'BIOS 更新勤快', '超频潜力足',
      '配线柔软好走线', '售后响应快'],
    cons: ['高负载噪音偏大', '体积巨大占空间', '价格溢价明显', '灯效软件臃肿', '供电接口偏多',
      '显存温度偏高', '马甲兼容性一般', '说明书看不懂', 'BIOS 界面复古', '缺 PCIe 5.0']
  },
  appliance: {
    price: [199, 19999], dims: ['清洁力', '噪音', '能效', '智能', '占地'],
    series: ['Home', 'Pure', 'Clean', 'Air', 'Wash', 'Chef', 'Care', 'Max', 'Mini', 'Pro'],
    points: ['清洁能力', '静音表现', '能效水平', '智能联动', '维护成本'],
    specs: [
      ['类型', (r) => r.pick(['吸尘器', '扫地机', '空气净化器', '洗衣机', '电饭煲', '破壁机', '取暖器'])],
      ['功率', (r) => r.ri(300, 2200) + 'W'],
      ['容量', (r) => r.pick(['2.5L', '4L', '8kg', '10kg', '5L', '0.6L'])],
      ['噪音', (r) => r.ri(38, 78) + 'dB'],
      ['能效', (r) => r.pick(['一级能效', '二级能效', '三级能效'])],
      ['智能', (r) => r.pick(['支持 App 联动', '支持语音控制', '自动集尘', '手动控制'])]
    ],
    pros: ['清洁力超出预期', '噪音控制优秀', '能效等级高', 'App 联动顺畅', '自清洁省心',
      '滤芯耗材便宜', '收纳不占地', '预约定时方便', '拆洗维护简单', '感应避障灵敏',
      '烘干效果好', '内胆不粘好打理'],
    cons: ['耗材更换贵', '噪音高档偏大', '水箱偏小', 'App 功能简陋', '边角清洁不到位',
      '机身偏重', '待机功耗高', '集尘袋容量小', '烘干时间长', '触控面板反光']
  },
  instrument: {
    price: [49, 9999], dims: ['精度', '功能', '做工', '安全', '易读'],
    series: ['Pro', 'Lab', 'Master', 'Sense', 'Meter', 'Fix', 'Torque', 'Cut', 'Test', 'Go'],
    points: ['测量精度', '功能覆盖', '做工扎实', '安全设计', '读数清晰'],
    specs: [
      ['类型', (r) => r.pick(['万用表', '示波器', '电烙铁', '电钻', '激光测距', '温湿度计', '工具套装'])],
      ['精度', (r) => r.pick(['±0.5%', '±1%', '±0.05%', '±2%'])],
      ['量程', (r) => r.pick(['6000 计数', '2000 计数', '0.1–100m', '-40–125℃'])],
      ['显示', (r) => r.pick(['LCD 数显', 'TFT 彩屏', '2.4 英寸彩屏', '段码屏'])],
      ['安全', (r) => r.pick(['CAT III 600V', 'CAT IV 600V', '双重绝缘', '过载保护'])],
      ['供电', (r) => r.pick(['锂电池 ' + r.ri(1200, 4000) + 'mAh', 'AA 电池 ×' + r.ri(2, 4), 'USB-C 充电'])]
    ],
    pros: ['读数稳定精准', '做工扎实耐造', '安全防护到位', '屏幕读数清晰', '配件给得齐全',
      '收纳包实用', '手感重心合理', '功能切换直觉', '校准出厂有据', '充电口通用',
      '表笔质量好', '操作逻辑简单'],
    cons: ['说明书翻译生硬', '保护套偏松', '自动关机太灵敏', '背光不均匀', '量程切换慢',
      '附赠钻头一般', 'App 蓝牙连接慢', '外壳容易留划痕', '无数据导出', '按键手感偏硬']
  },
  vehicle: {
    price: [99, 19999], dims: ['稳定性', '画质', '安装', '安全', '智能'],
    series: ['Drive', 'Cam', 'Charge', 'Go', 'Max', 'Safe', 'Link', 'Pro', 'Air', 'Ride'],
    points: ['夜视表现', '安装便利', '充放电效率', '稳定性', '智能辅助'],
    specs: [
      ['类型', (r) => r.pick(['行车记录仪', '充气泵', '充电桩', '胎压监测', '车机导航', '电动滑板车'])],
      ['传感器', (r) => r.pick(['索尼 STARVIS 2', 'OV 宽动态', '4K 超感光', '毫米波雷达'])],
      ['分辨率', (r) => r.pick(['4K 2160p', '2K 1440p', '1080p', '1296p'])],
      ['广角', (r) => r.ri(120, 170) + '°'],
      ['电池', (r) => r.pick(['超级电容', '内置电池 ' + r.ri(500, 6000) + 'mAh', '无电池'])],
      ['存储', (r) => r.pick(['支持 256GB', '支持 128GB', '内置 32GB'])]
    ],
    pros: ['夜视车牌清晰', '安装隐藏走线', 'App 回放顺畅', '充放电效率高', 'ADAS 提醒及时',
      '碰撞锁存可靠', '散热设计合理', '广角覆盖到位', '语音控制方便', '胎压监测精准',
      '做工防水防尘', '质保周期长'],
    cons: ['强光过曝明显', 'App 广告多', '发热偏高', '取电走线麻烦', 'GPS 冷启动慢',
      '麦克风收音闷', '吸盘易掉', '无屏版本调参难', '停车监控耗电', '固件更新慢']
  },
  robot: {
    price: [199, 29999], dims: ['避障', '清洁力', '续航', '智能', '维护'],
    series: ['Bot', 'X', 'Go', 'Master', 'Mini', 'Pro', 'Air', 'Tank', 'Scout', 'Home'],
    points: ['避障能力', '清洁覆盖', '续航表现', '自清洁', '可编程性'],
    specs: [
      ['类型', (r) => r.pick(['扫地机器人', '拖地机器人', '编程机器人', '遥控模型', '机械臂'])],
      ['吸力', (r) => r.ri(2000, 12000) + 'Pa'],
      ['导航', (r) => r.pick(['激光 LDS', '视觉 SLAM', '陀螺仪规划', '深度相机避障'])],
      ['电池', (r) => r.ri(2600, 6000) + 'mAh'],
      ['噪音', (r) => r.ri(50, 75) + 'dB'],
      ['基站', (r) => r.pick(['自动集尘 + 自清洁', '自动上下水', '充电底座', '无基站'])]
    ],
    pros: ['避障不撞家具', '拖布自清洁省心', '越障能力出色', 'App 地图管理强', '噪音控制不错',
      '集尘袋容量大', '续航覆盖大户型', '边刷防缠绕', '远程看家实用', '固件更新勤快',
      '爬坡能力稳', '模块可拓展'],
    cons: ['拖布烘干慢', '耗材偏贵', '角落覆盖弱', 'App 首次建图慢', '机身高度进不去沙发',
      '集尘噪音大', '地毯识别一般', '水箱偏小', '语音播报啰嗦', '基站占地大']
  },
  peripheral: {
    price: [49, 9999], dims: ['手感', '响应', '做工', '兼容', '静音'],
    series: ['Type', 'Click', 'Flow', 'Pad', 'Pro', 'Max', 'Slim', 'Wave', 'Go', 'Studio'],
    points: ['敲击手感', '响应速度', '做工质感', '静音表现', '人体工学'],
    specs: [
      ['类型', (r) => r.pick(['机械键盘', '鼠标', '打印机', '手写板', '扩展坞', '摄像头'])],
      ['连接', (r) => r.pick(['三模（2.4G/蓝牙/有线）', '2.4G 无线', '有线 USB-C', '蓝牙 5.1'])],
      ['轴体/传感器', (r) => r.pick(['红轴热插拔', '光轴', '26000DPI 光学', '电磁笔 8192 级', '6 合 1'])],
      ['续航', (r) => r.ri(30, 200) + ' 小时'],
      ['尺寸', (r) => r.pick(['87 键', '104 键', '68 键', '122×75mm', 'A4 幅面'])],
      ['灯效', (r) => r.pick(['RGB 背光', '白光', '无光'])]
    ],
    pros: ['敲击手感扎实', '无线延迟极低', '模具做工精细', '静音轴扰民度低', '驱动功能克制',
      '键帽不打油', '充电口通用', '多设备切换快', '人体工学贴手', '打印速度快',
      '面板防刮', '配件齐全'],
    cons: ['驱动软件臃肿', '续航虚标', '机身偏重', '键帽字符易磨损', '2.4G 接收器易丢',
      '印刷分辨率一般', '长时间使用发热', '宏定义上手难', '底部易刮花', '价格偏高']
  },
  power: {
    price: [49, 2999], dims: ['容量', '快充', '便携', '安全', '做工'],
    series: ['Cell', 'Pack', 'Go', 'Max', 'Slim', 'Core', 'Brick', 'Air', 'Pro', 'Dash'],
    points: ['充电速度', '便携程度', '安全防护', '容量扎实', '兼容协议'],
    specs: [
      ['类型', (r) => r.pick(['充电宝', '移动电源', '电池盒', '充电器'])],
      ['容量', (r) => r.pick(['5000mAh', '10000mAh', '20000mAh', '25000mAh', '27000mAh'])],
      ['功率', (r) => r.pick(['22.5W', '45W', '65W', '100W', '140W'])],
      ['协议', (r) => r.pick(['PD 3.0 / QC 4+', 'PD 3.1', 'PD / PPS / QC', 'PD 2.0'])],
      ['接口', (r) => r.pick(['USB-C ×2 + USB-A', 'USB-C ×1', 'USB-C ×2'])],
      ['重量', (r) => r.ri(100, 500) + 'g']
    ],
    pros: ['充电速度足额', '容量不虚标', '协议兼容面广', '机身小巧便携', '温控表现好',
      '数显电量精准', '外壳阻燃用料', '可上飞机', '双口同充不掉速', '带屏显交互',
      '做工手感扎实', '附赠线材质好'],
    cons: ['满载发热明显', '体积偏大', '数显耗电', '附赠线偏短', '功率虚标嫌疑',
      '外壳易刮花', '无无线充电', '自动断电阈值高', '重量压手', '价格偏贵']
  }
};
const KIND_DEFAULT = {
  price: [49, 9999], dims: ['性能', '做工', '易用', '性价比', '稳定性'],
  series: ['Pro', 'Max', 'Mini', 'Go', 'Air', 'One', 'X', 'Plus', 'Lite', 'Ultra'],
  points: ['综合体验', '做工用料', '功能覆盖', '性价比', '稳定性'],
  specs: [
    ['类型', (r) => r.pick(['标准版', '专业版', '旗舰版', '入门版'])],
    ['规格', (r) => r.ri(10, 999) + r.pick(['mm', 'W', 'g', 'mAh', 'GB'])],
    ['接口', (r) => r.pick(['USB-C', '蓝牙 5.3', 'Wi-Fi 6', '有线'])],
    ['材质', (r) => r.pick(['铝合金', '工程塑料', '碳纤维', '玻璃'])],
    ['重量', (r) => r.ri(50, 2000) + 'g'],
    ['质保', (r) => r.pick(['1 年', '2 年', '3 年'])]
  ],
  pros: ['做工扎实', '功能齐全', '上手简单', '性价比高', '稳定性好', '说明书清晰',
    '配件齐全', '售后响应快', '外观耐看', '功耗控制好', '兼容性强', '维护简单'],
  cons: ['价格偏高', '功能偏少', '质感一般', '接口偏少', '体积偏大', '文档缺失',
    '扩展性一般', '噪音略大', '包装简陋', '学习成本高']
};

/* ---- 年份加权分布：1954–2024，各年代都有 ---- */
function genYear() {
  const r = rng();
  if (r < 0.08) return ri(1954, 1989);
  if (r < 0.20) return ri(1990, 1999);
  if (r < 0.42) return ri(2000, 2009);
  if (r < 0.72) return ri(2010, 2019);
  return ri(2020, 2024);
}

/* ---- 型号命名：品牌 + 系列 + 型号码（杜绝品类词当产品名）---- */
const usedNames = new Set();
function genName(brand, k, variantLabel) {
  for (let tries = 0; tries < 24; tries++) {
    const series = pick(k.series);
    const num = pick([
      String(ri(1, 9)) + pick(['', '0', '00']) + pick(['', ' Pro', ' Max', ' Plus', ' Ultra', ' Lite', ' SE', 'i']),
      String(ri(10, 99)) + pick(['', 'X', 'S', 'T']),
      pick(['X', 'Z', 'M', 'R', 'N', 'Q']) + ri(100, 999),
      'MK ' + pick(['II', 'III', 'IV', 'V']) + pick(['', ' S'])
    ]);
    if (num.indexOf(series) === 0) continue; /* 系列与型号撞词（X X266）→ 重掷 */
    const name = brand + ' ' + series + ' ' + num + (variantLabel ? ' ' + variantLabel : '');
    if (!usedNames.has(name)) { usedNames.add(name); return name; }
  }
  const name = brand + ' ' + pick(k.series) + ' ' + ri(1000, 9999) + (variantLabel ? ' ' + variantLabel : '');
  usedNames.add(name);
  return name;
}

/* ---- 生成单条产品 ---- */
const usedPros = new Set(), usedCons = new Set();
function pickUnique(pool, used, n) {
  const out = [];
  for (let t = 0; t < 60 && out.length < n; t++) {
    const a = pick(pool), b = pick(pool), c = pick(pool);
    const key = [a, b, c].sort().join('|');
    if (used.has(key)) continue;
    used.add(key);
    out.push(a, b, c);
  }
  while (out.length < n) out.push(pick(pool));
  return out.slice(0, n);
}

function genProduct(base, seq) {
  const k = KIND[base.kind] || KIND_DEFAULT;
  const brand = pick(base.brands && base.brands.length ? base.brands : ['小米', '索尼', '三星']);
  const variant = (base.variants && base.variants.length && rng() < 0.4) ? pick(base.variants) : null;
  const name = genName(brand, k, variant ? variant.label : '');
  const year = genYear();
  /* 价格随年份衰减 + kind 区间约束（老产品便宜、新品贵），杜绝「工业打印机 ¥1,570」式错位 */
  const age = Math.max(0, 2024 - year);
  const [pLo, pHi] = k.price;
  const price = Math.round((pLo + (pHi - pLo) * Math.pow(rng(), 1.6)) / (1 + age * 0.06) / 10) * 10 + 9;
  const specN = ri(6, 8);
  const specs = [];
  const specPool = k.specs.slice();
  for (let i = 0; i < specN && specPool.length; i++) {
    const idx = Math.floor(rng() * specPool.length);
    const [key, gen] = specPool.splice(idx, 1)[0];
    specs.push([key, gen({ ri, rf, pick })]);
  }
  const scores = k.dims.map((d) => [d, ri(60, 96)]);
  const score = +(scores.reduce((n, s) => n + s[1], 0) / scores.length / 10).toFixed(1);
  const userScore = +Math.min(9.8, Math.max(5.0, score + rf(-0.8, 0.8))).toFixed(1);
  const point = pick(k.points);
  const summary = brand + name.slice(brand.length) + ' 是一款于 ' + year + ' 年推出的' +
    (base.name || '数码产品') + '，主打' + point + '，同价位中表现均衡。';
  return {
    id: 'b-' + base.id + '-' + seq,
    name: name,
    brand: brand,
    category: base.id,
    subcat: base.name,
    catLeaf: variant ? base.id + '-' + variant.slug : base.id,
    catName: base.name,
    year: year,
    priceText: '¥' + price.toLocaleString('en-US'),
    price: price,
    tags: [base.name, point, pick(['口碑之选', '性价比', '功能全面', '轻量便携', '进阶之选']), '演示'],
    summary: summary,
    specs: specs,
    scores: scores,
    score: score,
    userScore: userScore,
    pros: pickUnique(k.pros, usedPros, 3),
    cons: pickUnique(k.cons, usedCons, 2),
    review: {
      objective: '从实测数据看，' + name + ' 在' + point + '上表现稳定，核心参数没有明显短板。',
      subjective: '如果你在找一台' + (base.name || '设备') + '，' + name + ' 是值得纳入候选的一台。'
    },
    source: 'bulk',
    synthetic: true
  };
}

/* ---- 主流程 ---- */
function main() {
  /* 配额：按品类权重分配总量 */
  const totalWeight = BASES.reduce((n, b) => n + (b.weight || 1000), 0);
  const quota = new Map();
  let assigned = 0;
  BASES.forEach((b, i) => {
    const q = Math.max(20, Math.round(COUNT * (b.weight || 1000) / totalWeight));
    quota.set(b.id, q);
    assigned += q;
  });
  /* 余量给权重最大的品类 */
  const sorted = BASES.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0));
  for (let i = 0; assigned !== COUNT && i < sorted.length * 4; i++) {
    const b = sorted[i % sorted.length];
    const d = assigned < COUNT ? 1 : -1;
    if ((quota.get(b.id) + d) >= 20) { quota.set(b.id, quota.get(b.id) + d); assigned += d; }
  }

  const products = [];
  let seq = 0;
  BASES.forEach((b) => {
    const q = quota.get(b.id);
    for (let i = 0; i < q; i++) products.push(genProduct(b, ++seq));
  });

  /* ---- 自检 ---- */
  const nameSet = new Set(), idSet = new Set();
  let brandBrand = 0, salad = 0, catWordName = 0, yearRecent = 0;
  products.forEach((p) => {
    nameSet.add(p.name); idSet.add(p.id);
    if (p.summary.indexOf(p.brand + ' ' + p.brand) !== -1) brandBrand++;
    if (p.name.trim() === p.catName) catWordName++;
    if (p.year >= 2020) yearRecent++;
    /* 参数沙拉检测：specs 键必须全部来自本 kind 模板 */
    const allowed = new Set(((KIND[(BASES.find((b) => b.id === p.category) || {}).kind] || KIND_DEFAULT).specs).map((s) => s[0]));
    p.specs.forEach((s) => { if (!allowed.has(s[0])) salad++; });
    if (!p.synthetic || p.source !== 'bulk') throw new Error('provenance missing: ' + p.id);
  });
  if (nameSet.size !== products.length) throw new Error('name duplicate: ' + (products.length - nameSet.size));
  if (idSet.size !== products.length) throw new Error('id duplicate');
  if (brandBrand > 0 || salad > 0 || catWordName > 0) {
    throw new Error('quality check failed: brandBrand=' + brandBrand + ' salad=' + salad + ' catWord=' + catWordName);
  }

  /* ---- 输出分片 ---- */
  fs.mkdirSync(GEN, { recursive: true });
  for (const f of fs.readdirSync(GEN)) {
    if (/^bulk-static-.*\.js$/.test(f)) fs.unlinkSync(path.join(GEN, f)); /* 清理旧版 */
  }
  const shards = Math.ceil(products.length / PER_SHARD);
  for (let s = 0; s < shards; s++) {
    const chunk = products.slice(s * PER_SHARD, (s + 1) * PER_SHARD);
    const catOf = {};
    chunk.forEach((p) => { (catOf[p.category] = catOf[p.category] || []).push(p); });
    /* 每分片按品类分组输出，chunk 头保持类别元信息 */
    const parts = Object.keys(catOf).map((cid) => {
      const base = BASES.find((b) => b.id === cid) || { name: cid, icon: '📦' };
      return {
        category: cid, categoryName: base.name, icon: base.icon || '📦',
        description: '', products: catOf[cid]
      };
    });
    const fn = 'bulk-static-' + String(s + 1).padStart(2, '0') + '.js';
    const body = '/* 静态托管扩充分片 ' + (s + 1) + '/' + shards +
      '（gen-bulk-v2 生成 · seed=' + SEED + ' · synthetic:true） */\n' +
      'window.DB_CHUNKS = window.DB_CHUNKS || [];\n' +
      /* provenance（问题 45）：每个分片记录生成器/种子/schema，下游可追溯 */
      parts.map((c) => 'window.DB_CHUNKS.push(' + JSON.stringify(Object.assign({ provenance: { generator: 'gen-bulk-v2', seed: 20261112, schema: 'rlwj-bulk@2' } }, c)) + ');').join('\n') + '\n';
    fs.writeFileSync(path.join(GEN, fn), body);
  }

  const years = products.map((p) => p.year);
  const prices = products.map((p) => p.price);
  console.log('gen-bulk-v2 OK');
  console.log('  products : ' + products.length + '  shards: ' + shards);
  console.log('  categories: ' + new Set(products.map((p) => p.category)).size +
    '  brands: ' + new Set(products.map((p) => p.brand)).size);
  console.log('  year     : ' + Math.min.apply(null, years) + '–' + Math.max.apply(null, years) +
    '  (2020s 占比 ' + Math.round(yearRecent / products.length * 100) + '%)');
  console.log('  price    : ¥' + Math.min.apply(null, prices) + '–¥' + Math.max.apply(null, prices));
  console.log('  quality  : brandBrand=0 salad=0 catWord=0 dupName=0 provenance=OK');
}

main();
