# 选衣录核心算法库

> 从「选衣录」项目中提取的全部核心算法，可独立使用。

## 📦 文件说明

| 文件 | 大小 | 说明 |
|------|------|------|
| `xuanyilu-core.js` | 134 KB | 核心算法库，全部功能都在这里 |
| `使用示例.html` | - | 打开就能看到效果的演示页面 |

## 🚀 快速开始

```html
<script src="xuanyilu-core.js"></script>
<script>
  // 设置用户信息
  XuanYiLuCore.setGender('female');
  XuanYiLuCore.setOccasion('date');
  XuanYiLuCore.setSeason('spring');

  // 生成搭配
  var results = XuanYiLuCore.generateCombinations(items, 6);
</script>
```

打开 `使用示例.html` 可以直接看到运行效果。

## 🎯 包含的功能

### 🎨 颜色提取系统
- 背景色自动检测与排除
- 阴影/暗部过滤
- 主色、辅助色、点缀色提取
- 版本号机制，算法升级自动重新提取

### 🔬 色彩空间工具
- RGB ↔ HSL ↔ HSV 互相转换
- 色相距离计算（环式，0-180°）
- 中性色判断（黑白灰米棕）
- 色相族分类（红橙黄绿青蓝紫粉）
- 冷暖色调判断
- 四季色彩季型

### 🎯 搭配评分算法
（基于 AI choose.py 的专业算法）

- **色彩匹配评分**（40%）
  - 适度匹配原则（Wundt 倒 U 曲线）
  - 色相匹配：30°-90° 区间得分最高
  - 明度对比、纯度平衡、冷暖协调

- **版型/体型评分**（30%）
  - 五大体型：梨形、苹果形、沙漏形、直筒形、倒三角
  - 上松下紧 / 上紧下松 的比例平衡

- **场合适配评分**（15%）
  - 9 种场合正式度分级
  - 正式场合：中性色基底，避免高饱和

- **季节适配评分**（15%）
  - 四季色彩季型匹配
  - 冬季保暖外套检查

### 🤖 大模型接口
- 上下文构建（用户画像 + 衣柜数据）
- OpenAI 兼容格式调用
- Ollama 本地模型支持
- 自动降级到本地算法

### 🧩 组合生成系统
- 跨品类组合构建（上衣+下装+外套+鞋+包）
- 品类去重
- 多样性筛选（贪心算法，确保每张卡片不同）

## 📋 API 列表

### 设置类
```js
XuanYiLuCore.setGender('female' | 'male');      // 性别
XuanYiLuCore.setAge('teen' | 'worker' | 'middle' | 'senior');  // 年龄段
XuanYiLuCore.setSize('S' | 'M' | 'L' | 'XL');    // 尺码
XuanYiLuCore.setOccasion('daily' | 'work' | 'date' | 'party' | 'wedding' | 'business' | 'home' | 'travel' | 'sports');  // 场合
XuanYiLuCore.setSeason('spring' | 'summer' | 'autumn' | 'winter');  // 季节
```

### 颜色提取
```js
XuanYiLuCore.extractColors(imageData);
// 返回 { main, secondary, accent, palette, version }
```

### 搭配生成
```js
XuanYiLuCore.generateCombinations(items, count);
// 返回 [{ name, desc, score, items, tags, colors }]
```

### 色彩工具
```js
XuanYiLuCore.rgbToHsl(r, g, b);
XuanYiLuCore.hslToRgb(h, s, l);
XuanYiLuCore.hueDistance(h1, h2);
XuanYiLuCore.isNeutral(hexColor);
```

### 大模型
```js
XuanYiLuCore.isAIOutfitReady();   // 检查是否配置了大模型
XuanYiLuCore.buildAIContext(items);  // 构建请求上下文
XuanYiLuCore.callAIOutfit(items, count); // 调用大模型（返回 Promise）
```

## 📝 衣服数据格式

```js
var item = {
  id: '唯一标识',
  name: '衣服名称',
  category: 'T恤',      // 品类
  subCategory: '圆领T恤', // 子品类
  colors: {
    main: '#FFFFFF',     // 主色
    secondary: '#CCCCCC', // 辅助色（可选）
    accent: '#FF0000'    // 点缀色（可选）
  },
  pattern: '纯色',       // 花纹：纯色/碎花/条纹/格子/波点
  length: '短款',        // 长度：短款/常规/中长款/长款
  fit: '修身',           // 版型：修身/常规/宽松
  style: '休闲',         // 风格：休闲/正式/运动/甜美/通勤
  season: ['spring', 'summer']  // 适用季节
};
```
