window.DB_CHUNKS = window.DB_CHUNKS || [];
window.DB_CHUNKS.push({
  category: "devboard",
  categoryName: "开发板",
  icon: "🧰",
  description: "树莓派、Jetson 等开发板",
  products: [
    {
      id: "raspberry-pi-5",
      name: "Raspberry Pi 5",
      brand: "Raspberry Pi",
      category: "devboard",
      year: 2023,
      priceText: "约 ¥529（4GB 版）",
      price: 529,
      tags: ["树莓派", "单板计算机", "4K", "PCIe", "Linux"],
      summary: "树莓派第五代旗舰单板机，Broadcom BCM2712 四核 Cortex-A76 主频 2.4GHz，性能较上代翻倍，首次提供 PCIe 2.0 x3 接口与双 4K HDMI，是创客与轻量服务器的标杆之作。",
      specs: [
        ["SoC", "Broadcom BCM2712"],
        ["CPU", "四核 Arm Cortex-A76，主频 2.4GHz"],
        ["GPU", "VideoCore VII，OpenGL ES 3.1 / Vulkan 1.2"],
        ["内存", "4GB / 8GB LPDDR4X-4267（另有 2GB 版）"],
        ["存储", "microSD 卡槽，支持 PCIe 2.0 x3 外接 NVMe（需转接板）"],
        ["视频输出", "2× micro-HDMI，最高 4Kp60"],
        ["USB", "2× USB 3.0 + 2× USB 2.0"],
        ["网络", "千兆以太网（支持 PoE+，需 HAT）"],
        ["无线", "双频 Wi-Fi 5（802.11ac）、蓝牙 5.0 / BLE"],
        ["供电", "USB-C 5V/5A（推荐 27W PD 电源）"],
        ["GPIO", "40-pin 扩展排针，UART/I2C/SPI/PCM"],
        ["尺寸", "约 85 × 56mm"],
        ["系统支持", "Raspberry Pi OS（64 位）、Ubuntu、LibreELEC 等"]
      ],
      scores: [
        ["性能", 92],
        ["扩展性", 88],
        ["生态", 96],
        ["能效", 82],
        ["性价比", 80]
      ],
      score: 9.0,
      userScore: 8.8,
      pros: ["四核 A76 性能翻倍，桌面办公与轻服务器体验流畅", "PCIe、双 4K 输出、双 USB 3.0，扩展能力大幅升级", "全球社区与配件生态无出其右，教程资料极多"],
      cons: ["满载发热明显，官方建议搭配主动散热外壳", "PCIe 转接 NVMe 需另购转接板，配件成本叠加"],
      review: {
        objective: "Raspberry Pi 5 搭载 BCM2712 四核 Cortex-A76，主频 2.4GHz，内存升级为 LPDDR4X-4267，提供 4GB/8GB 版本。新增 RP1 南桥带来 2× USB 3.0、双 micro-HDMI（4Kp60）与 PCIe 2.0 x3，存储扩展质变。整机功耗与发热同步上升，27W PD 电源与主动散热建议标配。",
        subjective: "上手 Pi 5 的第一感觉是“终于不卡了”：桌面切换、浏览器多标签、跑个 Docker 服务都游刃有余，俨然一台可以真正干活的小主机。PCIe 接 NVMe 后编译速度提升尤其爽快。但它也更挑配件，电源、散热、外壳一套配下来价格并不便宜。对老玩家来说它是全面进化，对只想点个灯的入门者，4B 甚至 Pico 或许更省心。"
      }
    },
    {
      id: "raspberry-pi-4-model-b",
      name: "Raspberry Pi 4 Model B",
      brand: "Raspberry Pi",
      category: "devboard",
      year: 2019,
      priceText: "约 ¥359（4GB 版）",
      price: 359,
      tags: ["树莓派", "单板计算机", "经典", "Linux", "4K"],
      summary: "树莓派最经典的量产型号，四核 Cortex-A72 主频 1.5GHz，双 micro-HDMI 支持双屏 4K，USB-C 供电，长期供货且二手流通极广，至今仍是入门学习与软路由的热门选择。",
      specs: [
        ["SoC", "Broadcom BCM2711"],
        ["CPU", "四核 Arm Cortex-A72，主频 1.5GHz"],
        ["GPU", "VideoCore VI，OpenGL ES 3.0"],
        ["内存", "2GB / 4GB / 8GB LPDDR4"],
        ["存储", "microSD 卡槽"],
        ["视频输出", "2× micro-HDMI，最高双 4Kp30"],
        ["USB", "2× USB 3.0 + 2× USB 2.0"],
        ["网络", "千兆以太网（支持 PoE，需 HAT）"],
        ["无线", "双频 Wi-Fi 5（802.11ac）、蓝牙 5.0 / BLE"],
        ["供电", "USB-C 5V/3A（15W）"],
        ["GPIO", "40-pin 扩展排针"],
        ["尺寸", "约 85 × 56mm"],
        ["系统支持", "Raspberry Pi OS、Ubuntu、LibreELEC 等"]
      ],
      scores: [
        ["性能", 72],
        ["扩展性", 78],
        ["生态", 96],
        ["能效", 76],
        ["性价比", 88]
      ],
      score: 8.5,
      userScore: 8.7,
      pros: ["生态成熟、教程海量，遇到问题几乎都能搜到答案", "双 4K 输出与 USB 3.0，做软路由、下载机、电视盒都合适", "长期供货、二手保值，整体持有成本低"],
      cons: ["microSD 作为系统盘速度与寿命有限", "满载温度较高，长时间运行建议加散热片或风扇"],
      review: {
        objective: "Raspberry Pi 4 Model B 采用 BCM2711，四核 Cortex-A72 @ 1.5GHz，最高 8GB 内存，首次引入双 USB 3.0 与双 micro-HDMI 输出，供电改为 USB-C 5V/3A。足以胜任软路由、NAS、家庭自动化等场景，但 microSD 随机读写是主要瓶颈，重度使用建议通过 USB 外接 SSD 引导系统。",
        subjective: "这是无数人的“第一块 Linux 板”。性能谈不上澎湃，但胜在稳定、便宜、资料多，随便一个想法都有前人踩过的坑可抄。我用它跑过软路由、建过下载机、当过打印服务器，几年不出问题。高温降频是老毛病，贴个散热片、开个风扇就消停了。对新手而言它是最好的老师，对老手而言它是最省心的工具人。"
      }
    },
    {
      id: "nvidia-jetson-orin-nano-developer-kit",
      name: "NVIDIA Jetson Orin Nano Developer Kit",
      brand: "NVIDIA",
      category: "devboard",
      year: 2022,
      priceText: "约 ¥3499（8GB 版）",
      price: 3499,
      tags: ["边缘AI", "Jetson", "CUDA", "机器人", "Linux"],
      summary: "面向边缘 AI 与机器人的开发套件，Ampere 架构 GPU 提供约 40 TOPS 算力（Super 版更高），8GB LPDDR5 与 M.2 NVMe 扩展，是入门 Jetson 生态、跑视觉推理的首选平台。",
      specs: [
        ["SoC", "NVIDIA Jetson Orin Nano（8GB）"],
        ["CPU", "6 核 Arm Cortex-A78AE"],
        ["GPU", "Ampere 架构，1024 个 CUDA 核心 + 32 个 Tensor 核心"],
        ["AI 算力", "约 40 TOPS（INT8，Super 模式更高）"],
        ["内存", "8GB LPDDR5，102GB/s 带宽"],
        ["存储", "microSD 卡槽 + M.2 Key M（NVMe SSD）"],
        ["摄像头", "2× CSI-2 摄像头接口"],
        ["扩展", "40-pin GPIO 排针、M.2 Key E（Wi-Fi 模组）"],
        ["视频", "HDMI / DisplayPort 输出，最高 4K"],
        ["网络", "千兆以太网（RJ45）"],
        ["供电", "USB-C PD 或 DC 电源（约 7-21V）"],
        ["系统支持", "JetPack（Ubuntu + CUDA + TensorRT）"],
        ["散热", "官方标配主动散热风扇"]
      ],
      scores: [
        ["AI 性能", 90],
        ["接口扩展", 86],
        ["开发生态", 92],
        ["能效", 84],
        ["性价比", 76]
      ],
      score: 8.7,
      userScore: 8.4,
      pros: ["Ampere GPU 算力充沛，可流畅运行主流视觉模型", "JetPack 软件栈完整，CUDA/TensorRT 与桌面端一脉相承", "M.2 NVMe 与 CSI 摄像头接口齐全，适合做机器人主控"],
      cons: ["套件价格与配件成本较高，对学生党不算亲民", "部分套件以 SD 卡为系统盘，建议自行加装 NVMe SSD"],
      review: {
        objective: "Jetson Orin Nano 采用 6 核 Cortex-A78AE 与 1024 核 Ampere GPU，配 8GB LPDDR5，标称 AI 算力约 40 TOPS（INT8），可跑量化后的主流视觉模型。板载 M.2 NVMe、双 CSI 摄像头口与 40-pin GPIO，JetPack 提供 CUDA/TensorRT 完整工具链，功耗约 7-15W，需主动散热。",
        subjective: "它是把桌面级 AI 开发体验缩到巴掌大板子上的产品。跑 YOLO、部署分割模型、接摄像头做实时识别，体验远比纯 CPU 板流畅，和桌面 CUDA 之间的迁移也几乎无痛。代价是价格与学习曲线都在：JetPack 要刷机，环境配置偶尔踩坑，散热风扇也不能少。做机器人、智能相机的人会觉得物有所值，只想点灯的玩家则不必上这把牛刀。"
      }
    },
    {
      id: "beaglebone-black",
      name: "BeagleBone Black",
      brand: "BeagleBoard",
      category: "devboard",
      year: 2013,
      priceText: "约 ¥369",
      price: 369,
      tags: ["开源硬件", "工业", "PRU", "Linux", "实时控制"],
      summary: "开源社区老牌开发板，TI AM3358 单核 Cortex-A8 主频 1GHz，最大特色是双 PRU 实时协处理器与两排 92 个扩展引脚，在工业控制、实时 IO 场景中至今占有一席之地。",
      specs: [
        ["SoC", "TI AM3358 Sitara"],
        ["CPU", "单核 Arm Cortex-A8，主频 1GHz"],
        ["协处理器", "2× PRU-ICSS 可编程实时单元（200MHz）"],
        ["内存", "512MB DDR3"],
        ["存储", "4GB eMMC + microSD 卡槽"],
        ["视频输出", "micro-HDMI"],
        ["USB", "1× USB 2.0 Host + 1× Mini-USB（Device）"],
        ["网络", "10/100M 以太网"],
        ["扩展接口", "2× 46-pin 扩展排针，共 92 个引脚"],
        ["供电", "5V DC 圆口或 Mini-USB"],
        ["模拟输入", "7 路 12-bit ADC"],
        ["尺寸", "约 86 × 54mm"],
        ["系统支持", "Debian、Ubuntu、Android、裸机/RTOS"]
      ],
      scores: [
        ["性能", 52],
        ["扩展性", 88],
        ["生态", 70],
        ["实时控制", 92],
        ["性价比", 72]
      ],
      score: 7.4,
      userScore: 7.6,
      pros: ["PRU 实时协处理器可实现微秒级 IO 控制，工业场景独特", "92 个扩展引脚与片上 ADC，直连传感器无需额外芯片", "eMMC 与 microSD 双启动，部署方式灵活"],
      cons: ["单核 A8 性能落后于当代产品，图形与多媒体能力弱", "100M 网口与 512MB 内存限制了服务器类应用"],
      review: {
        objective: "BeagleBone Black 基于 TI AM3358，单核 Cortex-A8 @ 1GHz、512MB DDR3、4GB eMMC，2×46-pin 扩展口提供 92 个 GPIO 与 7 路 12-bit ADC。核心竞争力是两颗 PRU 实时协处理器，可在 Linux 运行同时实现确定性高速 IO，适合步进电机、脉冲采集等工业用途。",
        subjective: "这是一块“偏科生”：论跑桌面、播视频它远不如树莓派，论数毛级别的实时 IO 它又难逢敌手。做数控、做 PLC 仿真、做高速数据采集的工程师会爱死 PRU，而普通创客可能会被资料的年代感和小众社区劝退。买它基本等于买一个确定性 IO 能力，目标明确就值，跟风则不建议。"
      }
    },
    {
      id: "micro-bit-v2",
      name: "micro:bit V2",
      brand: "BBC / Micro:bit 教育基金会",
      category: "devboard",
      year: 2020,
      priceText: "约 ¥139",
      price: 139,
      tags: ["教育", "少儿编程", "传感器", "蓝牙", "图形化"],
      summary: "面向青少年的口袋编程板，5×5 LED 点阵与两颗按键开箱即用，内置加速度计、罗盘、麦克风、扬声器与温度传感器，支持 MakeCode 图形化与 Python，是全球课堂最流行的编程教具之一。",
      specs: [
        ["主控", "Nordic nRF52833"],
        ["内核", "Arm Cortex-M4F，主频 64MHz"],
        ["Flash / RAM", "512KB Flash / 128KB RAM"],
        ["显示", "5×5 LED 红色点阵"],
        ["按键", "正面 2 颗可编程按键 + 背面复位键"],
        ["传感器", "加速度计、电子罗盘、麦克风、扬声器、温度/光线传感器"],
        ["无线", "蓝牙 5.0（BLE）、2.4GHz 无线电"],
        ["接口", "micro-USB、边缘金手指（约 25 个可编程 IO）"],
        ["电源", "micro-USB 或 2× AAA 电池盒（另购）"],
        ["外设", "鳄鱼夹、环形扩展接口（音频/JST）"],
        ["尺寸", "约 52 × 42mm"],
        ["开发环境", "MakeCode（图形化/JavaScript）、Python（MicroPython）、Scratch"],
        ["目标用户", "8-14 岁编程启蒙与课堂教学"]
      ],
      scores: [
        ["易用性", 96],
        ["教学资源", 95],
        ["性能", 48],
        ["扩展性", 72],
        ["性价比", 86]
      ],
      score: 8.4,
      userScore: 8.8,
      pros: ["开箱即用，无需接线即可做动画、计步器、声控灯等项目", "MakeCode 图形化与 Python 平滑过渡，教学梯度好", "全球课堂课程与教案丰富，老师备课成本低"],
      cons: ["512KB Flash 与 128KB RAM 限制了复杂项目", "仅 25 个左右 IO，做大型机电项目需扩展板配合"],
      review: {
        objective: "micro:bit V2 搭载 Nordic nRF52833（Cortex-M4F 64MHz、512KB Flash、128KB RAM），相比 V1 新增麦克风、扬声器与触摸 Logo。5×5 LED 与两颗按键构成最简交互，边缘金手指可用鳄鱼夹接外部电路。软件支持 MakeCode 图形化与 MicroPython，教学资源覆盖全球大量中小学课程。",
        subjective: "micro:bit 最厉害的地方是“五分钟出作品”：孩子插上 USB，拖两个积木，LED 上就跑起自己的名字，成就感来得极快。V2 加了麦克风和喇叭后，声控、录音类玩法一下多了起来。它当然不是性能怪兽，甚至算不上正经开发板，但作为编程启蒙的敲门砖，它把门槛降到了地板上。家长和老师几乎不用懂硬件，就能陪孩子一路玩下去。"
      }
    },
    {
      id: "arduino-uno-r4-wifi",
      name: "Arduino UNO R4 WiFi",
      brand: "Arduino",
      category: "devboard",
      year: 2023,
      priceText: "约 ¥215",
      price: 215,
      tags: ["Arduino", "入门", "Wi-Fi", "12位ADC", "USB-C"],
      summary: "UNO 家族的现代化升级，Renesas RA4M1 主控（Cortex-M4 48MHz）加 ESP32-S3 无线模组，12 位 ADC、12×8 LED 矩阵与 Qwiic 接口齐备，经典扩展板兼容，兼顾新手友好与联网需求。",
      specs: [
        ["主控", "Renesas RA4M1（R7FA4M1AB3CFM）"],
        ["内核", "Arm Cortex-M4，主频 48MHz"],
        ["Flash / RAM", "256KB Flash / 32KB SRAM"],
        ["无线模组", "ESP32-S3（Wi-Fi 802.11 b/g/n、蓝牙 5.0 / BLE）"],
        ["数字 IO", "14 个（其中 6 路 PWM）"],
        ["模拟输入", "6 路 12-bit ADC"],
        ["DAC", "1 路 12-bit DAC 输出"],
        ["通信接口", "UART、I2C、SPI、CAN"],
        ["板载外设", "12×8 LED 点阵、Qwiic I2C 连接器"],
        ["供电", "USB-C 或 VIN 6-24V，板载稳压"],
        ["USB", "USB-C（可作 HID 键盘/鼠标）"],
        ["兼容性", "兼容 UNO 扩展板（Shield）"],
        ["开发环境", "Arduino IDE、Arduino Cloud"]
      ],
      scores: [
        ["易用性", 94],
        ["性能", 62],
        ["连接性", 86],
        ["兼容性", 92],
        ["性价比", 84]
      ],
      score: 8.5,
      userScore: 8.4,
      pros: ["经典 UNO 外形与 Shield 兼容，老项目无缝迁移", "自带 Wi-Fi/蓝牙与 Qwiic 接口，联网项目免焊转接", "12 位 ADC 与 DAC，测量精度比老 UNO 大幅提升"],
      cons: ["主频 48MHz，算力低于同价位 ESP32 类开发板", "双芯片架构在个别高级无线用例下配置略繁琐"],
      review: {
        objective: "UNO R4 WiFi 采用 Renesas RA4M1（Cortex-M4 48MHz、256KB Flash、32KB SRAM）加 ESP32-S3 无线组合，提供 14 路数字 IO、6 路 12-bit ADC、1 路 DAC，并加入 CAN 总线、Qwiic 接口与 12×8 LED 点阵。保持 UNO Shield 物理兼容，供电支持 USB-C 与 6-24V VIN。",
        subjective: "对用惯 UNO 的人来说，R4 WiFi 是一次“不用换脑子”的升级：代码、扩展板照旧，ADC 精度和 USB-C 却都是实打实的改善，板载 LED 点阵拿来调试状态显示意外好用。想联网做个气象站、做个遥控开关，加个 ESP32 模组就搞定。要说不足，就是性能依旧温和，跑复杂算法还得另请高明。它像一辆换了电控的经典老车——好开、可靠、不惊艳。"
      }
    },
    {
      id: "seeed-studio-xiao-esp32s3",
      name: "Seeed Studio XIAO ESP32S3",
      brand: "Seeed Studio（矽递科技）",
      category: "devboard",
      year: 2023,
      priceText: "约 ¥49",
      price: 49,
      tags: ["超小尺寸", "ESP32-S3", "可穿戴", "低功耗", "Wi-Fi"],
      summary: "拇指大小的 ESP32-S3 微型开发板，双核 LX7 主频 240MHz，板载 8MB Flash 与 8MB PSRAM，自带锂电池充电管理，11 个 GPIO，是可穿戴与小型物联网原型的性价比之选。",
      specs: [
        ["SoC", "乐鑫 ESP32-S3"],
        ["CPU", "双核 Xtensa LX7，主频 240MHz"],
        ["Flash / PSRAM", "8MB Flash / 8MB PSRAM"],
        ["无线", "Wi-Fi 802.11 b/g/n、蓝牙 5.0 / BLE"],
        ["GPIO", "11 个可用 GPIO（含 ADC、触摸、I2C、SPI、UART）"],
        ["摄像头接口", "板载 FPC 座（可接摄像头，Sense 版含摄像头与麦克风）"],
        ["充电管理", "板载锂电池充电电路（约 100mA）"],
        ["天线", "板载 Wi-Fi 天线"],
        ["USB", "USB-C（支持 USB-OTG）"],
        ["供电", "USB-C 或锂电池 3.7V"],
        ["尺寸", "约 21 × 17.5mm"],
        ["低功耗", "深度睡眠功耗约 14μA 量级"],
        ["开发环境", "Arduino、ESP-IDF、MicroPython、CircuitPython"]
      ],
      scores: [
        ["集成度", 88],
        ["性能", 70],
        ["尺寸优势", 95],
        ["生态", 82],
        ["性价比", 92]
      ],
      score: 8.6,
      userScore: 8.5,
      pros: ["21×17.5mm 极致小巧，可嵌入可穿戴与小型设备", "自带电池充电与 8MB PSRAM，开箱即可做联网视觉原型", "Arduino/ESP-IDF/MicroPython 全支持，价格仅几十元"],
      cons: ["引脚全靠邮票孔引出，焊接与测试需一定动手能力", "板载天线性能有限，远距离通信场景需外接天线版本"],
      review: {
        objective: "XIAO ESP32S3 采用乐鑫 ESP32-S3 双核 LX7 240MHz，配 8MB Flash 与 8MB PSRAM，支持 Wi-Fi 与 BLE 5.0，尺寸约 21×17.5mm。板载锂电池充电管理与 USB-C（USB-OTG），预留摄像头 FPC 接口，11 个 GPIO 覆盖常见场景，深度睡眠电流约 14μA，适合电池供电的微型物联网节点。",
        subjective: "第一次捏到 XIAO 时会怀疑这么小的东西靠不靠谱，跑起来就知道它相当能打：Wi-Fi 连网、推传感器数据、接摄像头做小识别，几十块的价格给了双核加 PSRAM 的配置。做胸针、吊坠、小车遥控器这类项目特别顺手。缺点也明显——引脚细小、焊接费眼，调试时最好配个扩展底板。对喜欢“把项目做小”的玩家，它几乎没有替代品。"
      }
    }
  ]
});
window.DB_CHUNKS.push({
  category: "mcu",
  categoryName: "单片机",
  icon: "🔲",
  description: "单片机与核心模组",
  products: [
    {
      id: "arduino-mega-2560",
      name: "Arduino Mega 2560",
      brand: "Arduino",
      category: "mcu",
      year: 2010,
      priceText: "约 ¥199（原厂）",
      price: 199,
      tags: ["AVR", "多IO", "3D打印", "入门", "经典"],
      summary: "IO 资源最丰富的经典 Arduino，ATmega2560 提供 54 路数字 IO、16 路模拟输入与 4 个硬件串口，是 3D 打印机固件、多舵机与多传感器项目的常青选择，兼容老扩展板。",
      specs: [
        ["内核", "8 位 AVR（ATmega2560）"],
        ["主频", "16MHz"],
        ["Flash", "256KB（约 8KB 用于引导程序）"],
        ["SRAM / EEPROM", "8KB SRAM / 4KB EEPROM"],
        ["数字 IO", "54 路（其中 15 路 PWM）"],
        ["模拟输入", "16 路 10-bit ADC"],
        ["通信接口", "4× 硬件 UART、I2C、SPI"],
        ["工作电压", "5V"],
        ["输入电压", "7-12V（推荐）"],
        ["IO 驱动能力", "单路约 20mA，5V 电平"],
        ["USB", "USB-B（USB 转串口芯片）"],
        ["尺寸", "约 101 × 53mm"],
        ["开发环境", "Arduino IDE、PlatformIO"]
      ],
      scores: [
        ["IO 资源", 94],
        ["性能", 48],
        ["易用性", 90],
        ["生态", 92],
        ["性价比", 80]
      ],
      score: 8.0,
      userScore: 8.3,
      pros: ["54 路数字 IO + 16 路模拟输入，多外设项目游刃有余", "4 个硬件串口，接多个串口模块不用软串凑合", "Marlin 等固件与海量教程围绕它成长，兼容性强"],
      cons: ["8 位 AVR 性能有限，复杂算法与浮点运算吃力", "8KB SRAM 偏小，字符串与缓冲区需精打细算"],
      review: {
        objective: "Arduino Mega 2560 采用 ATmega2560，8 位 AVR 内核 16MHz，256KB Flash、8KB SRAM、4KB EEPROM，提供 54 路数字 IO（15 路 PWM）、16 路模拟输入与 4 个硬件 UART，工作电压 5V。IO 规模在经典 Arduino 中最大，长期被 3D 打印机与多舵机项目采用。",
        subjective: "Mega 2560 是那种“看着笨重但接线爽”的板子：项目里要接七八个模块时，别的板子引脚告急，它还剩一大排。做 3D 打印机、做多轴小机器人的朋友几乎人手一块。8KB 内存写代码时要有点规划意识，字符串长了就得抠。性能虽老，胜在资料全、价格稳、坏了不心疼。作为工控与模型控制的老黄牛，它依然值得备一块。"
      }
    },
    {
      id: "esp32-wroom-32",
      name: "ESP32-WROOM-32 模组",
      brand: "乐鑫 Espressif",
      category: "mcu",
      year: 2016,
      priceText: "约 ¥18（模组）",
      price: 18,
      tags: ["Wi-Fi", "蓝牙", "双核", "物联网", "高性价比"],
      summary: "物联网时代的国民级 Wi-Fi/蓝牙双模模组，双核 Xtensa LX6 主频 240MHz，内置 4MB Flash，引出约 38 个引脚，是无数智能插座、传感器与自制设备的心脏。",
      specs: [
        ["芯片", "乐鑫 ESP32（ESP32-D0WD 系）"],
        ["内核", "双核 Xtensa LX6"],
        ["主频", "240MHz"],
        ["Flash", "模组内置 4MB SPI Flash"],
        ["SRAM", "约 520KB（含内部与外部 ROM/SRAM 资源）"],
        ["无线", "Wi-Fi 802.11 b/g/n（2.4GHz）、蓝牙 4.2 / BLE"],
        ["GPIO", "模组引出约 34 个可用 GPIO（QFN 共 38 引脚）"],
        ["ADC", "2 组 12-bit SAR ADC，最多 18 通道"],
        ["通信接口", "UART ×3、SPI ×4、I2C ×2、I2S、CAN（TWAI）"],
        ["工作电压", "3.0-3.6V（典型 3.3V）"],
        ["天线", "板载 PCB 天线（另有外置天线版本）"],
        ["封装尺寸", "约 25.5 × 18 × 3.1mm"],
        ["开发环境", "ESP-IDF、Arduino、MicroPython、Lua（NodeMCU）"]
      ],
      scores: [
        ["性能", 72],
        ["连接性", 92],
        ["生态", 94],
        ["集成度", 88],
        ["性价比", 96]
      ],
      score: 8.8,
      userScore: 8.9,
      pros: ["Wi-Fi + 蓝牙双模，十余元价位几乎无对手", "深度睡眠功耗极低，电池供电方案成熟", "ESP-IDF 与 Arduino 生态庞大，开源方案随手可抄"],
      cons: ["3.3V 供电需注意纹波，天线区域对布板敏感", "仅 2.4GHz Wi-Fi，复杂电磁环境下稳定性一般"],
      review: {
        objective: "ESP32-WROOM-32 是乐鑫 ESP32 的经典模组，双核 Xtensa LX6 @ 240MHz，内置 4MB Flash，集成 Wi-Fi 802.11 b/g/n 与蓝牙 4.2/BLE，引出约 34 个 GPIO，支持多路 ADC、3 组 UART、4 组 SPI、I2S 与 CAN。模组约 25.5×18mm，是 DIY 物联网设备的默认选项之一。",
        subjective: "ESP32 之于物联网，就像 555 定时器之于模拟电路——便宜、能干、随手可得。十几块钱的模组自带 Wi-Fi 和蓝牙，做个智能开关、环境监测节点，成本低到可以随手送人。深度睡眠加电池能撑很久，手机 App 联调也方便。偶尔要在供电和天线上踩点坑，但社区方案足够多。要说缺点，就是型号繁杂买错了会麻烦，认准 WROOM-32D/N4 这类常见版本最稳妥。"
      }
    },
    {
      id: "esp32-s3-devkitc-1",
      name: "ESP32-S3 开发套件（DevKitC-1）",
      brand: "乐鑫 Espressif",
      category: "mcu",
      year: 2021,
      priceText: "约 ¥59",
      price: 59,
      tags: ["ESP32-S3", "AI指令", "USB-OTG", "向量指令", "物联网"],
      summary: "ESP32-S3 官方开发板，双核 LX7 主频 240MHz，新增向量指令可加速神经网络与信号处理，支持 USB-OTG 与摄像头接口，GPIO 多达 45 个，是新一代语音与视觉物联网原型的首选。",
      specs: [
        ["芯片", "乐鑫 ESP32-S3"],
        ["内核", "双核 Xtensa LX7"],
        ["主频", "240MHz"],
        ["Flash / PSRAM", "常见 8MB Flash，可选配 PSRAM 封装"],
        ["SRAM", "512KB 片上 SRAM"],
        ["AI 能力", "向量指令扩展，可加速 NN 与信号处理"],
        ["无线", "Wi-Fi 802.11 b/g/n（2.4GHz）、蓝牙 5.0 / BLE"],
        ["GPIO", "最多 45 个可编程 GPIO"],
        ["USB", "原生 USB-OTG（全速）、USB Serial/JTAG"],
        ["摄像头/显示", "支持 DVP 摄像头接口与 SPI/I2C 屏幕"],
        ["工作电压", "3.0-3.6V（典型 3.3V）"],
        ["供电", "USB-C 或 5V/3.3V 排针"],
        ["开发环境", "ESP-IDF、Arduino、MicroPython、ESP-DL"]
      ],
      scores: [
        ["性能", 78],
        ["连接性", 88],
        ["接口资源", 90],
        ["生态", 88],
        ["性价比", 92]
      ],
      score: 8.6,
      userScore: 8.5,
      pros: ["向量指令集对轻量 AI 推理有明显加速", "原生 USB-OTG 与 Serial/JTAG，免外挂串口芯片", "45 个 GPIO 与摄像头接口，语音视觉原型一板搞定"],
      cons: ["仍仅支持 2.4GHz Wi-Fi", "PSRAM 版本选购时需认准封装与丝印，易买错"],
      review: {
        objective: "ESP32-S3 DevKitC-1 搭载 ESP32-S3，双核 Xtensa LX7 @ 240MHz、512KB SRAM，常见 8MB Flash 版本，最多 45 个 GPIO。新增向量指令、原生 USB-OTG 与 DVP 摄像头接口，无线侧升级为蓝牙 5.0/BLE，主打语音唤醒、图像采集与本地轻推理，ESP-IDF 与 Arduino 支持完善。",
        subjective: "S3 是 ESP32 家族里“最像现代 MCU”的一颗：USB 直连电脑省掉串口芯片，插上就能烧录调试；接个麦克风做语音唤醒、接个摄像头做小识别都顺手，跑轻量模型比老 ESP32 快不少。价格依然只要几十块，缺点是学习资料比老款略少，PSRAM 版本买的时候要看清型号。想做语音类物联网产品，从它起步正合适。"
      }
    },
    {
      id: "stm32f103c8t6-minimum-board",
      name: "STM32F103C8T6 最小系统板",
      brand: "意法半导体 ST（第三方板卡）",
      category: "mcu",
      year: 2007,
      priceText: "约 ¥16",
      price: 16,
      tags: ["STM32", "Cortex-M3", "蓝丸", "工业", "高性价比"],
      summary: "俗称“蓝丸”的经典最小系统板，STM32F103C8T6 为 Cortex-M3 内核主频 72MHz，64KB Flash、20KB RAM，引出全部 IO 与 USB/CAN，是国内高校教学与工控原型的国民级选择。",
      specs: [
        ["内核", "Arm Cortex-M3"],
        ["主频", "72MHz"],
        ["Flash", "64KB（部分批次实测为 128KB）"],
        ["SRAM", "20KB"],
        ["GPIO", "37 个可用 GPIO（LQFP48 引出）"],
        ["通信接口", "3× UART、2× SPI、2× I2C、1× USB 2.0 FS、1× CAN"],
        ["定时器", "3× 16-bit 通用定时器 + 1× 高级定时器"],
        ["ADC", "2× 12-bit ADC，最多 10 通道"],
        ["工作电压", "2.0-3.6V（典型 3.3V）"],
        ["调试接口", "SWD（SWDIO/SWCLK），兼容 ST-Link/DAP-Link"],
        ["板载", "8MHz 晶振、电源指示灯、复位键"],
        ["尺寸", "约 53 × 22mm"],
        ["开发环境", "Keil MDK、STM32CubeIDE、IAR、Arduino（第三方核心）"]
      ],
      scores: [
        ["性能", 62],
        ["接口资源", 78],
        ["学习资料", 94],
        ["生态", 82],
        ["性价比", 98]
      ],
      score: 8.2,
      userScore: 8.5,
      pros: ["十几元的价格即可获得 Cortex-M3 全功能系统", "国内教程、例程、书籍极度丰富，学习曲线平缓", "USB、CAN、多路串口齐全，工控小项目足够用"],
      cons: ["山寨与翻新芯片混杂，品质参差不齐", "64KB Flash / 20KB RAM 对大程序略显局促"],
      review: {
        objective: "STM32F103C8T6 属 ST F1 基础型系列，Cortex-M3 内核 72MHz，64KB Flash 与 20KB SRAM，外设含 3 路 UART、2 路 SPI、2 路 I2C、USB 2.0 全速与 CAN，2 组 12-bit ADC。第三方最小系统板引出全部 GPIO 并提供 SWD 调试口，购买时需注意芯片来源。",
        subjective: "“蓝丸”是很多人从 51 单片机迈向 32 位世界的桥。十几块钱一块，焊坏了不心疼，资料从入门到精通一应俱全，去 B 站随便一搜就是几十小时的课。它的性能够做大多数控制类项目，USB 和 CAN 也给得大方。坑在于便宜的板子良莠不齐，翻车时要先怀疑板子再怀疑代码。当练手板它是神，当量产核心则建议直接用原厂模组。"
      }
    },
    {
      id: "stm32-nucleo-f446re",
      name: "STM32 Nucleo-F446RE",
      brand: "意法半导体 ST",
      category: "mcu",
      year: 2015,
      priceText: "约 ¥119",
      price: 119,
      tags: ["STM32", "Cortex-M4F", "FPU", "ST-LINK", "官方原厂"],
      summary: "ST 官方 Nucleo-64 系列开发板，STM32F446RE 为 Cortex-M4F 内核主频 180MHz，板载 ST-LINK 调试器与 Arduino Uno V3 接口，支持 mbed 在线开发，是学习 HAL 库与 DSP 的可靠平台。",
      specs: [
        ["内核", "Arm Cortex-M4F（带 FPU 与 DSP 指令）"],
        ["主频", "180MHz"],
        ["Flash / RAM", "512KB Flash / 128KB SRAM"],
        ["GPIO", "最多 51 个 IO（LQFP64 引出）"],
        ["通信接口", "4× UART、3× SPI、3× I2C、2× CAN、USB 2.0 FS、SAI/I2S"],
        ["定时器", "11 个定时器（含高级电机控制定时器）"],
        ["ADC / DAC", "3× 12-bit ADC、2× 12-bit DAC"],
        ["板载调试器", "ST-LINK/V2-1，支持 SWD 与虚拟串口"],
        ["扩展接口", "Arduino Uno V3 接口 + ST morpho 排针"],
        ["工作电压", "3.3V（板载稳压支持 USB/外部供电）"],
        ["供电", "USB 或 7-12V 外部电源"],
        ["尺寸", "约 70 × 82.5mm（Nucleo-64）"],
        ["开发环境", "STM32CubeIDE、Keil MDK、IAR、mbed、PlatformIO"]
      ],
      scores: [
        ["性能", 78],
        ["接口资源", 88],
        ["调试体验", 92],
        ["生态", 88],
        ["性价比", 86]
      ],
      score: 8.6,
      userScore: 8.4,
      pros: ["板载 ST-LINK 免外接调试器，虚拟串口调试方便", "180MHz Cortex-M4F 加 FPU，DSP 与电机控制游刃有余", "Arduino 接口 + morpho 双排针，扩展与量产验证兼顾"],
      cons: ["板载 ST-LINK 速度一般，大批量烧录效率有限", "USB 供电时大电流外设需注意供电能力"],
      review: {
        objective: "Nucleo-F446RE 载有 STM32F446RE：Cortex-M4F 内核 180MHz、512KB Flash、128KB SRAM，外设涵盖 4 路 UART、3 路 SPI/I2C、2 路 CAN、USB FS 与 11 个定时器，提供 3 组 12-bit ADC 与 2 组 DAC。板载 ST-LINK/V2-1 提供 SWD 调试与虚拟串口，CubeMX 支持完善。",
        subjective: "Nucleo 是“正经学 STM32”的标准答案：原厂品质、HAL 库、CubeMX 一键生成初始化代码，调试器都替你省了。跑个 PID 电机控制、做个 FFT 音频分析，180MHz 加 FPU 很从容。体积比最小系统板大一圈，但换来的是稳定的做工与完整文档。想从野路子开发板转到正规军工程流程，用它过渡再合适不过。"
      }
    },
    {
      id: "raspberry-pi-pico-w",
      name: "Raspberry Pi Pico W",
      brand: "Raspberry Pi",
      category: "mcu",
      year: 2022,
      priceText: "约 ¥55",
      price: 55,
      tags: ["RP2040", "双核M0+", "Wi-Fi", "MicroPython", "PIO"],
      summary: "树莓派自研 RP2040 双核 Cortex-M0+ 加 Wi-Fi 的微控制器板，133MHz、264KB SRAM、2MB Flash，独特的 PIO 状态机可自定义接口，MicroPython 体验极佳，是极客桌上的万金油。",
      specs: [
        ["主控", "树莓派 RP2040"],
        ["内核", "双核 Arm Cortex-M0+"],
        ["主频", "133MHz"],
        ["Flash", "2MB（板载 QSPI Flash）"],
        ["SRAM", "264KB（6 组 bank）"],
        ["无线", "英飞凌 CYW43439：Wi-Fi 802.11 b/g/n、蓝牙 5.2 / BLE"],
        ["GPIO", "26 个多功能 GPIO（3.3V 电平）"],
        ["ADC", "3 路 12-bit ADC（最多 5 通道）"],
        ["特色外设", "2 组 PIO 可编程 IO 状态机（可实现自定义接口）"],
        ["通信接口", "2× UART、2× SPI、2× I2C、16 路 PWM"],
        ["工作电压", "1.8-5.5V（板载稳压）"],
        ["USB", "micro-USB（支持 USB 大容量存储烧录）"],
        ["开发环境", "MicroPython、C/C++ SDK、Arduino、CircuitPython"]
      ],
      scores: [
        ["性能", 66],
        ["可玩性", 92],
        ["易用性", 88],
        ["生态", 90],
        ["性价比", 92]
      ],
      score: 8.7,
      userScore: 8.8,
      pros: ["PIO 状态机可实现 WS2812、DVI 等自定义时序接口", "MicroPython 拖拽烧录体验极佳，上手零门槛", "5V 兼容供电与 26 个 GPIO，价格仅几十元"],
      cons: ["内存 264KB、无 PSRAM，大型程序空间有限", "板载天线性能一般，远距离无线场景受限"],
      review: {
        objective: "Raspberry Pi Pico W 在 RP2040（双核 Cortex-M0+ 133MHz、264KB SRAM）基础上加入 CYW43439 无线模组，提供 Wi-Fi 802.11 b/g/n 与 BLE，板载 2MB QSPI Flash。26 个 GPIO 支持 PWM、ADC、UART、SPI、I2C，两组 PIO 状态机可实现自定义时序协议，MicroPython 支持完善。",
        subjective: "Pico W 是那种“买着便宜、玩着上头”的板子。拖个 main.py 进 U 盘就跑起来的 MicroPython 体验，让调试变得像写脚本一样轻松；PIO 更是黑科技，点个灯带、做个逻辑分析仪都不在话下。加上 Wi-Fi 后物联网小项目也齐活了。缺点是内存不算大、天线一般，但这个价位实在难再苛求。入门与进阶之间，它是很好的一站。"
      }
    },
    {
      id: "luat-air101",
      name: "合宙 Air101",
      brand: "合宙通信 Luat",
      category: "mcu",
      year: 2021,
      priceText: "约 ¥15",
      price: 15,
      tags: ["LuatOS", "Wi-Fi", "国产", "低功耗", "高性价比"],
      summary: "合宙推出的超低价 Wi-Fi MCU 核心板，基于联盛德 W800 系 32 位内核，主频约 240MHz，支持 LuatOS（Lua）与 C 开发，内置 Wi-Fi，是做智能插座与传感器节点的国产平价方案。",
      specs: [
        ["主控", "联盛德 W800 系列芯片（Air101 核心板）"],
        ["内核", "32 位 MCU 内核（约 240MHz）"],
        ["Flash", "约 2MB（片上集成）"],
        ["RAM", "约 288KB"],
        ["无线", "Wi-Fi 802.11 b/g/n（2.4GHz）"],
        ["GPIO", "约 30+ 个可引出 IO（具体以板型丝印为准）"],
        ["通信接口", "UART ×3、SPI、I2C、I2S、PWM、ADC"],
        ["工作电压", "3.0-3.6V（典型 3.3V）"],
        ["低功耗", "支持低功耗睡眠模式（具体电流随场景而变）"],
        ["封装", "邮票孔核心板，约 24 × 16mm 量级"],
        ["开发环境", "LuatOS（Lua 脚本）、C SDK（CDK 工具链）"],
        ["生态", "合宙社区与 LuatOS 仓库，中文资料为主"]
      ],
      scores: [
        ["性价比", 96],
        ["性能", 58],
        ["生态", 70],
        ["集成度", 80],
        ["易用性", 72]
      ],
      score: 7.4,
      userScore: 7.5,
      pros: ["核心板价格仅十几元，量产与试错成本极低", "LuatOS 用 Lua 写物联网应用，开发效率高", "内置 Wi-Fi 与丰富外设，一颗芯片即可做联网节点"],
      cons: ["芯片与资料生态小众，遇到问题排查成本高", "海外市场与第三方库支持有限，量产需评估供货"],
      review: {
        objective: "Air101 是合宙推出的低成本 Wi-Fi MCU 核心板，主控为联盛德 W800 系 32 位处理器，主频约 240MHz，片上集成约 2MB Flash 与约 288KB RAM，支持 Wi-Fi 802.11 b/g/n，外设含 UART、SPI、I2C、I2S、PWM 与 ADC。开发以 LuatOS（Lua）为主，也提供 C SDK。",
        subjective: "合宙把“便宜”做到了极致：十几块钱的联网开发板，拿来练手、做小批量产品都毫无心理负担。LuatOS 用 Lua 写逻辑，几十行代码就能把传感器数据推上云，调试效率比裸写 C 高不少。代价是生态小众，出了问题得多翻社区帖子，英文资料几乎为零。作为国产平价方案它诚意十足，适合成本敏感、有量产意识的玩家。"
      }
    }
  ]
});
window.DB_CHUNKS.push({
  category: "robot",
  categoryName: "机器人",
  icon: "🤖",
  description: "教育、消费与行业机器人",
  products: [
    {
      id: "dji-robomaster-s1",
      name: "大疆 RoboMaster S1",
      brand: "大疆 DJI",
      category: "robot",
      year: 2019,
      priceText: "约 ¥3499",
      price: 3499,
      tags: ["教育机器人", "麦克纳姆轮", "编程", "竞技", "视觉"],
      summary: "大疆面向教育市场的模块化竞技机器人，麦克纳姆轮全向移动，云台可发射水晶弹并支持视觉识别，内置多种传感器，支持 Scratch 与 Python 编程，把游戏感与工程学习融为一体。",
      specs: [
        ["驱动", "4 轮麦克纳姆轮全向移动底盘"],
        ["动力", "无刷电机驱动，支持速度/位置闭环控制"],
        ["云台", "可旋转发射机构，支持水晶弹发射"],
        ["处理器", "板载主控（支持 Scratch / Python 编程）"],
        ["传感器", "摄像头、麦克风阵列、加速度/陀螺仪、红外/碰撞检测等"],
        ["视觉功能", "目标识别、标签识别（视觉标签）、跟随"],
        ["电池", "约 2400mAh 锂电池（10.8V 量级）"],
        ["续航", "约 30-40 分钟（视玩法而定）"],
        ["控制方式", "手机/平板 App、手柄遥控、Scratch/Python 图形与代码编程"],
        ["通信", "Wi-Fi 连接遥控设备"],
        ["模块化", "开放电机、云台、传感器等编程接口"],
        ["重量", "约 3.3kg"]
      ],
      scores: [
        ["可玩性", 94],
        ["教学价值", 90],
        ["做工", 92],
        ["性价比", 72],
        ["开放性", 82]
      ],
      score: 8.6,
      userScore: 8.3,
      pros: ["麦克纳姆轮 + 视觉玩法，游戏化的编程驱动力强", "Scratch 到 Python 的编程梯度完整，课堂落地容易", "大疆做工与稳定性，机械与电控调校成熟"],
      cons: ["整机价格较高，配件与水晶弹持续消耗", "核心软件生态相对封闭，深度定制空间有限"],
      review: {
        objective: "RoboMaster S1 采用四轮麦克纳姆轮实现全向移动，配备可旋转云台与水晶弹发射机构，支持视觉标签识别与目标跟随；传感器含摄像头、麦克风阵列与惯性测量单元等。官方提供从 Scratch 图形化到 Python 的编程接口。电池约 2400mAh，续航约半小时量级，通过 Wi-Fi 与手机/平板连接遥控，定位为把电控、机械与算法教学包装成竞技游戏的教育机器人。",
        subjective: "S1 最聪明的地方是让人“为了赢比赛而学编程”：想让车跑得快、打得准，就得去调 PID、写视觉逻辑，学习动机完全内生。做工是大疆水准，开箱即玩不折腾；Scratch 拖块到 Python 的过渡也设计得顺滑。不足是价格门槛不低，水晶弹和配件是持续开销，而且玩法深度依赖官方生态。作为家庭与课堂的“编程诱饵”，它目前几乎没有同级对手。"
      }
    },
    {
      id: "unitree-go2",
      name: "宇树 Unitree Go2",
      brand: "宇树科技 Unitree",
      category: "robot",
      year: 2023,
      priceText: "约 ¥9999 起（Air 版）",
      price: 9999,
      tags: ["四足机器人", "机器狗", "具身智能", "二次开发", "激光雷达"],
      summary: "宇树科技消费级四足机器人，12 个自研关节电机实现奔跑、跳跃与自平衡恢复，可选配 4D 激光雷达与高算力模组，支持语音、App 控制与 SDK 二次开发，把消费级机器狗价格拉进万元级。",
      specs: [
        ["自由度", "12 个关节自由度（每腿 3 个）"],
        ["关节电机", "自研准直驱关节电机，峰值扭矩约 45N·m 量级（关节处）"],
        ["处理器", "8 核 CPU（高配可选 NVIDIA Jetson 算力模组）"],
        ["传感器", "深度相机/鱼眼相机、IMU、关节编码器，可选 4D 激光雷达（Pro/EDU）"],
        ["电池", "约 8000mAh 锂电池（约 28.8V）"],
        ["续航", "约 1-2 小时（视运动强度）"],
        ["运动能力", "行走、小跑、跳跃、翻越、自平衡恢复"],
        ["控制方式", "遥控手柄、手机 App、语音指令、二次开发 SDK"],
        ["开发支持", "ROS/ROS2、SDK（Python/C++）、仿真环境"],
        ["最大速度", "约 3.5m/s（约 12-13km/h）"],
        ["重量", "约 15kg"],
        ["负载", "约 5-8kg（持续负载视工况）"]
      ],
      scores: [
        ["运动性能", 92],
        ["开放性", 88],
        ["感知配置", 84],
        ["性价比", 88],
        ["续航", 72]
      ],
      score: 8.7,
      userScore: 8.2,
      pros: ["万元级价格让四足机器人走进个人与实验室", "12 关节自研电机，运动能力与稳定性表现出色", "SDK 与 ROS 支持开放，具身智能研究友好"],
      cons: ["续航约 1-2 小时，持续作业需备用电池", "高配与选配雷达/算力模组后价格明显上升"],
      review: {
        objective: "Unitree Go2 拥有 12 个关节自由度，由自研准直驱电机驱动，整机约 15kg，最大速度约 3.5m/s，可完成行走、小跑、跳跃与摔倒自恢复等动作。感知配相机与 IMU，Pro/EDU 可选 4D 激光雷达与算力模组；电池约 8000mAh，续航约 1-2 小时。控制支持遥控手柄、手机 App 与语音，官方开放 SDK 与 ROS 支持，可进行二次开发。",
        subjective: "以前四足机器人是实验室里的昂贵玩物，Go2 把它拉到了万元档。牵出门回头率极高，跑起来的动态平衡让人忍不住多看几眼；SDK 也确实开放，接自己的算法做导航、做具身智能实验都可行。要留意的是续航不算长，激烈运动后电池掉得快，机械结构虽结实也怕暴力折腾。对研究者它是平价试验田，对普通用户它更像一台需要尊重的高级玩具。"
      }
    },
    {
      id: "ubtech-alpha-1s",
      name: "优必选 Alpha 1S",
      brand: "优必选 UBTech",
      category: "robot",
      year: 2016,
      priceText: "约 ¥2999",
      price: 2999,
      tags: ["人形机器人", "舵机", "教育", "舞蹈", "App控制"],
      summary: "曾登上央视春晚舞台的桌面人形机器人，16 个伺服舵机实现类人动作，手机 App 拖拽即可编排动作与舞蹈，支持 3D 可视化编程，是消费级人形机器人的早期代表作。",
      specs: [
        ["自由度", "16 个伺服舵机（双臂、双腿、头部等）"],
        ["舵机", "数字伺服舵机，支持位置反馈"],
        ["处理器", "板载嵌入式主控（集成动作控制）"],
        ["传感器", "舵机位置反馈、姿态传感（具体配置视批次）"],
        ["电池", "约 7.4V 锂电池（约 2000mAh 量级）"],
        ["续航", "约 60 分钟（常规动作）"],
        ["控制方式", "手机 App（iOS/Android）蓝牙遥控、动作编排"],
        ["编程", "3D 可视化动作编辑、图形化编程"],
        ["动作能力", "舞蹈、俯卧撑、倒立、行走等预设与自编动作"],
        ["身高 / 重量", "约 40cm 高 / 约 1.7kg"],
        ["充电", "专用充电器，约 1-2 小时充满"],
        ["材质", "工程塑料外壳 + 金属舵机结构"]
      ],
      scores: [
        ["动作表现", 84],
        ["易用性", 80],
        ["教育价值", 78],
        ["性价比", 68],
        ["开放性", 62]
      ],
      score: 7.6,
      userScore: 7.4,
      pros: ["16 舵机人形结构，动作表演观赏性强", "App 拖拽编舞直观，无需代码即可创作动作", "春晚效应带来高知名度，产品成熟度较好"],
      cons: ["开放性有限，深度编程与第三方扩展能力弱", "舵机为易损件，长期高强度使用维护成本高"],
      review: {
        objective: "Alpha 1S 是优必选推出的桌面级人形机器人，全身约 16 个数字伺服舵机构成双臂、双腿与头部等自由度，可完成行走、舞蹈、俯卧撑等动作。控制系统通过蓝牙与手机 App 连接，提供动作拖拽编排与 3D 可视化编程功能；内置锂电池约 7.4V/2000mAh 量级，常规续航约一小时。整机高约 40cm、重约 1.7kg，是消费级人形机器人中较早实现规模化销售的产品之一。",
        subjective: "Alpha 1S 站在桌上跳一段舞，那种“小人儿活了”的观感很难被四轮小车替代。App 里拖几下就能编出新动作，上手门槛很低，孩子和大人都能玩进去。可惜它更像一台动作表演机：能编程的空间有限，想接入自己的算法基本没门，舵机磨损后维修也不便宜。作为客厅里的科技摆件和入门教具它合格，想搞研究则要另寻平台。"
      }
    },
    {
      id: "lego-mindstorms-robot-inventor",
      name: "LEGO Mindstorms Robot Inventor",
      brand: "乐高 LEGO",
      category: "robot",
      year: 2020,
      priceText: "约 ¥3199",
      price: 3199,
      tags: ["乐高", "教育机器人", "Python", "积木", "STEM"],
      summary: "乐高 MINDSTORMS 系列收官之作，智能集线器搭配角度电机与传感器，支持 Scratch 积木与 Python 编程，可搭建从人形到机械臂的多种形态，是积木与代码结合的集大成者。",
      specs: [
        ["自由度", "视搭建形态而定（套装可搭 5 种以上官方模型）"],
        ["智能集线器", "集成 32 位微控制器（ST STM32F4 系，约 100MHz+）"],
        ["端口", "6 个输入/输出端口（自动识别电机与传感器）"],
        ["传感器", "颜色传感器、距离传感器、六轴陀螺仪（集线器内置）等"],
        ["电机", "套装含多个角度电机（可精确控制角度与速度）"],
        ["电池", "智能集线器内置可充电锂电池"],
        ["续航", "约 1-2 小时（视负载）"],
        ["控制方式", "蓝牙连接平板/电脑，App 遥控与编程"],
        ["编程", "Word Blocks（Scratch 3 风格积木）与 Python"],
        ["通信", "蓝牙 5.0、USB"],
        ["兼容性", "兼容乐高 Technic 与 System 积木"],
        ["套装规模", "约 900+ 颗粒（51515）"]
      ],
      scores: [
        ["可玩性", 92],
        ["教学价值", 94],
        ["扩展性", 92],
        ["性价比", 70],
        ["开放性", 76]
      ],
      score: 8.6,
      userScore: 8.5,
      pros: ["积木搭建 + Scratch/Python 双轨编程，学习路径完整", "智能集线器端口自动识别，接线与调试省心", "官方模型从人形到工程车，玩法覆盖广"],
      cons: ["价格较高，作为教育产品门槛不低", "官方 App 依赖度高，脱离生态后开发体验下降"],
      review: {
        objective: "MINDSTORMS Robot Inventor（51515）以智能集线器为核心，内置 32 位微控制器（STM32F4 系）与六轴陀螺仪，提供 6 个自动识别的输入/输出端口，通过蓝牙 5.0 与平板/电脑连接。套装含多个角度电机与颜色、距离传感器，约 900+ 颗粒，可搭建 5 种以上官方模型。编程提供 Word Blocks 积木与 Python，兼顾图形化入门与代码进阶。",
        subjective: "这是乐高把“编程教育”打磨得最完整的一套：先搭出一个会动的怪兽，再让它按自己的逻辑行动，创造感层层递进。积木质量依旧是乐高水平，集线器的端口识别让课堂管理轻松不少，Python 支持也让大孩子有继续深挖的空间。遗憾是价格不便宜，且玩法深度绑官方 App。若预算允许，它仍是家庭与机构采购的稳妥之选。"
      }
    },
    {
      id: "lego-spike-prime",
      name: "乐高 SPIKE Prime",
      brand: "乐高 LEGO",
      category: "robot",
      year: 2019,
      priceText: "约 ¥2799",
      price: 2799,
      tags: ["乐高", "STEM教育", "课堂", "Scratch", "竞赛"],
      summary: "乐高 Education 面向中学课堂的 STEM 套装，智能集线器配角度电机与颜色、力、距离传感器，SPIKE App 积木编程直观易用，是全球机器人竞赛与课堂教学的主力套装之一。",
      specs: [
        ["自由度", "视搭建形态而定（官方单元课程含多种模型）"],
        ["智能集线器", "集成 32 位微控制器（ST STM32F4 系）"],
        ["端口", "6 个输入/输出端口（自动识别电机与传感器）"],
        ["显示", "5×5 可编程 LED 灯阵"],
        ["传感器", "颜色传感器、力传感器、距离传感器、六轴陀螺仪（内置）"],
        ["电机", "套装含 3 个角度电机（精确角度与速度控制）"],
        ["电池", "智能集线器内置可充电锂电池"],
        ["续航", "约 1-2 小时（视负载）"],
        ["控制方式", "蓝牙连接平板/电脑，App 遥控与编程"],
        ["编程", "SPIKE App Word Blocks（Scratch 风格）与 Python"],
        ["兼容性", "兼容乐高 Technic 与 System 积木"],
        ["课程", "配套中学 STEM 课程单元与教师资源"]
      ],
      scores: [
        ["教学价值", 95],
        ["易用性", 90],
        ["扩展性", 90],
        ["性价比", 72],
        ["开放性", 76]
      ],
      score: 8.7,
      userScore: 8.5,
      pros: ["课堂导向设计，教师课程与管理资源完善", "5×5 灯阵与三类传感器，课堂项目表达力强", "积木到 Python 的进阶路线清晰，适配竞赛需求"],
      cons: ["整套价格偏高，多班采购成本可观", "以教育渠道为主，个人购买与售后不如消费产品方便"],
      review: {
        objective: "SPIKE Prime（45678）面向 10 岁以上课堂，核心为带 5×5 LED 灯阵的智能集线器，内置 32 位微控制器（STM32F4 系）与六轴陀螺仪，6 个输入/输出端口自动识别外设。套装提供 3 个角度电机与颜色、力、距离传感器，编程使用 Word Blocks 与 Python，配套完整的中学 STEM 课程与教师支持材料。",
        subjective: "SPIKE Prime 是为课堂而生的：拆装快、收纳规整、课程现成，老师不用从零备课。灯阵显示状态、力传感器做“轻触即停”这类小设计，让抽象概念变得可触摸。Python 入口也给得恰到好处，竞赛队一路用下去不换平台。要说短板，就是价格对多班采购不友好，硬件也谈不上发烧级。作为教具，它把“好教”做到了很高的水准。"
      }
    },
    {
      id: "mycobot-280",
      name: "myCobot 280 机械臂",
      brand: "大象机器人 Elephant Robotics",
      category: "robot",
      year: 2021,
      priceText: "约 ¥5999（Pi 版）",
      price: 5999,
      tags: ["机械臂", "协作机器人", "ROS", "教育", "桌面级"],
      summary: "大象机器人出品的桌面级六轴协作机械臂，臂展约 280mm、负载约 250g，有 M5、树莓派、Jetson 等多个控制版本，支持 ROS 与 Python 二次开发，是科研教学的热门入门机械臂。",
      specs: [
        ["自由度", "6 个关节自由度（六轴）"],
        ["有效负载", "约 250g"],
        ["工作半径", "约 280mm"],
        ["重复定位精度", "约 ±0.5mm"],
        ["关节驱动", "步进电机 + 闭环控制（关节内置驱动）"],
        ["处理器", "依版本而定：Raspberry Pi 4 / M5Stack / Jetson Nano 等"],
        ["传感器", "关节编码器（位置反馈）"],
        ["电池", "无内置电池（需外接电源供电，约 12V）"],
        ["续航", "插电持续工作（功耗约 10-20W 量级）"],
        ["控制方式", "拖动示教、myBlockly 图形化、Python（pymycobot）、ROS/ROS2"],
        ["末端扩展", "支持夹爪、吸泵、摄像头等末端执行器（另购）"],
        ["重量", "约 850g（整臂）"]
      ],
      scores: [
        ["易用性", 84],
        ["开放性", 92],
        ["精度表现", 78],
        ["性价比", 82],
        ["扩展性", 86]
      ],
      score: 8.4,
      userScore: 8.2,
      pros: ["约 850g 的轻量机身，桌面部署零门槛", "pymycobot / ROS 接口开放，算法验证效率高", "多控制版本可选，从入门到边缘 AI 平滑升级"],
      cons: ["250g 负载与 ±0.5mm 精度只适合轻量教学演示", "步进电机高速运行时振动与噪音较明显"],
      review: {
        objective: "myCobot 280 是桌面级六轴协作机械臂，臂展约 280mm，额定负载约 250g，重复定位精度约 ±0.5mm，整臂重量约 850g，采用关节内置驱动的步进电机方案。控制核心提供 M5Stack、Raspberry Pi 与 Jetson Nano 版本，供电约 12V，支持 myBlockly、pymycobot 与 ROS/ROS2，面向教育科研与轻量原型验证。",
        subjective: "myCobot 280 把“机械臂实验室”缩到了书桌上：开箱接电，拖动示教几步，它就记住轨迹；接上 Python，几十行代码跑起视觉抓取 demo。ROS 支持对研究生尤其友好，写好的算法迁移成本低。它的力气和精度当然不能和工业臂比，搬重物、做精密装配就别为难它了。作为算法验证与教学平台，它在这个价位几乎是最优解之一。"
      }
    },
    {
      id: "adeept-picar-x",
      name: "Adeept PiCar-X",
      brand: "Adeept",
      category: "robot",
      year: 2020,
      priceText: "约 ¥899",
      price: 899,
      tags: ["智能小车", "树莓派", "视觉", "循迹", "STEM"],
      summary: "基于树莓派的四驱智能小车套件，2 自由度摄像头云台、超声波与循迹传感器齐备，支持 Python 与图形化 App 控制，可做避障、循迹、视觉识别等项目，是树莓派机器人入门的经典套件。",
      specs: [
        ["自由度", "4 轮驱动底盘 + 2 自由度摄像头云台"],
        ["主控", "树莓派（4/3B+ 等，通常另购或套装含）"],
        ["驱动板", "专用 Robot HAT（电机驱动、舵机、传感器接口）"],
        ["传感器", "摄像头、超声波测距、灰度循迹传感器、红外接收等"],
        ["电池", "2 节 18650 锂电池（约 7.4V 量级）"],
        ["续航", "约 40-60 分钟（视运动强度）"],
        ["控制方式", "EzBlock App（蓝牙/无线）、Python 脚本、SSH 远程"],
        ["编程", "Python、EzBlock 图形化"],
        ["功能", "避障、循迹、视觉识别、遥控、语音类扩展项目"],
        ["摄像头", "支持树莓派摄像头（含云台舵机）"],
        ["重量", "约 0.8kg 量级（视配置）"],
        ["组装", "需要自行组装与接线（教程完善）"]
      ],
      scores: [
        ["教学价值", 86],
        ["可玩性", 84],
        ["扩展性", 82],
        ["性价比", 84],
        ["开箱体验", 70]
      ],
      score: 8.0,
      userScore: 8.0,
      pros: ["树莓派生态加持，视觉与 AI 项目空间大", "摄像头云台 + 超声波 + 循迹，一套件覆盖多种经典项目", "Python 与图形化双入口，进阶路径清晰"],
      cons: ["需要自行组装调试，动手门槛对纯新手略高", "18650 电池与树莓派需留意供电稳定性"],
      review: {
        objective: "Adeept PiCar-X 是基于树莓派的四驱智能小车套件，专用 Robot HAT 驱动电机与舵机，配备 2 自由度摄像头云台、超声波测距与灰度循迹传感器，支持避障、循迹与视觉识别。2 节 18650 电池供电，续航约 40-60 分钟，支持 EzBlock 图形化与 Python 编程，教程文档完善，适合教学与个人进阶。",
        subjective: "PiCar-X 是“用树莓派学机器人”的实惠入口：小车会自己避障、跟着黑线跑、用摄像头认东西，每加一行代码都有直观反馈。组装过程本身就是一课，接线、装舵机、调传感器，做完对硬件的理解会深一截。对纯新手来说组装与供电调试是道坎，18650 电池也得买对。总体而言它内容扎实、价格合理，是树莓派玩家值得折腾的一套小车。"
      }
    }
  ]
});
