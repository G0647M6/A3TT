/* ============================================================
 *  选衣录 - 核心算法库 (xuanyilu-core.js)
 *  ============================================================
 * 
 *  🎨 颜色提取系统
 *     - 背景色自动检测与排除
 *     - 阴影/暗部过滤
 *     - 主色/辅助色/点缀色提取
 * 
 *  🔬 色彩空间工具
 *     - RGB ↔ HSL ↔ HSV 转换
 *     - 色相距离计算（环式）
 *     - 中性色判断
 *     - 色相族分类（红橙黄绿青蓝紫粉）
 * 
 * 🎯 搭配评分算法（基于 AI choose.py）
 *     - 色彩匹配评分：适度匹配原则（Wundt 倒 U 曲线）
 *       · 色相匹配（30°-90° 最优）
 *       · 明度对比
 *       · 纯度平衡
 *       · 冷暖协调
 *     - 版型/体型评分
 *       · 五大体型：梨形/苹果形/沙漏形/直筒形/倒三角
 *       · 上松下紧 / 上紧下松 比例平衡
 *     - 场合适配评分（9 种场合正式度分级）
 *     - 季节适配评分（四季色彩季型）
 * 
 *  🤖 大模型接口
 *     - 上下文构建（用户画像 + 衣柜数据）
 *     - 搭配推荐调用（OpenAI 兼容格式）
 *     - Ollama 本地模型支持
 * 
 *  🧩 组合生成系统
 *     - 跨品类组合构建
 *     - 多样性筛选（贪心算法）
 *     - 品类去重
 * 
 *  ⚙️ 状态管理
 *     - 性别/年龄/尺码/场合/季节
 *     - 衣服数据
 * 
 *  使用方式：
 *    // 浏览器
 *    XuanYiLuCore.setGender('female');
 *    XuanYiLuCore.setOccasion('date');
 *    var results = XuanYiLuCore.generateCombinations(items, 6);
 * 
 * ============================================================ */

(function (global) {
'use strict';

// ===== 全局状态 =====
var state = {
  gender: 'female',
  age: 'worker',
  size: null,
  occasion: 'daily',
  season: 'spring',
  items: [],
  trendingItem: null
};

// ===== 配置常量 =====
var CURRENT_COLOR_VERSION = 2;

"use strict";

// 品类定义
var CATEGORIES = [
  // 服装类
  { value: "top", label: "上衣/内搭", group: "clothing", order: 1 },
  { value: "shirt", label: "衬衫", group: "clothing", order: 2 },
  { value: "tshirt", label: "T恤", group: "clothing", order: 3 },
  { value: "sweater", label: "毛衣", group: "clothing", order: 4 },
  { value: "hoodie", label: "卫衣", group: "clothing", order: 5 },
  { value: "coat", label: "外套", group: "clothing", order: 6 },
  { value: "jacket", label: "夹克", group: "clothing", order: 7 },
  { value: "suit", label: "西装", group: "clothing", order: 8 },
  { value: "pants", label: "长裤", group: "clothing", order: 9 },
  { value: "shorts", label: "短裤", group: "clothing", order: 10 },
  { value: "jeans", label: "牛仔裤", group: "clothing", order: 11 },
  { value: "dress", label: "连衣裙", group: "clothing", order: 12 },
  { value: "skirt", label: "半身裙", group: "clothing", order: 13 },
  // 配饰类 — 鞋履
  { value: "shoes", label: "皮鞋/休闲鞋", group: "accessory", order: 14 },
  { value: "sneakers", label: "运动鞋", group: "accessory", order: 15 },
  { value: "boots", label: "靴子", group: "accessory", order: 16 },
  { value: "sandals", label: "凉鞋", group: "accessory", order: 17 },
  { value: "heels", label: "高跟鞋", group: "accessory", order: 18 },
  { value: "canvas", label: "帆布鞋", group: "accessory", order: 19 },
  { value: "slippers", label: "拖鞋", group: "accessory", order: 20 },
  // 配饰类 — 箱包
  { value: "bag", label: "包包", group: "accessory", order: 21 },
  { value: "backpack", label: "双肩包", group: "accessory", order: 22 },
  { value: "crossbody", label: "斜挎包", group: "accessory", order: 23 },
  { value: "clutch", label: "手拿包", group: "accessory", order: 24 },
  { value: "wallet", label: "钱包", group: "accessory", order: 25 },
  // 配饰类 — 帽类
  { value: "hat", label: "帽子", group: "accessory", order: 26 },
  { value: "cap", label: "棒球帽", group: "accessory", order: 27 },
  { value: "bucket", label: "渔夫帽", group: "accessory", order: 28 },
  { value: "beret", label: "贝雷帽", group: "accessory", order: 29 },
  { value: "beanie", label: "针织帽", group: "accessory", order: 30 },
  // 配饰类 — 颈部配饰
  { value: "scarf", label: "围巾", group: "accessory", order: 31 },
  { value: "silkscarf", label: "丝巾", group: "accessory", order: 32 },
  { value: "tie", label: "领带", group: "accessory", order: 33 },
  // 配饰类 — 首饰（细分）
  { value: "earrings", label: "耳环", group: "accessory", order: 34 },
  { value: "necklace", label: "项链", group: "accessory", order: 35 },
  { value: "ring", label: "戒指", group: "accessory", order: 36 },
  { value: "bracelet", label: "手链", group: "accessory", order: 37 },
  { value: "bangle", label: "手镯", group: "accessory", order: 38 },
  { value: "brooch", label: "胸针", group: "accessory", order: 39 },
  // 配饰类 — 其他
  { value: "belt", label: "腰带", group: "accessory", order: 40 },
  { value: "watch", label: "手表", group: "accessory", order: 41 },
  { value: "sunglasses", label: "太阳镜", group: "accessory", order: 42 },
  { value: "hairacc", label: "发饰", group: "accessory", order: 43 },
  // 其他（自定义）
  { value: "other", label: "其他", group: "clothing", order: 99, custom: true }
];

var CUSTOM_CATEGORIES_KEY = "clothing_custom_cats_v1";
var customCategories = [];

function loadCustomCategories() {
  try {
    var saved = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (saved) customCategories = JSON.parse(saved) || [];
  } catch (e) { customCategories = []; }
}

function saveCustomCategories() {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
  } catch (e) {}
}

function getAllCategories() {
  return CATEGORIES.concat(customCategories);
}

function getCategoryByValue(value) {
  var all = getAllCategories();
  for (var i = 0; i < all.length; i++) {
    if (all[i].value === value) return all[i];
  }
  // 旧品类兼容映射
  var legacyMap = {
    jewelry: { value: "jewelry", label: "首饰", group: "accessory", order: 99 },
    accessory: { value: "accessory", label: "其他配饰", group: "accessory", order: 99 }
  };
  if (legacyMap[value]) return legacyMap[value];
  return null;
}

var CATEGORY_GROUPS = [
  { key: "clothing", label: "服装", desc: "上衣、外套、裤装、裙装等" },
  { key: "accessory", label: "配饰", desc: "鞋履、箱包、帽饰、首饰等" }
];

function getCategoryLabel(value) {
  var all = getAllCategories();
  for (var ci = 0; ci < all.length; ci++) {
    if (all[ci].value === value) return all[ci].label;
  }
  // 旧品类兼容
  if (value === "jewelry") return "首饰";
  if (value === "accessory") return "其他配饰";
  return value || "未知";
}

// 状态 - items 数组存储所有服装
var state = {
  items: [],  // 首页临时工作区：{ id, imgData, colors, category, group }
  wardrobeItems: [],  // 衣柜持久化存储：已存入衣柜的衣服
  nextId: 1,
  wardrobeNextId: 1,
  gender: "male",
  age: null,
  size: null,
  occasion: null,
  season: null
};
var MAX_COLORS = 8;

/* ===================== 颜色提取 ===================== */

function extractColors(imgEl) {
  var sampleSize = 120;
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d", { willReadFrequently: true });

  var scale = Math.min(sampleSize / imgEl.naturalWidth, sampleSize / imgEl.naturalHeight, 1);
  canvas.width = Math.max(1, Math.round(imgEl.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(imgEl.naturalHeight * scale));
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var data = imageData.data;
  var w = canvas.width;
  var h = canvas.height;

  // ===== 第一步：检测背景色 =====
  // 从图片四个角各取一小块区域的像素，找出最常见的颜色作为背景色
  var cornerSize = Math.max(2, Math.floor(Math.min(w, h) * 0.08));
  var cornerPixels = [];
  function collectCorner(x, y) {
    for (var cy = y; cy < y + cornerSize && cy < h; cy++) {
      for (var cx = x; cx < x + cornerSize && cx < w; cx++) {
        var idx = (cy * w + cx) * 4;
        if (data[idx + 3] > 200) {
          cornerPixels.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }
    }
  }
  collectCorner(0, 0);                  // 左上
  collectCorner(w - cornerSize, 0);     // 右上
  collectCorner(0, h - cornerSize);     // 左下
  collectCorner(w - cornerSize, h - cornerSize); // 右下

  // 对角落像素做颜色量化，找出占比最大的作为背景色
  var cornerBuckets = {};
  for (var cpi = 0; cpi < cornerPixels.length; cpi++) {
    var cpr = cornerPixels[cpi][0] >> 4;
    var cpg = cornerPixels[cpi][1] >> 4;
    var cpb = cornerPixels[cpi][2] >> 4;
    var ckey = cpr * 256 + cpg * 16 + cpb;
    if (!cornerBuckets[ckey]) cornerBuckets[ckey] = { r: 0, g: 0, b: 0, count: 0 };
    cornerBuckets[ckey].r += cornerPixels[cpi][0];
    cornerBuckets[ckey].g += cornerPixels[cpi][1];
    cornerBuckets[ckey].b += cornerPixels[cpi][2];
    cornerBuckets[ckey].count++;
  }

  var bgColor = null;
  var bgMaxCount = 0;
  for (var bkey in cornerBuckets) {
    var cb = cornerBuckets[bkey];
    if (cb.count > bgMaxCount && cb.count > cornerPixels.length * 0.3) {
      bgMaxCount = cb.count;
      bgColor = {
        r: Math.round(cb.r / cb.count),
        g: Math.round(cb.g / cb.count),
        b: Math.round(cb.b / cb.count)
      };
    }
  }

  // 背景色的亮度（用于判断是否为浅色背景）
  var bgL = bgColor ? (Math.max(bgColor.r, bgColor.g, bgColor.b) + Math.min(bgColor.r, bgColor.g, bgColor.b)) / 2 / 255 : 1;

  // ===== 第二步：颜色提取（排除背景 + 排除阴影） =====
  // 量化到 4-bit-per-channel 桶
  var buckets = {};
  var total = 0;

  for (var i = 0; i < data.length; i += 4) {
    var a = data[i + 3];
    if (a < 125) continue; // 跳过透明像素

    var r = data[i];
    var g = data[i + 1];
    var b = data[i + 2];

    var maxC = Math.max(r, g, b);
    var minC = Math.min(r, g, b);
    var lum = (maxC + minC) / 2; // 亮度 0-255

    // 跳过纯黑/纯白
    if (maxC > 250 && minC > 250) continue;
    if (maxC < 8) continue;

    // 跳过与背景色接近的像素
    if (bgColor) {
      var bgDist = Math.sqrt(
        (r - bgColor.r) * (r - bgColor.r) +
        (g - bgColor.g) * (g - bgColor.g) +
        (b - bgColor.b) * (b - bgColor.b)
      );
      // 背景色越浅，容差越大；背景色越深，容差越小
      var bgTolerance = bgL > 0.7 ? 55 : (bgL > 0.4 ? 40 : 30);
      if (bgDist < bgTolerance) continue;
    }

    // 跳过阴影/极暗像素（亮度太低的是褶皱阴影，不是服装本色）
    // 饱和度也很低的暗像素更可能是阴影
    var sat = maxC > 0 ? (maxC - minC) / maxC : 0;
    if (lum < 35 && sat < 0.15) continue; // 很暗且很灰 → 阴影
    if (lum < 20) continue; // 过暗的直接排除

    // 量化
    var rq = (r >> 4) & 0x0f;
    var gq = (g >> 4) & 0x0f;
    var bq = (b >> 4) & 0x0f;
    var key = rq * 256 + gq * 16 + bq;

    if (!buckets[key]) {
      buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
    }
    buckets[key].r += r;
    buckets[key].g += g;
    buckets[key].b += b;
    buckets[key].count++;
    total++;
  }

  if (total === 0) return [];

  var rawColors = [];
  for (var key in buckets) {
    var bk = buckets[key];
    rawColors.push({
      r: Math.round(bk.r / bk.count),
      g: Math.round(bk.g / bk.count),
      b: Math.round(bk.b / bk.count),
      count: bk.count
    });
  }

  rawColors.sort(function (a, b) { return b.count - a.count; });

  // 合并相似颜色
  var merged = [];
  var mergeThreshold = 45; // RGB 距离阈值

  for (var ci = 0; ci < rawColors.length; ci++) {
    var c = rawColors[ci];
    var absorbed = false;
    for (var mi = 0; mi < merged.length; mi++) {
      var m = merged[mi];
      var dist = Math.sqrt(
        (c.r - m.r) * (c.r - m.r) +
        (c.g - m.g) * (c.g - m.g) +
        (c.b - m.b) * (c.b - m.b)
      );
      if (dist < mergeThreshold) {
        var tc = m.count + c.count;
        m.r = Math.round((m.r * m.count + c.r * c.count) / tc);
        m.g = Math.round((m.g * m.count + c.g * c.count) / tc);
        m.b = Math.round((m.b * m.count + c.b * c.count) / tc);
        m.count = tc;
        absorbed = true;
        break;
      }
    }
    if (!absorbed) merged.push({ r: c.r, g: c.g, b: c.b, count: c.count });
    if (merged.length >= MAX_COLORS * 2) break;
  }

  // 计算百分比 & HSL
  merged.sort(function (a, b) { return b.count - a.count; });
  merged = merged.slice(0, MAX_COLORS);

  var result = [];
  for (var ri = 0; ri < merged.length; ri++) {
    var mc = merged[ri];
    var hsl = rgbToHsl(mc.r, mc.g, mc.b);
    result.push({
      r: mc.r,
      g: mc.g,
      b: mc.b,
      h: hsl[0],
      s: hsl[1],
      l: hsl[2],
      hex: rgbToHex(mc.r, mc.g, mc.b),
      pct: (mc.count / total * 100)
    });
  }

  return result;
}

/* ===================== 颜色转换工具 ===================== */

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(function (v) {
    var h = v.toString(16);
    return h.length === 1 ? "0" + h : h;
  }).join("").toUpperCase();
}

/* ===================== 服装搭配 AI 算法（基于色彩科学论文） ===================== */
/* 参考论文：
   - 《适度匹配才最时尚》(PLOS ONE, 2014) — 最优唤醒原则/Wundt 曲线
   - 《服装色彩分析与搭配推荐》(IJERCSE, 2025) — HSV 色彩分析与调和
   - 《服装设计中的色彩对比与调和》(ICEIEIS, 2022) — 色相/明度/纯度对比
   - 《专业造型师的体型穿搭建议》(Fashion Practice, 2021) — 五大体型版型修饰
*/

// ---- 色彩工具函数 ----

function _rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var delta = max - min;
  var h = 0, s = 0, v = max;
  if (delta > 1e-6) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
    h = (h + 360) % 360;
    s = max > 1e-6 ? delta / max : 0;
  }
  return [h, s, v];
}

function _hueToFamily(h) {
  // 色相族划分
  if (h >= 345 || h < 15) return "红";
  if (h >= 15 && h < 45) return "橙";
  if (h >= 45 && h < 75) return "黄";
  if (h >= 75 && h < 165) return "绿";
  if (h >= 165 && h < 195) return "青";
  if (h >= 195 && h < 255) return "蓝";
  if (h >= 255 && h < 285) return "紫";
  return "粉"; // 285-345
}

function _classifyTone(h, s, v) {
  if (s < 0.1) return "中性";
  if (h < 75 || h >= 300) return "暖";
  return "冷";
}

function _classifySaturation(s) {
  if (s >= 0.65) return "高";
  if (s >= 0.35) return "中";
  return "低";
}

function _classifyValue(v) {
  if (v >= 0.7) return "浅";
  if (v >= 0.4) return "中";
  return "深";
}

function _classifySeasonType(h, s, v) {
  var tone = _classifyTone(h, s, v);
  var val = _classifyValue(v);
  var sat = _classifySaturation(s);
  if (tone === "暖") {
    return val === "浅" ? "春" : "秋";
  } else {
    if (val === "浅" && sat === "低") return "夏";
    if (val === "深" && sat === "高") return "冬";
    return val === "浅" ? "夏" : "冬";
  }
}

// 从颜色对象构建完整色彩特征（兼容现有 colors 数组结构）
function buildColorFeature(colorObj) {
  var hsv = _rgbToHsv(colorObj.r, colorObj.g, colorObj.b);
  var h = hsv[0], s = hsv[1], v = hsv[2];
  var isNeutral = s < 0.1;
  var family;
  if (isNeutral) {
    if (v < 0.2) family = "黑";
    else if (v > 0.85) family = "白";
    else if (v > 0.6) family = "米";
    else family = "灰";
  } else {
    family = _hueToFamily(h);
  }
  return {
    h: h, s: s, v: v,
    r: colorObj.r, g: colorObj.g, b: colorObj.b,
    hex: colorObj.hex,
    pct: colorObj.pct || 0,
    hue_family: family,
    tone: isNeutral ? "中性" : _classifyTone(h, s, v),
    saturation_level: isNeutral ? "低" : _classifySaturation(s),
    value_level: _classifyValue(v),
    season_type: isNeutral ? "中性" : _classifySeasonType(h, s, v),
    is_neutral: isNeutral
  };
}

// ---- 色彩搭配评分（核心：适度匹配原则） ----

function _hueDistance(h1, h2) {
  var d = Math.abs(h1 - h2) % 360;
  return Math.min(d, 360 - d);
}

function _harmonyScheme(h1, h2) {
  var d = _hueDistance(h1, h2);
  if (d < 15) return "同色系";
  if (d < 45) return "邻近色";
  if (Math.abs(d - 90) < 15) return "邻近对比";
  if (Math.abs(d - 120) < 15) return "三角色";
  if (Math.abs(d - 180) < 20) return "互补色";
  if (140 < d && d < 170) return "分裂互补";
  return "中差色";
}

function colorHarmonyScore(c1, c2) {
  // 两件服装色彩和谐度评分，返回 {score, scheme, explain}
  // 无彩色（黑白灰米）与任何颜色都容易搭配
  if (c1.is_neutral || c2.is_neutral) {
    if (c1.is_neutral && c2.is_neutral) {
      var vDiff = Math.abs(c1.v - c2.v);
      if (vDiff > 0.4) {
        return { score: 88, scheme: "无彩对比", explain: "黑白灰之间通过明度拉开层次，经典且安全。" };
      }
      return { score: 72, scheme: "无彩统一", explain: "同为无彩色且明度接近，整体统一但略显平淡。" };
    }
    return {
      score: 90, scheme: "无彩衬彩",
      explain: c1.hue_family + "与" + c2.hue_family + "以无彩色作为基底，稳妥且突出重点色。"
    };
  }

  var h1 = c1.h, s1 = c1.s, v1 = c1.v;
  var h2 = c2.h, s2 = c2.s, v2 = c2.v;
  var d = _hueDistance(h1, h2);
  var scheme = _harmonyScheme(h1, h2);

  // 色相分：基于适度匹配原则（Wundt倒U曲线），最优区间30-90度
  var hueScore;
  if (d < 15) hueScore = 55;
  else if (d < 45) hueScore = 78;
  else if (d < 90) hueScore = 92;
  else if (d < 130) hueScore = 80;
  else if (d < 165) hueScore = 72;
  else hueScore = 70;

  // 明度对比分：适度对比最佳
  var vDiff = Math.abs(v1 - v2);
  var valueScore;
  if (vDiff > 0.45) valueScore = 90;
  else if (vDiff > 0.2) valueScore = 80;
  else if (vDiff > 0.1) valueScore = 65;
  else valueScore = 50;

  // 纯度平衡分：一艳一柔最佳
  var satDiff = Math.abs(s1 - s2);
  var satScore;
  if ((s1 > 0.6 && s2 < 0.4) || (s2 > 0.6 && s1 < 0.4)) satScore = 88;
  else if (s1 > 0.6 && s2 > 0.6) satScore = 55;
  else if (s1 < 0.25 && s2 < 0.25) satScore = 60;
  else satScore = 75;

  // 冷暖协调分
  var toneScore = (c1.tone === c2.tone) ? 78 : 70;

  // 综合（色相权重最高）
  var total = hueScore * 0.40 + valueScore * 0.25 + satScore * 0.20 + toneScore * 0.15;

  var explain = c1.hue_family + "(" + c1.tone + c1.value_level + ") 与 " +
    c2.hue_family + "(" + c2.tone + c2.value_level + ") 为「" + scheme + "」，色相差 " +
    Math.round(d) + "°。";
  if (d < 45) explain += "建议通过明度或材质差异增加层次。";
  else if (d > 150) explain += "对比强烈，建议用无彩色或降低一方纯度来缓冲。";
  else explain += "差异适中，符合适度匹配的最优审美区间。";

  return { score: Math.round(total * 10) / 10, scheme: scheme, explain: explain };
}

// 整套搭配的色彩总分
function outfitColorScore(items) {
  if (items.length < 2) return { score: 80, scheme: "单色", explain: "仅一件单品，无搭配冲突。" };

  var pairScores = [];
  var schemes = [];
  var explains = [];

  for (var i = 0; i < items.length; i++) {
    for (var j = i + 1; j < items.length; j++) {
      var ci = items[i]._colorFeat;
      var cj = items[j]._colorFeat;
      if (!ci || !cj) continue;
      var res = colorHarmonyScore(ci, cj);
      pairScores.push(res.score);
      schemes.push(res.scheme);
      explains.push(res.explain);
    }
  }

  if (pairScores.length === 0) return { score: 75, scheme: "未知", explain: "色彩信息不足。" };

  var base = pairScores.reduce(function (a, b) { return a + b; }, 0) / pairScores.length;

  // 整体色彩数量控制
  var families = {};
  for (var k = 0; k < items.length; k++) {
    var cf = items[k]._colorFeat;
    if (cf && !cf.is_neutral) families[cf.hue_family] = true;
  }
  var uniqueCount = Object.keys(families).length;
  var diversityBonus = uniqueCount <= 2 ? 5 : (uniqueCount === 3 ? 0 : -10);
  var total = Math.min(100, base + diversityBonus);

  // 出现最多的方案名
  var schemeCount = {};
  var maxScheme = schemes[0], maxCount = 0;
  for (var s = 0; s < schemes.length; s++) {
    schemeCount[schemes[s]] = (schemeCount[schemes[s]] || 0) + 1;
    if (schemeCount[schemes[s]] > maxCount) {
      maxCount = schemeCount[schemes[s]];
      maxScheme = schemes[s];
    }
  }

  return {
    score: Math.round(total * 10) / 10,
    scheme: maxScheme,
    explain: explains.slice(0, 2).join("；")
  };
}

// ---- 版型/体型评分 ----

var BODY_TYPE_RULES = {
  pear: { goal: "平衡下半身量感，强化上半身", top_fit: ["loose", "regular"], bottom_fit: ["straight", "A-line"], avoid_bottom: ["tight", "flared"] },
  apple: { goal: "弱化腰腹，露出纤细四肢", top_fit: ["regular", "loose"], bottom_fit: ["straight", "slim"], avoid_bottom: [] },
  hourglass: { goal: "突出腰线，保持上下平衡", top_fit: ["fitted", "regular"], bottom_fit: ["fitted", "straight", "A-line"], avoid_bottom: [] },
  rectangle: { goal: "制造曲线，增加腰部收束", top_fit: ["regular"], bottom_fit: ["A-line", "flared"], avoid_bottom: ["straight"] },
  inverted_triangle: { goal: "弱化肩部，增加下半身量感", top_fit: ["regular", "slim"], bottom_fit: ["A-line", "flared", "wide"], avoid_bottom: ["tight"] }
};

function inferBodyType() {
  // 从性别和尺码粗略推断
  var gender = state.gender || "male";
  var size = (state.size || "M").toUpperCase();
  if (gender === "female") {
    if (size === "XS" || size === "S") return "hourglass";
    if (size === "M") return "pear";
    return "apple";
  } else {
    if (size === "XS" || size === "S" || size === "M") return "rectangle";
    return "inverted_triangle";
  }
}

function _getItemFit(item) {
  // 从品类和风格推断版型（简化版：默认regular）
  if (item.fit) return item.fit;
  return "regular";
}

function silhouetteScore(items) {
  var score = 75.0;
  var explainParts = [];
  var bodyType = inferBodyType();
  var rules = BODY_TYPE_RULES[bodyType] || BODY_TYPE_RULES.rectangle;
  explainParts.push("体型判断为「" + bodyType + "」，目标：" + rules.goal + "。");

  // 分离上下装
  var tops = items.filter(function (it) {
    return it.category === "tshirt" || it.category === "shirt" || it.category === "sweater" ||
      it.category === "hoodie" || it.category === "top" || it.category === "blouse";
  });
  var outers = items.filter(function (it) {
    return it.category === "coat" || it.category === "jacket" || it.category === "outerwear" || it.category === "windbreaker";
  });
  var bottoms = items.filter(function (it) {
    return it.category === "jeans" || it.category === "pants" || it.category === "trousers" ||
      it.category === "shorts" || it.category === "bottom" || it.category === "casual_pants" ||
      it.category === "sweatpants";
  });
  var skirts = items.filter(function (it) {
    return it.category === "skirt" || it.category === "dress" || it.category === "long_dress";
  });

  // 比例平衡：上松下紧/上紧下松
  var allTops = tops.concat(outers);
  if (allTops.length > 0 && (bottoms.length > 0 || skirts.length > 0)) {
    var mainTop = allTops[0];
    var mainBottom = bottoms.length > 0 ? bottoms[0] : skirts[0];
    var topFit = _getItemFit(mainTop);
    var bottomFit = _getItemFit(mainBottom);
    if ((topFit === "loose" && bottomFit === "slim") || (topFit === "slim" && bottomFit === "loose")) {
      score += 8;
      explainParts.push("上松下紧/上紧下松，比例平衡良好。");
    } else if (topFit === bottomFit && topFit !== "regular") {
      score -= 6;
      explainParts.push("上下同为紧身或同为宽松，缺乏松紧节奏。");
    } else {
      score += 2;
      explainParts.push("上下版型常规，中规中矩。");
    }
  }

  score = Math.max(0, Math.min(100, score));
  return { score: Math.round(score * 10) / 10, explain: explainParts.join(" ") };
}

// ---- 场合与季节适配 ----

var OCCASION_PROFILE = {
  daily: { formality: 1, name: "日常" },
  work: { formality: 3, name: "工作" },
  business: { formality: 5, name: "商务" },
  date: { formality: 3, name: "约会" },
  party: { formality: 4, name: "派对" },
  travel: { formality: 1, name: "旅游" },
  home: { formality: 1, name: "居家" },
  gathering: { formality: 2, name: "聚会" },
  salon: { formality: 4, name: "沙龙" }
};

var SEASON_PROFILE = {
  spring: { color_families: ["粉", "黄", "绿"], mood: "明亮轻盈" },
  summer: { color_families: ["白", "青", "蓝", "粉"], mood: "清爽透气" },
  autumn: { color_families: ["棕", "橙", "黄", "卡其"], mood: "浓郁温暖" },
  winter: { color_families: ["黑", "灰", "深藏蓝"], mood: "厚重保暖" }
};

function occasionScore(items) {
  var occ = state.occasion || "daily";
  var prof = OCCASION_PROFILE[occ] || OCCASION_PROFILE.daily;
  var score = 75.0;
  var explainParts = [];
  var formality = prof.formality;

  // 正式场合：高饱和彩色过多扣分
  var coloredItems = items.filter(function (it) {
    return it._colorFeat && !it._colorFeat.is_neutral;
  });
  var highSat = coloredItems.filter(function (it) {
    return it._colorFeat.saturation_level === "高";
  });

  if (formality >= 4 && highSat.length >= 2) {
    score -= 10;
    explainParts.push("正式场合高饱和彩色过多，建议降低纯度。");
  } else if (formality <= 2 && highSat.length >= 1) {
    score += 3;
  }

  // 正式场合应有中性色基底
  var neutrals = items.filter(function (it) {
    return it._colorFeat && it._colorFeat.is_neutral;
  });
  if (formality >= 3 && neutrals.length === 0) {
    score -= 6;
    explainParts.push("建议加入黑白灰等中性色作为基底。");
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score: Math.round(score * 10) / 10,
    explain: explainParts.length > 0 ? explainParts.join(" ") : "场合适配良好。"
  };
}

function seasonScore(items) {
  var season = state.season || "spring";
  var prof = SEASON_PROFILE[season] || SEASON_PROFILE.spring;
  var score = 75.0;
  var explainParts = [];

  // 色彩季型匹配
  for (var i = 0; i < items.length; i++) {
    var cf = items[i]._colorFeat;
    if (cf && !cf.is_neutral) {
      var seasonMap = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };
      if (cf.season_type === seasonMap[season]) {
        score += 2;
      } else {
        score -= 1;
      }
    }
  }

  // 冬季应有外套（深色保暖）
  if (season === "winter") {
    var hasOuter = items.some(function (it) {
      return it.category === "coat" || it.category === "jacket" || it.category === "outerwear";
    });
    if (!hasOuter) {
      score -= 8;
      explainParts.push("冬季建议搭配厚外套。");
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score: Math.round(score * 10) / 10,
    explain: explainParts.length > 0 ? explainParts.join(" ") : "符合" + season + "季调性。"
  };
}

// ---- 主流程：组合构建 + 综合评分 + Top-K ----

var ALGO_WEIGHTS = { color: 0.40, silhouette: 0.30, occasion: 0.15, season: 0.15 };

// 将品类映射到算法的 category 类型（top/bottom/outerwear/dress/shoes/bag/accessory）
function mapCategory(cat) {
  var topCats = ["tshirt", "shirt", "sweater", "hoodie", "blouse", "vest", "top"];
  var bottomCats = ["jeans", "pants", "trousers", "casual_pants", "sweatpants", "shorts", "bottom"];
  var outerCats = ["coat", "jacket", "outerwear", "windbreaker", "suit"];
  var dressCats = ["dress", "long_dress", "skirt"];
  var shoeCats = ["sneakers", "casual_shoes", "leather_shoes", "boots", "heels", "sandals", "shoes"];
  var bagCats = ["handbag", "backpack", "shoulder_bag", "tote_bag", "crossbody_bag", "bag"];

  if (topCats.indexOf(cat) >= 0) return "top";
  if (bottomCats.indexOf(cat) >= 0) return "bottom";
  if (outerCats.indexOf(cat) >= 0) return "outerwear";
  if (dressCats.indexOf(cat) >= 0) return "dress";
  if (shoeCats.indexOf(cat) >= 0) return "shoes";
  if (bagCats.indexOf(cat) >= 0) return "bag";
  return "accessory";
}

// 构建所有合法搭配组合
function buildOutfitCombinations(items) {
  var byCat = { top: [], bottom: [], outerwear: [], dress: [], shoes: [], bag: [], accessory: [] };
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var mcat = mapCategory(it.category || "top");
    if (!byCat[mcat]) byCat[mcat] = [];
    byCat[mcat].push(it);
  }

  var outfits = [];

  // 有连衣裙时：连衣裙 + 外套 (+鞋+包)
  if (byCat.dress.length > 0) {
    for (var d = 0; d < byCat.dress.length; d++) {
      var base = [byCat.dress[d]];
      if (byCat.outerwear.length > 0) {
        for (var ow = 0; ow < byCat.outerwear.length; ow++) {
          _addShoesBagOutfit(base.concat([byCat.outerwear[ow]]), byCat, outfits);
        }
      } else {
        _addShoesBagOutfit(base, byCat, outfits);
      }
    }
  }

  // 上衣 + 下装 (+外套) (+鞋+包)
  if (byCat.top.length > 0 && byCat.bottom.length > 0) {
    for (var t = 0; t < byCat.top.length; t++) {
      for (var b = 0; b < byCat.bottom.length; b++) {
        var base2 = [byCat.top[t], byCat.bottom[b]];
        if (byCat.outerwear.length > 0) {
          for (var ow2 = 0; ow2 < byCat.outerwear.length; ow2++) {
            _addShoesBagOutfit(base2.concat([byCat.outerwear[ow2]]), byCat, outfits);
          }
        } else {
          _addShoesBagOutfit(base2, byCat, outfits);
        }
      }
    }
  }

  // 如果类别不全，退化：任意 2-4 件组合（来自不同大类）
  if (outfits.length === 0) {
    var clothingItems = items.filter(function (it) {
      var mc = mapCategory(it.category || "top");
      return mc === "top" || mc === "bottom" || mc === "outerwear" || mc === "dress";
    });
    if (clothingItems.length >= 2) {
      // 简单两两组合
      for (var i = 0; i < clothingItems.length; i++) {
        for (var j = i + 1; j < clothingItems.length; j++) {
          outfits.push([clothingItems[i], clothingItems[j]]);
        }
      }
    } else if (clothingItems.length === 1) {
      outfits.push([clothingItems[0]]);
    }
  }

  return outfits;
}

function _addShoesBagOutfit(base, byCat, outfits) {
  var hasShoes = byCat.shoes && byCat.shoes.length > 0;
  var hasBag = byCat.bag && byCat.bag.length > 0;
  if (hasShoes && hasBag) {
    for (var s = 0; s < byCat.shoes.length; s++) {
      for (var bg = 0; bg < byCat.bag.length; bg++) {
        outfits.push(base.concat([byCat.shoes[s], byCat.bag[bg]]));
      }
    }
  } else if (hasShoes) {
    for (var s2 = 0; s2 < byCat.shoes.length; s2++) {
      outfits.push(base.concat([byCat.shoes[s2]]));
    }
  } else if (hasBag) {
    for (var bg2 = 0; bg2 < byCat.bag.length; bg2++) {
      outfits.push(base.concat([byCat.bag[bg2]]));
    }
  } else {
    outfits.push(base);
  }
}

// 主入口：生成搭配推荐
function coordinateOutfit(items, topK) {
  topK = topK || 6;

  // 为每件衣服构建色彩特征
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.colors && it.colors.length > 0) {
      it._colorFeat = buildColorFeature(it.colors[0]); // 用主色
    } else {
      it._colorFeat = null;
    }
  }

  var validItems = items.filter(function (it) { return it._colorFeat; });
  if (validItems.length === 0) return [];

  // 构建所有合法组合
  var outfits = buildOutfitCombinations(validItems);

  if (outfits.length === 0) return [];

  // 对每套组合打分
  var results = [];
  for (var o = 0; o < outfits.length; o++) {
    var outfit = outfits[o];
    var cRes = outfitColorScore(outfit);
    var sRes = silhouetteScore(outfit);
    var oRes = occasionScore(outfit);
    var seRes = seasonScore(outfit);

    var total = cRes.score * ALGO_WEIGHTS.color +
      sRes.score * ALGO_WEIGHTS.silhouette +
      oRes.score * ALGO_WEIGHTS.occasion +
      seRes.score * ALGO_WEIGHTS.season;

    // 综合建议
    var tipParts = [];
    if (cRes.score < 70) tipParts.push("色彩可优化");
    if (sRes.score < 70) tipParts.push("版型比例可调整");
    var tip = tipParts.length > 0 ? tipParts.join("；") : "整体搭配协调，推荐穿着。";

    results.push({
      items: outfit,
      total_score: Math.round(total * 10) / 10,
      color_score: cRes.score,
      silhouette_score: sRes.score,
      occasion_score: oRes.score,
      season_score: seRes.score,
      color_scheme: cRes.scheme,
      color_explain: cRes.explain,
      silhouette_explain: sRes.explain,
      occasion_explain: oRes.explain,
      season_explain: seRes.explain,
      tip: tip
    });
  }

  // 按总分降序
  results.sort(function (a, b) { return b.total_score - a.total_score; });

  // 品类去重：相同品类组合只保留最高分
  var seenPatterns = {};
  var deduped = [];
  for (var r = 0; r < results.length; r++) {
    var pattern = results[r].items.map(function (it) {
      return mapCategory(it.category || "top");
    }).sort().join("|");
    if (!seenPatterns[pattern]) {
      seenPatterns[pattern] = true;
      deduped.push(results[r]);
    }
  }

  // 多样性选择：贪心，优先选和已选重叠最少的高分方案
  var finalResults = [];
  if (deduped.length > 0) {
    finalResults.push(deduped[0]);
    var selectedIds = {};
    deduped[0].items.forEach(function (it) { selectedIds[it.id] = true; });

    while (finalResults.length < topK && finalResults.length < deduped.length) {
      var bestCand = null;
      var bestDivScore = -Infinity;

      for (var ci = 0; ci < deduped.length; ci++) {
        var cand = deduped[ci];
        // 检查是否已在结果中
        var alreadyIn = false;
        for (var ri = 0; ri < finalResults.length; ri++) {
          var rIds = finalResults[ri].items.map(function (it) { return it.id; }).sort().join(",");
          var cIds = cand.items.map(function (it) { return it.id; }).sort().join(",");
          if (rIds === cIds) { alreadyIn = true; break; }
        }
        if (alreadyIn) continue;

        // 重叠度
        var overlap = 0;
        for (var oi = 0; oi < cand.items.length; oi++) {
          if (selectedIds[cand.items[oi].id]) overlap++;
        }
        var divScore = cand.total_score - overlap * 15;

        if (divScore > bestDivScore) {
          bestDivScore = divScore;
          bestCand = cand;
        }
      }

      if (!bestCand) break;
      finalResults.push(bestCand);
      bestCand.items.forEach(function (it) { selectedIds[it.id] = true; });
    }

    finalResults.sort(function (a, b) { return b.total_score - a.total_score; });
  }

  return finalResults;
}

/* ===================== 图像识别 API 接入 ===================== */
/* BUILD_MARKER_V20261004_FETCH */

var apiConfig = {
  provider: "custom",
  custom: { endpoint: "", apiKey: "", model: "", visionModel: "", format: "openai", prompt: "" }
};

// 当前用于图片识别的模型名：优先视觉模型，未配则回退到文本模型
function getVisionModelName() {
  return apiConfig.custom.visionModel || apiConfig.custom.model || "";
}
// 当前用于文字对话/搭配推荐的模型名
function getTextModelName() {
  return apiConfig.custom.model || apiConfig.custom.visionModel || "";
}

// 从 URL 参数加载配置（支持 ?endpoint=xxx&model=xxx&apikey=xxx&format=xxx&prompt=xxx）
function loadConfigFromUrl() {
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("endpoint")) apiConfig.custom.endpoint = params.get("endpoint");
    if (params.get("apikey")) apiConfig.custom.apiKey = params.get("apikey");
    if (params.get("model")) apiConfig.custom.model = params.get("model");
    if (params.get("visionModel")) apiConfig.custom.visionModel = params.get("visionModel");
    if (params.get("format")) apiConfig.custom.format = params.get("format");
    if (params.get("prompt")) apiConfig.custom.prompt = params.get("prompt");
  } catch (e) { /* ignore */ }
}

// 从 localStorage 加载配置
function loadApiConfig() {
  try {
    var saved = localStorage.getItem("clothing_api_config");
    if (saved) {
      var cfg = JSON.parse(saved);
      if (cfg.custom) {
        apiConfig.custom.endpoint = cfg.custom.endpoint || "";
        apiConfig.custom.apiKey = cfg.custom.apiKey || "";
        apiConfig.custom.model = cfg.custom.model || "";
        apiConfig.custom.visionModel = cfg.custom.visionModel || "";
        apiConfig.custom.format = cfg.custom.format || "openai";
        apiConfig.custom.prompt = cfg.custom.prompt || "";
      }
    }
  } catch (e) { /* ignore */ }
  // URL 参数优先级更高
  loadConfigFromUrl();
}

function saveApiConfig() {
  try {
    localStorage.setItem("clothing_api_config", JSON.stringify({
      custom: {
        endpoint: apiConfig.custom.endpoint,
        apiKey: apiConfig.custom.apiKey,
        model: apiConfig.custom.model,
        visionModel: apiConfig.custom.visionModel,
        format: apiConfig.custom.format,
        prompt: apiConfig.custom.prompt
      }
    }));
  } catch (e) { /* ignore */ }
}

// ===== 图像识别系统提示词 =====

var SYSTEM_PROMPT = `识别服装图片，返回JSON。

category: top上衣, shirt衬衫, tshirt T恤, sweater毛衣, hoodie卫衣, coat外套, jacket夹克, suit西装, pants长裤, shorts短裤, jeans牛仔裤, dress连衣裙, skirt半身裙, shoes皮鞋, sneakers运动鞋, boots靴子, sandals凉鞋, heels高跟鞋, canvas帆布鞋, slippers拖鞋, bag包包, backpack双肩包, crossbody斜挎包, clutch手拿包, wallet钱包, hat帽子, cap棒球帽, bucket渔夫帽, beret贝雷帽, beanie针织帽, scarf围巾, silkscarf丝巾, tie领带, earrings耳环, necklace项链, ring戒指, bracelet手链, bangle手镯, brooch胸针, belt腰带, watch手表, sunglasses太阳镜, hairacc发饰
categoryName: 具体名称
categoryGroup: clothing/accessory
pattern: 纯色/条纹/格纹/碎花/印花/波点/字母/几何/肌理
mainColor: 主色
style: 休闲/商务/运动/甜美/街头/通勤/复古/学院/极简/工装
season: 春/夏/秋/冬/四季
confidence: 0-100`;

// 解析模型返回结果
function parseRecognitionResult(content) {
  var result = {
    category: null,
    categoryName: null,
    categoryGroup: "clothing",
    pattern: null,
    mainColor: null,
    style: null,
    season: null,
    confidence: 0,
    imageType: null,
    fromApi: true,
    provider: "custom"
  };

  // 尝试提取 JSON（可能被 ```json ``` 包裹）
  var jsonStr = content;
  var jsonMatch = content.match(/```[\s]*json[\s]*([\s\S]*?)```/i);
  if (jsonMatch) jsonStr = jsonMatch[1];

  // 尝试直接 JSON 解析
  var data = null;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    // 尝试从文本中提取 JSON 对象
    var objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { data = JSON.parse(objMatch[0]); } catch (e2) { return null; }
    }
    if (!data) return null;
  }

  if (data.category) result.category = data.category;
  if (data.categoryName) result.categoryName = data.categoryName;
  if (data.categoryGroup) result.categoryGroup = data.categoryGroup;
  if (data.pattern) result.pattern = data.pattern;
  if (data.mainColor) result.mainColor = data.mainColor;
  if (data.style) result.style = data.style;
  if (data.season) result.season = data.season;
  if (data.zone) result.zone = data.zone;
  if (data.confidence) result.confidence = Number(data.confidence) || 70;
  if (data.imageType) result.imageType = data.imageType;

  return result;
}

// 识别入口（调用本地模型接口）
function recognizeClothing(imgDataUrl, zones, callback) {
  if (!apiConfig.custom.endpoint) {
    callback(null, null);
    return;
  }
  recognizeCustom(imgDataUrl, zones, function (err, result) {
    if (err) {
      console.warn("模型识别失败，降级到手动模式:", err);
      callback(null, null);
    } else {
      callback(null, result);
    }
  });
}

// 压缩图片，降低视觉模型的 token 占用
function compressImageForVision(imgDataUrl, maxSize, quality, callback) {
  var img = new Image();
  img.onload = function () {
    var w = img.width;
    var h = img.height;
    if (w <= maxSize && h <= maxSize) {
      callback(null, imgDataUrl);
      return;
    }
    var ratio = Math.min(maxSize / w, maxSize / h);
    var newW = Math.round(w * ratio);
    var newH = Math.round(h * ratio);
    var canvas = document.createElement("canvas");
    canvas.width = newW;
    canvas.height = newH;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, newW, newH);
    try {
      var dataUrl = canvas.toDataURL("image/jpeg", quality || 0.8);
      callback(null, dataUrl);
    } catch (e) {
      callback(e, imgDataUrl);
    }
  };
  img.onerror = function () { callback(new Error("图片加载失败"), imgDataUrl); };
  img.src = imgDataUrl;
}

// ===== 本地模型接口 =====
function recognizeCustom(imgDataUrl, zones, callback) {
  if (!apiConfig.custom.endpoint) {
    callback("未配置自定义模型接口地址", null);
    return;
  }

  // 先压缩图片再发送（减少视觉模型 token 占用）
  compressImageForVision(imgDataUrl, 384, 0.75, function (compressErr, compressedDataUrl) {
    doRecognize(compressedDataUrl || imgDataUrl);
  });

  function doRecognize(finalImgDataUrl) {
  var model = getVisionModelName() || "default";
  var systemPrompt = apiConfig.custom.prompt || SYSTEM_PROMPT;
  var userPrompt = "可用分区：" + zones.join("、") + "\n请直接输出 JSON，不要 markdown 格式。";
  var format = apiConfig.custom.format || "openai";

  // 自动检测：如果 endpoint 是 /api/chat 且没有显式设置 format，按 ollama 处理
  if (!apiConfig.custom.format && apiConfig.custom.endpoint && apiConfig.custom.endpoint.indexOf("/api/chat") >= 0) {
    format = "ollama";
  }

  var imgBase64 = finalImgDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");

  if (format === "ollama") {
    // Ollama 原生格式
    var body = JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt, images: [imgBase64] }
      ],
      stream: false,
      options: { temperature: 0.1, num_predict: 1024, num_ctx: 8192 }
    });

    fetch(apiConfig.custom.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body
    })
    .then(function (resp) {
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return resp.json();
    })
    .then(function (data) {
      var content = data.message && data.message.content ? data.message.content : "";
      if (!content) { callback("自定义模型返回内容为空", null); return; }
      var result = parseRecognitionResult(content);
      if (result) {
        result.provider = "ollama";
        result.fromApi = true;
        callback(null, result);
      } else {
        callback("自定义模型返回结果解析失败: " + content.substring(0, 100), null);
      }
    })
    .catch(function (err) {
      callback("自定义模型请求失败：" + err.message, null);
    });
    return;
  }

  // OpenAI 兼容格式
  var messages = [{
    role: "user",
    content: [
      { type: "text", text: systemPrompt + "\n\n" + userPrompt },
      { type: "image_url", image_url: { url: finalImgDataUrl } }
    ]
  }];

  var xhr = new XMLHttpRequest();
  xhr.open("POST", apiConfig.custom.endpoint, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  if (apiConfig.custom.apiKey) {
    xhr.setRequestHeader("Authorization", "Bearer " + apiConfig.custom.apiKey);
  }
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          var content = "";
          if (resp.choices && resp.choices[0]) {
            content = resp.choices[0].message ? resp.choices[0].message.content : (resp.choices[0].text || "");
          } else if (resp.output) {
            content = resp.output.text || resp.output.choices[0].message.content || "";
          } else if (resp.response) {
            content = typeof resp.response === "string" ? resp.response : JSON.stringify(resp.response);
          }
          if (!content) { callback("自定义模型返回内容为空", null); return; }
          var result = parseRecognitionResult(content);
          if (result) {
            result.provider = "custom";
            result.fromApi = true;
            callback(null, result);
          } else {
            callback("自定义模型返回结果解析失败: " + content.substring(0, 100), null);
          }
        } catch (e) {
          callback("自定义模型响应解析失败: " + e.message, null);
        }
      } else {
        callback("自定义模型请求失败 (HTTP " + xhr.status + ")：" + (xhr.responseText || ""), null);
      }
    }
  };
  xhr.onerror = function () { callback("网络请求失败，请确认模型服务正在运行", null); };
  xhr.send(JSON.stringify({
    model: model,
    messages: messages,
    max_tokens: 1024,
    temperature: 0.1,
    num_ctx: 8192
  }));
  }
}

/* ===================== 花纹分析 & 趋势筛选 ===================== */

// 分析图片中的花纹特征（基于颜色分布推断）
function analyzePattern(imgEl, colors) {
  var canvas = document.createElement("canvas");
  var maxSize = 100;
  var w = imgEl.naturalWidth || imgEl.width;
  var h = imgEl.naturalHeight || imgEl.height;
  var scale = Math.min(maxSize / w, maxSize / h, 1);
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);
  var ctx = canvas.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

  var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var data = imgData.data;
  var pixelCount = data.length / 4;

  // 计算颜色变化频率（相邻像素颜色差异次数）
  var changeCount = 0;
  var totalDiff = 0;
  var hueChangeCount = 0;

  for (var y = 0; y < canvas.height; y++) {
    for (var x = 1; x < canvas.width; x++) {
      var idx1 = (y * canvas.width + x - 1) * 4;
      var idx2 = (y * canvas.width + x) * 4;

      var r1 = data[idx1], g1 = data[idx1 + 1], b1 = data[idx1 + 2];
      var r2 = data[idx2], g2 = data[idx2 + 1], b2 = data[idx2 + 2];

      var diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (diff > 50) {
        changeCount++;
        totalDiff += diff;
      }

      var hsl1 = rgbToHsl(r1, g1, b1);
      var hsl2 = rgbToHsl(r2, g2, b2);
      if (hsl1.s > 15 && hsl2.s > 15 && Math.abs(hsl1.h - hsl2.h) > 30) {
        hueChangeCount++;
      }
    }
  }

  var changeRate = changeCount / (canvas.width * canvas.height);
  var avgChange = changeCount > 0 ? totalDiff / changeCount : 0;

  // 推断花纹类型
  var patternType = "纯色";
  var complexity = 0; // 0=纯色, 1=简单, 2=中等, 3=复杂

  if (changeRate < 0.03) {
    patternType = "纯色";
    complexity = 0;
  } else if (changeRate < 0.08) {
    // 低变化率 - 可能是细条纹、小波点
    if (hueChangeCount < changeCount * 0.2) {
      patternType = "细条纹";
      complexity = 1;
    } else {
      patternType = "小波点";
      complexity = 1;
    }
  } else if (changeRate < 0.15) {
    // 中等变化率 - 格纹、碎花
    if (hueChangeCount > changeCount * 0.4) {
      patternType = "小碎花";
      complexity = 2;
    } else {
      patternType = "格纹";
      complexity = 2;
    }
  } else if (changeRate < 0.25) {
    // 较高变化率 - 大花纹、抽象图案
    if (hueChangeCount > changeCount * 0.5) {
      patternType = "花卉印花";
      complexity = 3;
    } else {
      patternType = "大格纹";
      complexity = 2;
    }
  } else {
    // 高变化率 - 复杂图案
    if (avgChange > 150) {
      patternType = "复杂印花";
      complexity = 3;
    } else {
      patternType = "肌理纹理";
      complexity = 2;
    }
  }

  // 色彩丰富度
  var colorRichness = colors.length;

  return {
    type: patternType,
    complexity: complexity,
    changeRate: changeRate,
    colorRichness: colorRichness,
    hueVariety: hueChangeCount / Math.max(changeCount, 1)
  };
}

// 计算单品的2027春夏趋势匹配度
function calculateItemTrendScore(colors, patternInfo) {
  if (!colors || colors.length === 0) return 0;

  var score = 30; // 基础分

  // 颜色趋势匹配（检查主色是否在2027春夏流行色系中）
  var trendColorCount = 0;
  var totalWeight = 0;
  for (var i = 0; i < colors.length; i++) {
    var col = colors[i];
    var weight = col.weight || (1 / colors.length);
    totalWeight += weight;

    var isTrendColor = false;
    var trendHues = [
      // 2027春夏核心流行色色相范围
      { min: 200, max: 240, label: "蓝色系" },    // 流光蓝/宝蓝
      { min: 20, max: 50, label: "大地色系" },    // 陶土/焦糖
      { min: 90, max: 140, label: "绿色系" },     // 草甸绿/牛油果绿
      { min: 340, max: 360, label: "红色系" },    // 波普粉/活力橙
      { min: 0, max: 20, label: "红色系" },
      { min: 270, max: 310, label: "紫色系" },     // 薰衣草紫
      { min: 45, max: 70, label: "黄色系" }        // 奶油黄/开心果黄
    ];

    for (var t = 0; t < trendHues.length; t++) {
      if (col.s > 10 && col.h >= trendHues[t].min && col.h <= trendHues[t].max) {
        isTrendColor = true;
        break;
      }
    }

    // 中性色（黑白灰米）也加分
    if (isNeutral(col)) isTrendColor = true;

    if (isTrendColor) {
      trendColorCount += weight;
    }
  }

  var trendColorRatio = totalWeight > 0 ? trendColorCount / totalWeight : 0;
  if (trendColorRatio >= 0.8) score += 35;
  else if (trendColorRatio >= 0.6) score += 25;
  else if (trendColorRatio >= 0.4) score += 15;
  else if (trendColorRatio >= 0.2) score += 5;

  // 饱和度趋势（2027春夏偏好中低饱和的疗愈感）
  var avgSat = 0;
  var nonNeutralCount = 0;
  for (var s = 0; s < colors.length; s++) {
    if (!isNeutral(colors[s])) {
      avgSat += colors[s].s;
      nonNeutralCount++;
    }
  }
  if (nonNeutralCount > 0) avgSat = avgSat / nonNeutralCount;

  if (avgSat > 0 && avgSat < 50) score += 15; // 低饱和加分
  else if (avgSat >= 50 && avgSat < 70) score += 8;
  else if (avgSat >= 80) score -= 5; // 高饱和略减分

  // 明度趋势（春夏偏好中高明度）
  var avgLight = 0;
  for (var l = 0; l < colors.length; l++) {
    avgLight += colors[l].l;
  }
  avgLight = avgLight / colors.length;
  if (avgLight > 50 && avgLight < 75) score += 8;
  else if (avgLight >= 75) score += 5;

  // 花纹趋势匹配
  if (patternInfo) {
    var trendPatterns = ["花卉印花", "格纹", "大格纹", "小碎花", "细条纹"];
    if (trendPatterns.indexOf(patternInfo.type) >= 0) score += 10;
    if (patternInfo.complexity >= 2) score += 3; // 有花纹的加分
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ===================== 颜色词库 & 智能命名 ===================== */

// 2027春夏流行关键色（WGSN × Coloro × Pantone）
var TREND_COLORS_2027SS = [
  { name: "流光蓝", h: 225, s: 55, l: 38 },   // WGSN 2027年度色 Luminous Blue PANTONE 19-3952
  { name: "活力橙", h: 25,  s: 85, l: 48 },   // Energy Orange PANTONE 16-1362
  { name: "波普粉", h: 340, s: 70, l: 62 },    // Pop Pink PANTONE 14-2311
  { name: "草甸绿", h: 110, s: 55, l: 35 },    // Meadowland Green PANTONE 16-0543
  { name: "陶土色", h: 22,  s: 60, l: 48 },    // Clay PANTONE 16-1511
  { name: "椰奶白", h: 45,  s: 20, l: 88 },    // Coconut Milk PANTONE 11-0608
  { name: "琥珀金", h: 38,  s: 70, l: 50 },    // Amber Gold PANTONE 16-1139
  { name: "鳄鱼棕", h: 25,  s: 40, l: 28 },    // Crocodile PANTONE 19-0823
  { name: "褪色粉", h: 350, s: 40, l: 65 },    // Faded Pink 巴黎秀场
  { name: "开心果绿", h: 95,  s: 45, l: 65 },  // Pistachio 米兰秀场
  { name: "奶油黄", h: 55,  s: 40, l: 82 }     // 奶油黄 柔粉+奶油黄趋势
];

// 中文颜色词库：按色系组织，每个词有参考 HSL 值
var COLOR_DICTIONARY = [
  // === 2027春夏流行色（优先匹配） ===
  { name: "流光蓝", h: 225, s: 55, l: 38 },
  { name: "活力橙", h: 25,  s: 85, l: 48 },
  { name: "波普粉", h: 340, s: 70, l: 62 },
  { name: "草甸绿", h: 110, s: 55, l: 35 },
  { name: "陶土色", h: 22,  s: 60, l: 48 },
  { name: "椰奶白", h: 45,  s: 20, l: 88 },
  { name: "琥珀金", h: 38,  s: 70, l: 50 },
  { name: "褪色粉", h: 350, s: 40, l: 65 },
  { name: "开心果绿", h: 95,  s: 45, l: 65 },
  { name: "奶油黄", h: 55,  s: 40, l: 82 },

  // === 红色系 ===
  { name: "正红", h: 0,   s: 90, l: 50 },
  { name: "樱桃红", h: 350, s: 85, l: 45 },
  { name: "枣红", h: 355, s: 70, l: 30 },
  { name: "酒红", h: 350, s: 60, l: 25 },
  { name: "玫红", h: 330, s: 80, l: 55 },
  { name: "西瓜红", h: 355, s: 75, l: 55 },
  { name: "珊瑚红", h: 10,  s: 70, l: 60 },
  { name: "砖红", h: 15,  s: 65, l: 40 },
  { name: "豆沙红", h: 350, s: 45, l: 50 },
  { name: "姨妈红", h: 355, s: 75, l: 35 },
  { name: "番茄红", h: 5,   s: 85, l: 50 },

  // === 橙色系 ===
  { name: "橙色", h: 30,  s: 95, l: 50 },
  { name: "南瓜橙", h: 25,  s: 90, l: 45 },
  { name: "焦糖色", h: 25,  s: 70, l: 35 },
  { name: "柿子橙", h: 20,  s: 85, l: 50 },
  { name: "杏色", h: 35,  s: 50, l: 70 },
  { name: "脏橘色", h: 20,  s: 60, l: 45 },
  { name: "爱马仕橙", h: 28,  s: 85, l: 48 },

  // === 黄色系 ===
  { name: "正黄", h: 55,  s: 95, l: 50 },
  { name: "柠檬黄", h: 55,  s: 90, l: 60 },
  { name: "鹅黄", h: 50,  s: 60, l: 75 },
  { name: "芒果黄", h: 45,  s: 85, l: 55 },
  { name: "日落黄", h: 40,  s: 80, l: 55 },
  { name: "咖喱黄", h: 45,  s: 70, l: 45 },
  { name: "土黄", h: 40,  s: 50, l: 45 },
  { name: "芥末黄", h: 50,  s: 70, l: 45 },
  { name: "鹅黄色", h: 48,  s: 55, l: 72 },
  { name: "玉米黄", h: 48,  s: 75, l: 58 },
  { name: "香槟色", h: 45,  s: 30, l: 75 },

  // === 绿色系 ===
  { name: "正绿", h: 125, s: 90, l: 38 },
  { name: "草绿", h: 130, s: 70, l: 45 },
  { name: "牛油果绿", h: 95,  s: 55, l: 45 },
  { name: "薄荷绿", h: 150, s: 55, l: 70 },
  { name: "豆绿", h: 120, s: 45, l: 60 },
  { name: "墨绿", h: 140, s: 70, l: 20 },
  { name: "森林绿", h: 130, s: 65, l: 25 },
  { name: "橄榄绿", h: 90,  s: 50, l: 35 },
  { name: "军绿", h: 85,  s: 45, l: 30 },
  { name: "抹茶绿", h: 100, s: 50, l: 50 },
  { name: "青柠绿", h: 80,  s: 75, l: 45 },
  { name: "苹果绿", h: 100, s: 65, l: 50 },
  { name: "草木绿", h: 110, s: 60, l: 42 },
  { name: "薄荷青", h: 165, s: 55, l: 65 },
  { name: "湖水绿", h: 170, s: 50, l: 55 },

  // === 青色系 ===
  { name: "青色", h: 180, s: 80, l: 45 },
  { name: "蒂芙尼蓝", h: 175, s: 60, l: 65 },
  { name: "孔雀蓝", h: 195, s: 80, l: 38 },

  // === 蓝色系 ===
  { name: "正蓝", h: 220, s: 90, l: 45 },
  { name: "天蓝", h: 200, s: 75, l: 70 },
  { name: "雾霾蓝", h: 210, s: 30, l: 55 },
  { name: "藏蓝", h: 225, s: 70, l: 20 },
  { name: "海军蓝", h: 220, s: 65, l: 25 },
  { name: "宝蓝", h: 225, s: 85, l: 40 },
  { name: "牛仔蓝", h: 210, s: 50, l: 45 },
  { name: "婴儿蓝", h: 200, s: 50, l: 80 },
  { name: "宝石蓝", h: 215, s: 80, l: 42 },

  // === 紫色系 ===
  { name: "正紫", h: 270, s: 80, l: 45 },
  { name: "薰衣草紫", h: 270, s: 55, l: 70 },
  { name: "葡萄紫", h: 280, s: 65, l: 30 },
  { name: "藕荷色", h: 275, s: 35, l: 70 },
  { name: "香芋紫", h: 275, s: 50, l: 65 },
  { name: "紫罗兰", h: 265, s: 70, l: 40 },
  { name: "梅子色", h: 300, s: 50, l: 35 },

  // === 粉色系 ===
  { name: "粉色", h: 340, s: 70, l: 70 },
  { name: "樱花粉", h: 340, s: 60, l: 80 },
  { name: "蜜桃粉", h: 20,  s: 65, l: 75 },
  { name: "豆沙粉", h: 350, s: 40, l: 65 },
  { name: "裸粉", h: 20,  s: 40, l: 75 },
  { name: "玫粉", h: 330, s: 70, l: 65 },
  { name: "芭比粉", h: 330, s: 85, l: 60 },
  { name: "干枯玫瑰粉", h: 350, s: 35, l: 58 }
];

// 大地色系 / 中性色系词库（低饱和时使用）
var EARTH_TONES = [
  { name: "卡其色", h: 40,  s: 40, l: 55 },
  { name: "驼色", h: 35,  s: 55, l: 50 },
  { name: "米色", h: 45,  s: 30, l: 75 },
  { name: "咖啡色", h: 25,  s: 50, l: 30 },
  { name: "棕色", h: 25,  s: 55, l: 38 },
  { name: "巧克力色", h: 15,  s: 50, l: 22 },
  { name: "奶茶色", h: 30,  s: 35, l: 65 },
  { name: "燕麦色", h: 40,  s: 25, l: 72 },
  { name: "卡其棕", h: 30,  s: 45, l: 42 },
  { name: "灰褐色", h: 30,  s: 20, l: 40 },
  { name: "摩卡色", h: 20,  s: 40, l: 35 },
  { name: "焦糖棕", h: 28,  s: 60, l: 38 },
  { name: "卡其绿", h: 70,  s: 30, l: 45 },
  { name: "灰绿色", h: 120, s: 20, l: 50 },
  { name: "灰蓝色", h: 210, s: 20, l: 50 },
  { name: "灰紫色", h: 270, s: 20, l: 50 },
  { name: "藕粉色", h: 350, s: 25, l: 70 },
  { name: "奶茶棕", h: 30,  s: 30, l: 50 }
];

function hueDistance(h1, h2) {
  var d = Math.abs(h1 - h2);
  return d > 180 ? 360 - d : d;
}

// 计算 HSL 空间中的颜色距离（加权）
function colorDistance(col, dict) {
  var hd = hueDistance(col.h, dict.h) / 180; // 归一化 0~1
  var sd = Math.abs(col.s - dict.s) / 100;   // 归一化 0~1
  var ld = Math.abs(col.l - dict.l) / 100;   // 归一化 0~1
  // 色相权重最高，其次是饱和度，再次是明度
  return hd * 0.55 + sd * 0.25 + ld * 0.20;
}

// 智能颜色命名：从词库中找到最接近的颜色
function findClosestColor(col, dictionary) {
  var bestName = "";
  var bestDist = Infinity;

  for (var i = 0; i < dictionary.length; i++) {
    var d = dictionary[i];
    var dist = colorDistance(col, d);
    if (dist < bestDist) {
      bestDist = dist;
      bestName = d.name;
    }
  }

  return { name: bestName, dist: bestDist };
}

// 颜色命名主函数
function colorName(col) {
  // 极端明度
  if (col.l < 6) return "黑色";
  if (col.l > 94) return "白色";

  // 判断是否为无彩色/低饱和
  if (isNeutral(col)) {
    // 灰度系列
    if (col.s < 8) {
      if (col.l < 15) return "炭灰色";
      if (col.l < 28) return "深灰色";
      if (col.l < 48) return "灰色";
      if (col.l < 65) return "浅灰色";
      if (col.l < 82) return "银灰色";
      return "米白色";
    }

    // 低饱和偏色 → 大地色系
    if (col.s < 22) {
      var earthMatch = findClosestColor(col, EARTH_TONES);
      if (earthMatch.dist < 0.35) return earthMatch.name;
    }

    // 中等偏低饱和 + 中等明度 → 也尝试大地色
    if (col.s < 35 && col.l > 25 && col.l < 75) {
      var earthMatch2 = findClosestColor(col, EARTH_TONES);
      if (earthMatch2.dist < 0.28) return earthMatch2.name;
    }

    // 否则降级为普通灰调描述
    if (col.l < 30) return "深灰色";
    if (col.l < 60) return "灰调";
    return "浅灰色调";
  }

  // 有彩色 → 从主词库匹配
  var match = findClosestColor(col, COLOR_DICTIONARY);
  var result = match.name;

  // 特别亮的彩色
  if (col.l > 82) {
    if (result.indexOf("浅") === -1 && result.indexOf("淡") === -1 && result.indexOf("婴儿") === -1) {
      result = "淡" + result;
    }
  }
  // 特别暗的彩色
  else if (col.l < 22) {
    if (result.indexOf("墨") === -1 && result.indexOf("深") === -1 && result.indexOf("藏") === -1 && result.indexOf("酒") === -1 && result.indexOf("枣") === -1) {
      result = "深" + result;
    }
  }

  return result;
}

// 简化色相名（用于色环中心标签等场景）
function hueName(h) {
  if (h < 15 || h >= 345) return "红色";
  if (h < 40) return "红橙色";
  if (h < 65) return "橙色";
  if (h < 90) return "黄色";
  if (h < 120) return "黄绿色";
  if (h < 155) return "绿色";
  if (h < 185) return "青色";
  if (h < 220) return "蓝色";
  if (h < 260) return "蓝紫色";
  if (h < 300) return "紫色";
  return "紫红色";
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* ===================== 搭配组合生成 ===================== */

function isNeutral(col) {
  return col.s < 18 || col.l < 10 || col.l > 92;
}

function isMuted(col) {
  return col.s < 40;
}

function isDark(col) {
  return col.l < 35;
}

function isLight(col) {
  return col.l > 65;
}

function getContrast(c1, c2) {
  var l1 = c1.l / 100;
  var l2 = c2.l / 100;
  var L1 = l1 > 0.03928 ? Math.pow((l1 + 0.055) / 1.055, 2.4) : l1 / 12.92;
  var L2 = l2 > 0.03928 ? Math.pow((l2 + 0.055) / 1.055, 2.4) : l2 / 12.92;
  var bright = Math.max(L1, L2);
  var dark = Math.min(L1, L2);
  return (bright + 0.05) / (dark + 0.05);
}

// 判断颜色是否接近2027春夏流行色
function isTrendColor(col) {
  var threshold = 0.18;
  for (var i = 0; i < TREND_COLORS_2027SS.length; i++) {
    if (colorDistance(col, TREND_COLORS_2027SS[i]) < threshold) {
      return true;
    }
  }
  return false;
}

// 获取最接近的趋势色名
function getTrendColorName(col) {
  var best = findClosestColor(col, TREND_COLORS_2027SS);
  if (best.dist < 0.18) return best.name;
  return null;
}

// 判断颜色是否属于男装偏好色系（绿色系、大地色系、低饱和暖棕）
function isMalePreferredColor(col) {
  // 绿色系（h:75~175）：薄荷绿、开心果绿、橄榄绿、草甸绿、森林绿
  if (col.h > 75 && col.h < 175) return true;
  // 大地色系（h:15~50，中低饱和，中低明度）：陶土、棕色、卡其、驼色
  if (col.h > 15 && col.h < 50 && col.s < 70 && col.l < 60) return true;
  // 深藏蓝/海军蓝
  if (col.h > 200 && col.h < 240 && col.l < 35 && col.s > 40) return true;
  // 橄榄绿调（偏黄绿低饱和）
  if (col.h > 60 && col.h < 90 && col.s < 55 && col.l < 45) return true;
  return false;
}

// 判断颜色是否属于女装偏好色系（粉色系、柔彩色系、低饱和马卡龙）
function isFemalePreferredColor(col) {
  // 粉色系（h:320~360 和 0~20 的粉/红粉色）
  if (col.h > 320 || col.h < 15) {
    if (col.s < 85 && col.l > 55) return true; // 不是特别深特别艳的红
  }
  // 紫色系/薰衣草色（h:260~310）
  if (col.h > 260 && col.h < 310 && col.s < 70) return true;
  // 柔彩马卡龙（高明度低饱和的彩色）
  if (col.l > 65 && col.s < 60 && col.s > 15) return true;
  // 冰蓝色/清透蓝（h:190~220，高明度中低饱和）
  if (col.h > 190 && col.h < 230 && col.l > 55 && col.s < 60) return true;
  // 薄荷绿/果冻薄荷（h:150~180，高明度中低饱和）
  if (col.h > 145 && col.h < 180 && col.l > 55 && col.s < 65) return true;
  // 奶油黄/疗愈黄（h:45~70，高明度低饱和）
  if (col.h > 45 && col.h < 70 && col.l > 70 && col.s < 50) return true;
  return false;
}

// ===== 年龄段色彩偏好 =====

// 学生（14-16岁）偏好色：柔雾色、校园清新色、复古学院风 + 亮色点缀
function isStudentPreferredColor(col) {
  // 柔雾色系（雾紫、桃雾粉、薄荷绿、海盐蓝、燕麦棕）—— 高明度低饱和
  if (col.l > 55 && col.s < 55 && col.s > 12) {
    if (col.h > 260 && col.h < 310) return true; // 雾紫
    if (col.h > 310 && col.h < 360) return true; // 桃雾粉
    if (col.h > 145 && col.h < 180) return true; // 薄荷绿
    if (col.h > 190 && col.h < 225) return true; // 海盐蓝
  }
  // 燕麦棕/暖棕（h:20~45，中低饱和，中高明度）
  if (col.h > 20 && col.h < 45 && col.s < 45 && col.l > 55 && col.l < 75) return true;
  // 学院风经典色：海军蓝
  if (col.h > 210 && col.h < 240 && col.l < 35 && col.s > 50) return true;
  // 活力亮色点缀（高饱和亮色，学生喜欢）
  if (col.s > 70 && col.l > 45 && col.l < 65) {
    if (col.h > 15 && col.h < 45) return true;  // 活力橙/黄
    if (col.h > 90 && col.h < 140) return true;  // 荧光绿/草绿
    if (col.h > 190 && col.h < 230) return true;  // 宝蓝
  }
  // 牛仔蓝（校园常见）
  if (col.h > 200 && col.h < 230 && col.s > 30 && col.s < 65 && col.l > 35 && col.l < 60) return true;
  return false;
}

// 上班族（20-35岁）偏好色：低饱和柔色、莫兰迪、商务休闲
function isWorkerPreferredColor(col) {
  // 莫兰迪素色 / 低饱和柔色（全色相低饱和）
  if (col.s < 45 && col.s > 10 && col.l > 35 && col.l < 80) return true;
  // 暖灰蓝色系（取代传统藏青）
  if (col.h > 200 && col.h < 240 && col.s < 50 && col.l > 40 && col.l < 65) return true;
  // 低饱和绿（鼠尾草绿、灰绿、抹茶绿）
  if (col.h > 80 && col.h < 160 && col.s < 50 && col.l > 30 && col.l < 65) return true;
  // 低调焦糖/摩卡棕
  if (col.h > 15 && col.h < 45 && col.s < 55 && col.l > 25 && col.l < 55) return true;
  // 云上舞白/柔白（万能基底色）
  if (col.l > 82 && col.s < 20) return true;
  // 奶油彩调系（雾霾紫、婴儿蓝、薄荷绿等高明度低饱和）
  if (col.l > 65 && col.s < 45 && col.s > 10) return true;
  return false;
}

// 中年群体（35-55岁）偏好色：显白提气色、低饱和、大地色、柔雾感
function isMiddleAgedPreferredColor(col) {
  // 低饱和柔色（核心：显白不显老）
  if (col.s < 40 && col.s > 8 && col.l > 40 && col.l < 80) return true;
  // 大地色系（卡其、驼色、焦糖、摩卡棕）
  if (col.h > 18 && col.h < 50 && col.s < 60 && col.l > 30 && col.l < 65) return true;
  // 军绿/草木绿/浅苔绿（带灰调的绿）
  if (col.h > 60 && col.h < 130 && col.s < 50 && col.l > 25 && col.l < 55) return true;
  // 牛仔蓝/莫兰迪蓝（明度适中）
  if (col.h > 200 && col.h < 240 && col.s < 55 && col.l > 35 && col.l < 60) return true;
  // 柔焦粉/茱萸粉/玫瑰粉（低饱和粉，不装嫩）
  if ((col.h > 330 || col.h < 10) && col.s < 45 && col.s > 15 && col.l > 55 && col.l < 75) return true;
  // 雾感紫/无花果紫（偏灰调紫）
  if (col.h > 260 && col.h < 310 && col.s < 45 && col.s > 10 && col.l > 30 && col.l < 60) return true;
  // 米灰色/燕麦色（低调百搭奢华）
  if (col.l > 70 && col.l < 88 && col.s < 20) return true;
  // 金合欢黄/柔和黄（融入绿意的柔和黄色）
  if (col.h > 45 && col.h < 70 && col.s < 50 && col.l > 60 && col.l < 80) return true;
  return false;
}

// 年龄段百搭色（男女通用的年龄段偏好色交集）
function isAgeUnisexPreferredColor(col, age) {
  if (age === "student") {
    // 学生百搭：中性色+学院风+柔雾色（男女都能穿）
    if (isNeutral(col)) return true;
    if (col.h > 200 && col.h < 240 && col.l < 40 && col.s > 40) return true; // 藏青/海军蓝
    if (col.h > 200 && col.h < 230 && col.s > 25 && col.s < 60 && col.l > 35 && col.l < 60) return true; // 牛仔蓝
    if (col.h > 80 && col.h < 150 && col.s < 50 && col.l > 35 && col.l < 60) return true; // 橄榄绿/军绿
    if (col.h > 145 && col.h < 175 && col.l > 55 && col.s < 50) return true; // 薄荷绿
    if (col.h > 25 && col.h < 50 && col.s < 40 && col.l > 55) return true; // 卡其/燕麦
    if (col.l > 60 && col.s < 40 && col.s > 15) return true; // 柔彩马卡龙（低饱和）
    return false;
  }
  if (age === "worker") {
    // 上班族百搭：莫兰迪素色、低饱和、中性色、大地色
    if (isNeutral(col)) return true;
    if (col.s < 45 && col.s > 8 && col.l > 35 && col.l < 75) return true; // 全色系低饱和
    if (col.h > 15 && col.h < 50 && col.s < 55 && col.l > 25 && col.l < 60) return true; // 焦糖/棕
    if (col.h > 80 && col.h < 160 && col.s < 50 && col.l > 30 && col.l < 60) return true; // 灰绿/抹茶
    if (col.h > 200 && col.h < 240 && col.s < 55 && col.l > 35 && col.l < 65) return true; // 暖灰蓝
    return false;
  }
  if (age === "middle") {
    // 中年百搭：大地色、低饱和、中性色、显气色柔色
    if (isNeutral(col)) return true;
    if (col.h > 18 && col.h < 50 && col.s < 60 && col.l > 30 && col.l < 65) return true; // 大地色系
    if (col.h > 60 && col.h < 130 && col.s < 50 && col.l > 25 && col.l < 55) return true; // 军绿/浅苔绿
    if (col.h > 200 && col.h < 240 && col.s < 55 && col.l > 35 && col.l < 60) return true; // 牛仔蓝/莫兰迪蓝
    if (col.s < 40 && col.s > 8 && col.l > 45 && col.l < 75) return true; // 低饱和柔色
    if (col.l > 70 && col.l < 88 && col.s < 20) return true; // 米灰/燕麦
    return false;
  }
  return false;
}

// ===== 尺码色彩适配策略 =====
// 小码：浅色/亮色更友好（视觉膨胀，不显单薄）
// 标准码：全色兼容
// 大码：深色/低饱和/冷色更友好（视觉收缩，显瘦）

function getSizeCategory(size) {
  if (size === "XS" || size === "S") return "small";
  if (size === "M" || size === "L") return "medium";
  if (size === "XL" || size === "XXL") return "large";
  if (size === "XXXL" || size === "XXXXL" || size === "XXXXXL") return "xlarge";
  return null;
}

function isSizeFriendlyColor(col, size) {
  var cat = getSizeCategory(size);
  if (!cat) return true; // 无尺码限制

  if (cat === "small") {
    // XS/S：浅色系、亮色系更友好（增加视觉体积感）
    // 偏好：高明度、中高饱和度、暖色调
    if (col.l > 70) return true; // 浅色/亮色
    if (col.s > 60 && col.l > 50 && col.l < 70) return true; // 明亮饱和色
    if (col.h > 10 && col.h < 60) return true; // 暖色调（橙黄）
    if (col.l < 25) return false; // 避免极深色（显更瘦）
    return col.l > 45; // 中等明度以上都可以
  }

  if (cat === "medium") {
    // M/L：标准码，所有颜色都友好
    return true;
  }

  if (cat === "large") {
    // XL/XXL：深色系、低饱和、冷色调更友好（视觉收缩显瘦）
    if (col.l < 45) return true; // 深色
    if (col.s < 45 && col.l > 30 && col.l < 60) return true; // 低饱和中低明度
    if (col.h > 180 && col.h < 280) return true; // 冷色调（蓝紫）
    if (col.l > 85 && col.s < 25) return true; // 极浅色也显瘦（垂坠感）
    if (col.s > 75 && col.l > 60) return false; // 避免高饱和亮色（膨胀感）
    return col.s < 55; // 中低饱和都可以
  }

  if (cat === "xlarge") {
    // XXXL+：更深、更低调的颜色更显瘦
    if (col.l < 35) return true; // 深色（强烈收缩）
    if (col.s < 35 && col.l > 25 && col.l < 55) return true; // 低饱和中低明度
    if (col.h > 190 && col.h < 270) return true; // 冷色调（蓝/藏青/深紫）
    if (col.l > 88 && col.s < 20) return true; // 极浅中性色（高级感）
    if (col.s > 60 && col.l > 50) return false; // 避免亮色
    if (col.h > 0 && col.h < 40 && col.s > 50) return false; // 避免暖橙色系（膨胀感）
    return col.s < 45 && col.l < 55; // 主要推荐中低饱和、中低明度
  }

  return true;
}

// 尺码色彩适配度评分（0~1）
function sizeColorFitScore(col, size) {
  var cat = getSizeCategory(size);
  if (!cat || cat === "medium") return 1.0; // 标准码完美适配

  var fit = 0.5; // 默认中等
  var isFriendly = isSizeFriendlyColor(col, size);

  if (isFriendly) {
    fit = 0.9;
    // 特别友好的再加分
    if (cat === "small" && col.l > 75 && col.s > 40) fit = 1.0; // 明亮色
    if (cat === "large" && col.l < 40 && col.s < 40) fit = 1.0; // 深柔色
    if (cat === "xlarge" && col.l < 30) fit = 1.0; // 深色显瘦
  } else {
    fit = 0.3;
    // 特别不友好的再减分
    if (cat === "small" && col.l < 20) fit = 0.2; // 极深色显更瘦
    if (cat === "large" && col.s > 80 && col.l > 65) fit = 0.2; // 亮膨胀色
    if (cat === "xlarge" && col.s > 70 && col.l > 55) fit = 0.15; // 高饱和亮色
  }

  return fit;
}

function scoreCombo(combo) {
  var score = 50;
  var neutralCount = 0;
  var mutedCount = 0;
  var brightCount = 0;
  var trendCount = 0;
  var hues = [];

  for (var i = 0; i < combo.length; i++) {
    var c = combo[i];
    hues.push(c.h);
    if (isNeutral(c)) neutralCount++;
    if (isMuted(c)) mutedCount++;
    if (c.s > 55) brightCount++;
    if (isTrendColor(c)) trendCount++;
  }

  // 通勤风格偏好：至少 1 个中性色
  if (neutralCount >= 1) score += 15;
  if (neutralCount >= 2) score += 8;

  // 偏好低饱和度
  if (mutedCount === combo.length) score += 10;
  if (brightCount >= 2) score -= 20; // 太多彩色不适合通勤
  if (brightCount >= 3) score -= 15;

  // 对比度检查
  if (combo.length >= 2) {
    var contrast = getContrast(combo[0], combo[combo.length - 1]);
    if (contrast >= 4.5) score += 12;
    else if (contrast >= 3) score += 6;
    else if (contrast < 1.5) score -= 15;
  }

  // 色相和谐度
  if (combo.length >= 2 && !isNeutral(combo[0]) && !isNeutral(combo[1])) {
    var hd = hueDistance(combo[0].h, combo[1].h);
    if (hd < 30) score += 8;          // 类似色
    else if (hd > 150) score += 6;    // 互补色
    else if (hd > 60 && hd < 120) score -= 8; // 撞色
  }

  // 3 色组合：第3色应为中性或低饱和
  if (combo.length === 3) {
    if (isNeutral(combo[2]) || isMuted(combo[2])) score += 8;
    else score -= 10;
  }

  // 色彩数量惩罚：通勤不超 3 色
  if (combo.length > 3) score -= 15;

  // ===== 2027春夏流行趋势加权 =====
  // 包含趋势色加分（互联共生主题）
  if (trendCount >= 1) score += 8;
  if (trendCount >= 2) score += 10;   // 双趋势色组合更时尚

  // 年度色流光蓝 + 活力橙 经典搭配（冷暖对比，互联共生）
  var hasLuminousBlue = false;
  var hasEnergyOrange = false;
  for (var t = 0; t < combo.length; t++) {
    var cn = getTrendColorName(combo[t]);
    if (cn === "流光蓝") hasLuminousBlue = true;
    if (cn === "活力橙") hasEnergyOrange = true;
  }
  if (hasLuminousBlue && hasEnergyOrange) score += 8;

  // 波普粉 + 草甸绿 粉绿撞色（年轻活力 + 自然安全感）
  var hasPopPink = false;
  var hasMeadowGreen = false;
  for (var t2 = 0; t2 < combo.length; t2++) {
    var cn2 = getTrendColorName(combo[t2]);
    if (cn2 === "波普粉") hasPopPink = true;
    if (cn2 === "草甸绿") hasMeadowGreen = true;
  }
  if (hasPopPink && hasMeadowGreen) score += 7;

  // 流光蓝 + 陶土色（科技感与质朴感融合）
  var hasClay = false;
  for (var t3 = 0; t3 < combo.length; t3++) {
    if (getTrendColorName(combo[t3]) === "陶土色") hasClay = true;
  }
  if (hasLuminousBlue && hasClay) score += 6;

  // 大地色系回归（陶土+橄榄绿+棕色系）
  var earthTonesCount = 0;
  for (var t4 = 0; t4 < combo.length; t4++) {
    var c4 = combo[t4];
    if ((c4.h > 15 && c4.h < 50 && c4.s < 70 && c4.l < 55) || // 棕橙色系
        (c4.h > 70 && c4.h < 120 && c4.s < 50 && c4.l < 45)) { // 橄榄绿系
      earthTonesCount++;
    }
  }
  if (earthTonesCount >= 2 && neutralCount >= 1) score += 5;

  // 柔粉 + 奶油黄 松弛氛围感
  var hasSoftPink = false;
  var hasCreamYellow = false;
  for (var t5 = 0; t5 < combo.length; t5++) {
    var c5 = combo[t5];
    if (c5.h > 330 && c5.h < 360 && c5.s < 50 && c5.l > 60) hasSoftPink = true;
    if (c5.h > 40 && c5.h < 70 && c5.s < 45 && c5.l > 75) hasCreamYellow = true;
  }
  if (hasSoftPink && hasCreamYellow) score += 5;

  // 低饱和裸调（静奢风延续）
  if (mutedCount >= 2 && trendCount >= 1) score += 4;

  // ===== 性别偏好加权 =====
  var preferredCount = 0;
  var nonPreferredCount = 0;
  var genderPrefActive = state.gender === "male" || state.gender === "female";
  if (genderPrefActive) {
    for (var g = 0; g < combo.length; g++) {
      var gc = combo[g];
      if (isNeutral(gc)) continue;
      if (state.gender === "male") {
        if (isMalePreferredColor(gc)) preferredCount++;
        else nonPreferredCount++;
      } else {
        if (isFemalePreferredColor(gc)) preferredCount++;
        else nonPreferredCount++;
      }
    }
    if (preferredCount >= 1) score += 5;
    if (preferredCount >= 2) score += 8;
    if (preferredCount >= 3) score += 6;
    if (nonPreferredCount >= 2 && preferredCount === 0) score -= 5;
  }

  // ===== 年龄段偏好加权 =====
  if (state.age) {
    var agePrefCount = 0;
    var ageNonPrefCount = 0;
    for (var a = 0; a < combo.length; a++) {
      var ac = combo[a];
      if (isNeutral(ac)) continue;
      var isAgePref = false;
      if (!genderPrefActive) {
        // 无性别·百搭模式：用年龄段男女通用偏好
        isAgePref = isAgeUnisexPreferredColor(ac, state.age);
      } else {
        // 有性别：用对应性别的年龄段偏好
        if (state.age === "student") isAgePref = isStudentPreferredColor(ac);
        else if (state.age === "worker") isAgePref = isWorkerPreferredColor(ac);
        else if (state.age === "middle") isAgePref = isMiddleAgedPreferredColor(ac);
      }
      if (isAgePref) agePrefCount++;
      else ageNonPrefCount++;
    }
    // 年龄偏好加分（比性别加权重，因为年龄是更具体的场景）
    if (agePrefCount >= 1) score += 4;
    if (agePrefCount >= 2) score += 7;
    if (agePrefCount >= 3) score += 5;
    if (ageNonPrefCount >= 2 && agePrefCount === 0) score -= 3;
  }

  // ===== 尺码色彩适配加权 =====
  if (state.size) {
    var sizeCat = getSizeCategory(state.size);
    var sizeFriendlyCount = 0;
    var sizeUnfriendlyCount = 0;
    var totalFitScore = 0;
    for (var s = 0; s < combo.length; s++) {
      var sc = combo[s];
      if (isNeutral(sc)) continue;
      var fit = sizeColorFitScore(sc, state.size);
      totalFitScore += fit;
      if (fit >= 0.85) sizeFriendlyCount++;
      else if (fit <= 0.4) sizeUnfriendlyCount++;
    }

    var nonNeutralLen = combo.filter(function (c) { return !isNeutral(c); }).length;
    if (nonNeutralLen > 0) {
      var avgFit = totalFitScore / nonNeutralLen;
      // 根据平均适配度调整分数
      if (avgFit >= 0.85) score += 8;
      else if (avgFit >= 0.7) score += 5;
      else if (avgFit >= 0.5) score += 2;
      else if (avgFit <= 0.3) score -= 8;
      else if (avgFit <= 0.45) score -= 4;
    }

    // 大码场景：上深下浅或上浅下深的对比搭配更显瘦
    if (sizeCat === "large" || sizeCat === "xlarge") {
      if (combo.length >= 2) {
        var lightnessDiff = Math.abs(combo[0].l - combo[combo.length - 1].l);
        if (lightnessDiff > 25) score += 3; // 明暗对比显瘦
      }
    }

    // 小码场景：同色系深浅过渡更显丰满
    if (sizeCat === "small") {
      if (combo.length >= 2 && !isNeutral(combo[0]) && !isNeutral(combo[1])) {
        var hueDiff = hueDistance(combo[0].h, combo[1].h);
        if (hueDiff < 40) score += 3; // 同色系更显体积感
      }
    }
  }

  // ===== 穿着场合加权 =====
  if (state.occasion) {
    var occNeutralCount = neutralCount;
    var occBrightCount = brightCount;
    var occMutedCount = mutedCount;

    if (state.occasion === "business") {
      // 商务沙龙：需要正式、克制，中性色为主
      if (occNeutralCount >= 2) score += 8;
      if (occNeutralCount >= 1) score += 4;
      if (occBrightCount >= 2) score -= 10;
      if (occBrightCount >= 1) score -= 5;
      if (occMutedCount === combo.length) score += 5;
    } else if (state.occasion === "work") {
      // 日常工作：通勤风格，中性+低饱和
      if (occNeutralCount >= 1) score += 5;
      if (occBrightCount >= 2) score -= 8;
      if (occMutedCount >= 2) score += 3;
    } else if (state.occasion === "dinner") {
      // 家庭聚餐：温馨亲和，暖色调加分
      var warmCount = 0;
      for (var oc1 = 0; oc1 < combo.length; oc1++) {
        var wc = combo[oc1];
        if (!isNeutral(wc) && wc.h >= 0 && wc.h <= 60) warmCount++;
        if (!isNeutral(wc) && wc.h >= 330 && wc.h <= 360) warmCount++;
      }
      if (warmCount >= 1) score += 5;
      if (occBrightCount >= 2) score -= 3;
    } else if (state.occasion === "party") {
      // 朋友聚会：活泼时尚，允许撞色和亮色
      if (occBrightCount >= 1) score += 6;
      if (occBrightCount >= 2) score += 4;
      if (trendCount >= 1) score += 4;
      if (occNeutralCount === combo.length) score -= 5;
    } else if (state.occasion === "date") {
      // 约会：精致有亮点，单亮色+中性色最佳
      if (occBrightCount === 1 && occNeutralCount >= 1) score += 8;
      if (occBrightCount >= 1) score += 3;
      if (trendCount >= 1) score += 5;
      if (occNeutralCount === combo.length) score -= 3;
    } else if (state.occasion === "home") {
      // 居家：松弛舒适，低饱和、柔和色系
      if (occMutedCount >= 2) score += 6;
      if (occBrightCount >= 1) score -= 5;
      if (occMutedCount === combo.length) score += 4;
    } else if (state.occasion === "travel") {
      // 旅游：实用耐脏，中性+适度亮色
      if (occNeutralCount >= 1) score += 4;
      if (occBrightCount === 1) score += 3;
      if (occBrightCount >= 3) score -= 5;
    }
  }

  // ===== 穿着季节加权 =====
  if (state.season) {
    var seasonWarmCount = 0;
    var seasonCoolCount = 0;
    var seasonEarthCount = 0;
    var seasonLightCount = 0;
    var seasonDeepCount = 0;

    for (var sc2 = 0; sc2 < combo.length; sc2++) {
      var seasonC = combo[sc2];
      if (isNeutral(seasonC)) continue;
      var sh = seasonC.h;
      var ss = seasonC.s;
      var sl = seasonC.l;

      // 暖色（红橙黄）
      if ((sh >= 0 && sh <= 60) || (sh >= 330 && sh <= 360)) seasonWarmCount++;
      // 冷色（蓝绿）
      if (sh >= 170 && sh <= 280) seasonCoolCount++;
      // 大地色（棕橙系、橄榄绿系）
      if ((sh >= 15 && sh <= 50 && ss < 70 && sl < 55) ||
          (sh >= 70 && sh <= 120 && ss < 50 && sl < 45)) seasonEarthCount++;
      // 浅色
      if (sl > 65) seasonLightCount++;
      // 深色
      if (sl < 40) seasonDeepCount++;
    }

    if (state.season === "spring") {
      // 春季：清新浅色、暖色加分
      if (seasonLightCount >= 1) score += 5;
      if (seasonWarmCount >= 1) score += 3;
      if (seasonDeepCount >= 2) score -= 4;
    } else if (state.season === "summer") {
      // 夏季：冷色、浅色加分，清凉感
      if (seasonCoolCount >= 1) score += 6;
      if (seasonLightCount >= 2) score += 4;
      if (seasonDeepCount >= 2) score -= 5;
      if (seasonWarmCount >= 2) score -= 3;
    } else if (state.season === "autumn") {
      // 秋季：大地色、暖色、深色加分
      if (seasonEarthCount >= 1) score += 7;
      if (seasonWarmCount >= 1) score += 4;
      if (seasonDeepCount >= 1) score += 3;
    } else if (state.season === "winter") {
      // 冬季：深色、高对比度加分
      if (seasonDeepCount >= 1) score += 5;
      if (seasonCoolCount >= 1) score += 4;
      if (combo.length >= 2) {
        var winterContrast = Math.abs(combo[0].l - combo[combo.length - 1].l);
        if (winterContrast > 40) score += 5; // 冬季适合高对比
      }
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function describeCombo(combo) {
  var names = combo.map(colorName);
  var nameStr = names.join(" + ");

  var desc;
  var neutrals = combo.filter(isNeutral).length;
  var brights = combo.filter(function (c) { return c.s > 55; }).length;
  var trendCount = combo.filter(isTrendColor).length;
  var preferredCount = 0;
  var agePrefCount = 0;
  var genderPrefActive = state.gender === "male" || state.gender === "female";

  // 性别偏好计数
  if (genderPrefActive) {
    for (var d = 0; d < combo.length; d++) {
      var dc = combo[d];
      if (isNeutral(dc)) continue;
      if (state.gender === "male" && isMalePreferredColor(dc)) preferredCount++;
      if (state.gender === "female" && isFemalePreferredColor(dc)) preferredCount++;
    }
  }

  // 年龄偏好计数
  if (state.age) {
    for (var da = 0; da < combo.length; da++) {
      var dac = combo[da];
      if (isNeutral(dac)) continue;
      var agePref = false;
      if (!genderPrefActive) {
        agePref = isAgeUnisexPreferredColor(dac, state.age);
      } else {
        if (state.age === "student") agePref = isStudentPreferredColor(dac);
        else if (state.age === "worker") agePref = isWorkerPreferredColor(dac);
        else if (state.age === "middle") agePref = isMiddleAgedPreferredColor(dac);
      }
      if (agePref) agePrefCount++;
    }
  }

  if (neutrals === combo.length) {
    desc = "全中性色组合，百搭不出错，日常基础款，适合各种场合";
  } else if (neutrals >= 1 && brights === 0) {
    desc = "中性色为主搭配柔和色调，沉稳耐看，适合职场日常穿搭";
  } else if (neutrals >= 1 && brights === 1) {
    desc = "基础色 + 单点亮色，经典搭配，亮点突出，适合日常穿搭";
  } else if (brights <= 1) {
    desc = "柔和色调组合，百搭耐看，适合日常通勤";
  } else {
    desc = "色彩层次丰富，吸睛度高，适合时尚场合穿搭";
  }

  // 2027春夏趋势描述
  var trendPrefix = "";
  if (genderPrefActive && state.age) {
    // 性别 + 年龄
    var genderLabel = state.gender === "male" ? "男装" : "女装";
    var ageLabel = "";
    if (state.age === "student") ageLabel = "12~18岁「青春活力」";
    else if (state.age === "worker") ageLabel = "20~35岁「松弛通勤」";
    else if (state.age === "middle") ageLabel = "35~55岁「气质沉淀」";
    if (trendCount >= 2 && (preferredCount >= 1 || agePrefCount >= 1)) {
      trendPrefix = "2027春夏" + ageLabel + genderLabel + "趋势配色，";
    } else if (trendCount >= 1) {
      trendPrefix = "融入2027春夏流行色，";
    }
  } else if (state.age && !genderPrefActive) {
    // 仅年龄·百搭模式
    var ageLabel2 = "";
    if (state.age === "student") ageLabel2 = "12~18岁「青春百搭」";
    else if (state.age === "worker") ageLabel2 = "20~35岁「通勤百搭」";
    else if (state.age === "middle") ageLabel2 = "35~55岁「气质百搭」";
    if (trendCount >= 2 && agePrefCount >= 1) {
      trendPrefix = "2027春夏" + ageLabel2 + "趋势配色，";
    } else if (trendCount >= 1) {
      trendPrefix = "融入2027春夏流行色，";
    } else if (agePrefCount >= 1) {
      trendPrefix = ageLabel2 + "优选配色，";
    }
  } else if (genderPrefActive) {
    // 仅性别
    if (state.gender === "male") {
      if (trendCount >= 2 && preferredCount >= 1) {
        trendPrefix = "2027春夏男装「自然新叙」趋势配色，";
      } else if (trendCount >= 1) {
        trendPrefix = "融入2027春夏男装流行色，";
      }
    } else {
      if (trendCount >= 2 && preferredCount >= 1) {
        trendPrefix = "2027春夏女装「多巴胺与疗愈共生」趋势配色，";
      } else if (trendCount >= 1) {
        trendPrefix = "融入2027春夏女装流行色，";
      }
    }
  } else {
    // 都没选
    if (trendCount >= 2) {
      trendPrefix = "2027春夏「互联共生」趋势配色，";
    } else if (trendCount >= 1) {
      trendPrefix = "融入2027春夏流行色，";
    }
  }
  desc = trendPrefix + desc;

  // 色彩关系描述
  if (combo.length >= 2 && !isNeutral(combo[0]) && !isNeutral(combo[1])) {
    var hd = hueDistance(combo[0].h, combo[1].h);
    if (hd < 30) desc += "，属类似色搭配";
    else if (hd > 150) desc += "，属互补色搭配";
  }

  // 尺码适配度描述
  var sizeFitLevel = 0;
  if (state.size) {
    var nonNeutralColors = combo.filter(function (c) { return !isNeutral(c); });
    if (nonNeutralColors.length > 0) {
      var totalFit = 0;
      for (var sf = 0; sf < nonNeutralColors.length; sf++) {
        totalFit += sizeColorFitScore(nonNeutralColors[sf], state.size);
      }
      var avgFit = totalFit / nonNeutralColors.length;
      if (avgFit >= 0.85) sizeFitLevel = 2; // 非常友好
      else if (avgFit >= 0.6) sizeFitLevel = 1; // 比较友好
      else if (avgFit < 0.4) sizeFitLevel = -1; // 不太友好
    }
  }

  // 场合适配度描述
  var occasionFitLevel = 0;
  var occasionDesc = "";
  if (state.occasion) {
    var occLabels = {
      business: "商务沙龙", dinner: "家庭聚餐", party: "朋友聚会",
      date: "约会", work: "日常工作", home: "居家", travel: "旅游"
    };
    var occNeutral = combo.filter(isNeutral).length;
    var occBright = combo.filter(function (c) { return c.s > 55; }).length;
    var occMuted = combo.filter(isMuted).length;

    if (state.occasion === "business" || state.occasion === "work") {
      if (occNeutral >= 2 && occBright === 0) { occasionFitLevel = 2; occasionDesc = "高度契合" + occLabels[state.occasion] + "场合"; }
      else if (occNeutral >= 1 && occBright <= 1) { occasionFitLevel = 1; occasionDesc = "适合" + occLabels[state.occasion] + "场合"; }
      else if (occBright >= 2) { occasionFitLevel = -1; occasionDesc = "色彩过于鲜艳，" + occLabels[state.occasion] + "场合建议更克制"; }
    } else if (state.occasion === "party" || state.occasion === "date") {
      if (occBright >= 1 || trendCount >= 1) { occasionFitLevel = 2; occasionDesc = "出彩时尚，契合" + occLabels[state.occasion] + "氛围"; }
      else if (occNeutral === combo.length) { occasionFitLevel = -1; occasionDesc = "全中性色偏素，" + occLabels[state.occasion] + "可加点亮色"; }
      else { occasionFitLevel = 1; occasionDesc = "适合" + occLabels[state.occasion] + "场合"; }
    } else if (state.occasion === "home") {
      if (occMuted >= 2) { occasionFitLevel = 2; occasionDesc = "柔和松弛，契合居家氛围"; }
      else if (occBright >= 2) { occasionFitLevel = -1; occasionDesc = "色彩过于鲜明，居家建议更柔和"; }
      else { occasionFitLevel = 1; occasionDesc = "适合居家穿着"; }
    } else if (state.occasion === "travel") {
      if (occNeutral >= 1 && occBright <= 1) { occasionFitLevel = 2; occasionDesc = "实用耐看，适合旅游穿搭"; }
      else if (occBright >= 3) { occasionFitLevel = -1; occasionDesc = "色彩过多，旅游建议更简洁"; }
      else { occasionFitLevel = 1; occasionDesc = "适合旅游穿着"; }
    } else if (state.occasion === "dinner") {
      if (occMuted >= 1 && occNeutral >= 1) { occasionFitLevel = 2; occasionDesc = "温馨得体，适合家庭聚餐"; }
      else if (occBright >= 2) { occasionFitLevel = 1; occasionDesc = "适合家庭聚餐，色彩稍鲜明"; }
      else { occasionFitLevel = 1; occasionDesc = "适合家庭聚餐场合"; }
    }
    if (occasionDesc) desc += "，" + occasionDesc;
  }

  // 季节适配度描述
  var seasonFitLevel = 0;
  var seasonDesc = "";
  if (state.season) {
    var seasonLabels = { spring: "春季", summer: "夏季", autumn: "秋季", winter: "冬季" };
    var sWarm = 0, sCool = 0, sEarth = 0, sLight = 0, sDeep = 0;
    for (var sd = 0; sd < combo.length; sd++) {
      var sc3 = combo[sd];
      if (isNeutral(sc3)) continue;
      var dh = sc3.h, ds = sc3.s, dl = sc3.l;
      if ((dh >= 0 && dh <= 60) || (dh >= 330 && dh <= 360)) sWarm++;
      if (dh >= 170 && dh <= 280) sCool++;
      if ((dh >= 15 && dh <= 50 && ds < 70 && dl < 55) ||
          (dh >= 70 && dh <= 120 && ds < 50 && dl < 45)) sEarth++;
      if (dl > 65) sLight++;
      if (dl < 40) sDeep++;
    }

    if (state.season === "spring") {
      if (sLight >= 1 && sWarm >= 1) { seasonFitLevel = 2; seasonDesc = "清新明亮，契合春季"; }
      else if (sDeep >= 2) { seasonFitLevel = -1; seasonDesc = "色调偏沉，春季建议更轻快"; }
      else { seasonFitLevel = 1; seasonDesc = "适合春季穿着"; }
    } else if (state.season === "summer") {
      if (sCool >= 1 && sLight >= 1) { seasonFitLevel = 2; seasonDesc = "清凉舒爽，契合夏季"; }
      else if (sDeep >= 2 || sWarm >= 2) { seasonFitLevel = -1; seasonDesc = "色调偏暖/偏沉，夏季建议更清凉"; }
      else { seasonFitLevel = 1; seasonDesc = "适合夏季穿着"; }
    } else if (state.season === "autumn") {
      if (sEarth >= 1 || (sWarm >= 1 && sDeep >= 1)) { seasonFitLevel = 2; seasonDesc = "浓郁温暖，契合秋季"; }
      else if (sLight >= 2 && sWarm === 0) { seasonFitLevel = -1; seasonDesc = "色调偏冷偏浅，秋季建议更温暖"; }
      else { seasonFitLevel = 1; seasonDesc = "适合秋季穿着"; }
    } else if (state.season === "winter") {
      if (sDeep >= 1 || sCool >= 1) { seasonFitLevel = 2; seasonDesc = "沉稳深邃，契合冬季"; }
      else if (sLight >= 2 && sWarm >= 2) { seasonFitLevel = -1; seasonDesc = "色调偏暖偏浅，冬季建议更深沉"; }
      else { seasonFitLevel = 1; seasonDesc = "适合冬季穿着"; }
    }
    if (seasonDesc) desc += "，" + seasonDesc;
  }

  return { name: nameStr, desc: desc, trendCount: trendCount, preferredCount: preferredCount, agePrefCount: agePrefCount, sizeFitLevel: sizeFitLevel, occasionFitLevel: occasionFitLevel, seasonFitLevel: seasonFitLevel };
}

// ===== 大模型上下文构建 =====
// 供大模型集成时调用，返回所有用户选择的结构化数据
function buildAIContext() {
  var genderLabels = { male: "男", female: "女" };
  var ageLabels = { student: "12~18岁学生", worker: "20~35岁职场人", middle: "35~55岁成熟人士" };
  var occasionLabels = {
    business: "商务沙龙", dinner: "家庭聚餐", party: "朋友聚会",
    date: "约会", work: "日常工作", home: "居家", travel: "旅游"
  };
  var seasonLabels = { spring: "春季", summer: "夏季", autumn: "秋季", winter: "冬季" };

  var context = {
    gender: state.gender || null,
    genderLabel: genderLabels[state.gender] || "不限",
    age: state.age || null,
    ageLabel: state.age ? ageLabels[state.age] : "不限",
    size: state.size || null,
    occasion: state.occasion || null,
    occasionLabel: state.occasion ? occasionLabels[state.occasion] : "不限",
    season: state.season || null,
    seasonLabel: state.season ? seasonLabels[state.season] : "不限",
    items: state.items.map(function (it) {
      return {
        id: it.id,
        category: it.category,
        categoryName: it.categoryName,
        group: it.group,
        colors: (it.colors || []).map(function (c) {
          return { name: c.name, hex: c.hex, h: c.h, s: c.s, l: c.l };
        }),
        pattern: it.pattern || null,
        style: it.style || null,
        clothingSeason: it.season || null
      };
    })
  };
  return context;
}

// 生成大模型搭配推荐提示词（供朋友集成大模型时使用）
function buildAIOutfitPrompt(selectedIds) {
  var ctx = buildAIContext();
  var items = ctx.items;
  if (selectedIds && selectedIds.length > 0) {
    items = items.filter(function (it) { return selectedIds.indexOf(it.id) >= 0; });
  }

  var parts = [];
  parts.push("你是一位专业的服装搭配师。请根据以下用户信息和服装数据，生成配色与搭配推荐。");
  parts.push("");
  parts.push("【用户信息】");
  parts.push("- 性别：" + ctx.genderLabel);
  parts.push("- 年龄段：" + ctx.ageLabel);
  parts.push("- 尺码：" + (ctx.size || "不限"));
  parts.push("- 穿着场合：" + ctx.occasionLabel);
  parts.push("- 穿着季节：" + ctx.seasonLabel);
  parts.push("");
  parts.push("【服装数据】");

  items.forEach(function (it, idx) {
    var colorNames = (it.colors || []).map(function (c) { return c.name; }).join("、");
    parts.push((idx + 1) + ". 品类：" + (it.categoryName || it.category || "未知") +
      " | 颜色：" + (colorNames || "未知") +
      " | 花纹：" + (it.pattern || "未知") +
      " | 风格：" + (it.style || "未知") +
      " | 适用季节：" + (it.clothingSeason || "未知"));
  });

  parts.push("");
  parts.push("【要求】");
  parts.push("1. 根据「穿着场合」和「穿着季节」筛选适合的服装");
  parts.push("2. 考虑性别、年龄段、尺码的配色偏好");
  parts.push("3. 返回纯JSON数组（不要包裹在对象里），每套搭配格式：");
  if (items.length === 1) {
    parts.push('   {"selectedItems":[1],"colorScheme":"简约通勤风","reason":"针对这件单品的配色与穿搭建议","score":85}');
    parts.push("   - 只有 1 件服装时，selectedItems 固定为 [1]，围绕这件单品给出不同配色风格的穿搭建议");
  } else {
    parts.push('   {"selectedItems":[1,2],"colorScheme":"大地色通勤风","reason":"推荐理由","score":85}');
    parts.push("   - selectedItems 必须是上面「服装数据」里的序号数字（从1开始），不要用字符串");
  }
  parts.push("   - 生成 3~5 套搭配，按 score 从高到低排列");
  parts.push("4. 确保配色和谐、场合适宜、季节适宜");
  parts.push("5. 只返回JSON数组本身，第一个字符必须是 [，最后一个字符必须是 ]，不要任何解释文字、不要markdown代码块");

  return parts.join("\n");
}

// ===== 大模型搭配推荐接入 =====

// 判断 AI 搭配推荐是否可用（已配置接口地址 + 模型名）
function isAIOutfitReady() {
  return !!(apiConfig.custom && apiConfig.custom.endpoint && getTextModelName());
}
// 是否可用视觉模型进行图片识别
function isVisionReady() {
  return !!(apiConfig.custom && apiConfig.custom.endpoint && getVisionModelName());
}

// 获取参与 AI 搭配的条目（有颜色分析结果的），与提示词序号一致
function getAIOutfitItems(selectedIds) {
  var ctx = buildAIContext();
  var items = ctx.items;
  if (selectedIds && selectedIds.length > 0) {
    items = items.filter(function (it) { return selectedIds.indexOf(it.id) >= 0; });
  }
  // 只保留已完成颜色分析的单品，空卡片不喂给大模型
  items = items.filter(function (it) { return it.colors && it.colors.length > 0; });
  return items;
}

// 调用大模型生成搭配方案，成功返回与 renderMatchGrid 兼容的 combos 数组
function callAIOutfit(selectedIds, callback) {
  if (!isAIOutfitReady()) {
    callback("未配置大模型接口", null);
    return;
  }

  var items = getAIOutfitItems(selectedIds);
  var hasClothingItem = items.some(isClothingItem);
  if (items.length === 0 || !hasClothingItem) {
    callback("请至少添加 1 件已完成颜色分析的服装", null);
    return;
  }

  // 与 getAIOutfitItems 相同的筛选顺序，保证 selectedItems 序号能对回条目
  var prompt = buildAIOutfitPrompt(items.map(function (it) { return it.id; }));

  var format = apiConfig.custom.format || "openai";
  // 自动检测 ollama 格式
  if (!apiConfig.custom.format && apiConfig.custom.endpoint && apiConfig.custom.endpoint.indexOf("/api/chat") >= 0) {
    format = "ollama";
  }

  var xhr = new XMLHttpRequest();
  xhr.open("POST", apiConfig.custom.endpoint, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  if (apiConfig.custom.apiKey) {
    xhr.setRequestHeader("Authorization", "Bearer " + apiConfig.custom.apiKey);
  }
  xhr.timeout = 180000;

  var body;
  if (format === "ollama") {
    body = JSON.stringify({
      model: getTextModelName(),
      messages: [
        { role: "system", content: "你是一位专业的服装搭配师。" },
        { role: "user", content: prompt }
      ],
      stream: false,
      options: { temperature: 0.4, num_predict: 1200, num_ctx: 8192 }
    });
  } else {
    body = JSON.stringify({
      model: getTextModelName(),
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1200,
      num_ctx: 8192
    });
  }

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status !== 200) {
      callback("大模型请求失败 (HTTP " + xhr.status + ")", null);
      return;
    }
    var content = "";
    try {
      var resp = JSON.parse(xhr.responseText);
      if (resp.choices && resp.choices[0]) {
        content = resp.choices[0].message ? resp.choices[0].message.content : (resp.choices[0].text || "");
      } else if (resp.message && resp.message.content) {
        content = resp.message.content; // Ollama 原生格式
      } else if (resp.output) {
        content = resp.output.text || "";
      } else if (resp.response) {
        content = typeof resp.response === "string" ? resp.response : JSON.stringify(resp.response);
      }
    } catch (e) {
      callback("大模型响应解析失败: " + e.message, null);
      return;
    }
    if (!content) { callback("大模型返回内容为空", null); return; }

    var combos = parseAIOutfitResponse(content, items);
    if (!combos || combos.length === 0) {
      callback("大模型返回结果解析失败: " + content.substring(0, 120), null);
      return;
    }
    callback(null, combos);
  };
  xhr.onerror = function () { callback("网络请求失败，请检查接口地址与网络", null); };
  xhr.ontimeout = function () { callback("大模型请求超时", null); };
  xhr.send(body);
}

// 解析大模型返回的搭配 JSON 数组，映射为渲染所需结构
function parseAIOutfitResponse(content, items) {
  var jsonStr = content;
  var fence = content.match(/```[\s]*(?:json)?[\s]*([\s\S]*?)```/i);
  if (fence) jsonStr = fence[1].trim();

  var data = null;
  // 尝试直接解析
  try { data = JSON.parse(jsonStr); } catch (e) {}

  // 若解析出对象，先判断是否为单条搭配记录（有 selectedItems 等字段）
  if (data && !Array.isArray(data)) {
    var isOutfitRec = data.selectedItems || data.selected_items || data.itemIds ||
      data.items || data.selected || data.index || data.colorScheme || data.reason;
    if (isOutfitRec) {
      data = [data]; // 单条搭配对象 → 包成数组
    } else {
      // 可能是包裹对象（含 outfits/combinations 等键）
      data = data.outfits || data.combinations || data.outfit || data.result || data.items || data.data || data.list || null;
    }
  }

  // 尝试提取数组（仅在尚未拿到数组时）
  if (!data || !data.length) {
    var arrMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { data = JSON.parse(arrMatch[0]); } catch (e) { data = null; }
    }
  }
  // 尝试提取对象（含 outfits/combinations/items/result 等包裹 key）
  if (!data || !data.length) {
    var objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        var obj = JSON.parse(objMatch[0]);
        var isOutfit = obj.selectedItems || obj.selected_items || obj.itemIds || obj.colorScheme || obj.reason;
        data = isOutfit ? [obj] : (obj.outfits || obj.combinations || obj.outfit || obj.result || obj.items || obj.data || obj.list || null);
      } catch (e2) { /* fallthrough */ }
    }
  }
  if (!data || !data.length) return null;
  if (!Array.isArray(data)) data = [data];

  var combos = [];
  for (var i = 0; i < data.length; i++) {
    var rec = data[i] || {};
    // selectedItems 兼容多种字段名
    var idxs = rec.selectedItems || rec.selected_items || rec.itemIds || rec.items || rec.selected || [];
    if (typeof idxs === "number") idxs = [idxs];
    if (typeof idxs === "string") { // 字符串如 "1,2" 或 "item1"
      var parsed = idxs.match(/\d+/g);
      idxs = parsed || [];
    }
    if (!idxs.length && rec.index) idxs = [rec.index];
    var comboColors = [];
    var cats = [];
    var names = [];
    var itemIndexes = [];
    for (var j = 0; j < idxs.length; j++) {
      // 宽松提取数字（支持 "item1"→1、"第2件"→2、"3"→3）
      var numMatch = String(idxs[j]).match(/\d+/);
      if (!numMatch) continue;
      var n = parseInt(numMatch[0], 10);
      if (n < 1 || n > items.length) continue;
      var it = items[n - 1];
      var c = (it.colors && it.colors[0]) || { name: "未知", hex: "#cccccc", h: 0, s: 0, l: 75 };
      comboColors.push(c);
      cats.push(it.category);
      names.push(it.categoryName || it.category || "单品");
      itemIndexes.push(n);
    }
    if (comboColors.length === 0) continue;

    var reason = rec.reason || rec.desc || rec.description || rec.explanation || "";
    var colorScheme = rec.colorScheme || rec.color_scheme || rec.scheme || rec.colorCombination || "";
    var desc = reason;
    if (colorScheme && reason) desc = "【" + colorScheme + "】" + reason;
    else if (colorScheme) desc = colorScheme;

    var score = parseInt(rec.score, 10);
    if (isNaN(score)) score = 70;
    score = Math.max(0, Math.min(100, score));

    combos.push({
      combo: comboColors,
      score: score,
      name: rec.name || rec.title || names.join(" + "),
      desc: desc || "AI 为你定制的一套搭配方案",
      categories: cats,
      groups: comboColors.map(function () { return "clothing"; }),
      itemIds: itemIndexes.map(function (n) { return items[n - 1] ? items[n - 1].id : null; }).filter(Boolean),
      trendCount: 0,
      agePrefCount: 0,
      sizeFitLevel: 0,
      occasionFitLevel: 0,
      seasonFitLevel: 0,
      aiSource: true,
      colorScheme: colorScheme,
      itemIndexes: itemIndexes
    });
  }
  // 按 AI 给出的适配度降序
  combos.sort(function (a, b) { return b.score - a.score; });
  return combos.slice(0, 12);
}

// 判断是否为服装单品（group 缺省视为服装）
function isClothingItem(it) {
  return !!it && (it.group || "clothing") !== "accessory";
}

// 从多服装生成组合（基于色彩科学论文的专业搭配算法）
function generateCombinationsFromItems(selectedIds) {
  var readyItems = state.items.filter(function (it) { return it.colors && it.colors.length > 0; });

  // 如果指定了选中的 ID，只使用选中的
  if (selectedIds && selectedIds.length > 0) {
    readyItems = readyItems.filter(function (it) { return selectedIds.indexOf(it.id) >= 0; });
  }

  if (readyItems.length < 1) {
    return { combos: [], filterInfo: { total: 0, trendy: 0, used: 0, filteredOut: 0 } };
  }

  // 调用专业搭配算法
  var outfitResults = coordinateOutfit(readyItems, 8);

  // 转换为页面渲染需要的格式
  var combos = [];
  for (var i = 0; i < outfitResults.length; i++) {
    var outfit = outfitResults[i];
    var outfitItems = outfit.items;

    // 构建颜色数组（每件衣服的主色）
    var colorArr = [];
    var catArr = [];
    var idArr = [];
    var trendCount = 0;

    for (var j = 0; j < outfitItems.length; j++) {
      var itm = outfitItems[j];
      if (itm.colors && itm.colors.length > 0) {
        colorArr.push(itm.colors[0]); // 用每件衣服的主色
      }
      catArr.push(itm.category);
      idArr.push(itm.id);
      if (itm.isTrendy) trendCount++;
    }

    // 方案名称：基于色彩方案
    var schemeName = outfit.color_scheme + "搭配";

    // 描述：整合色彩说明和建议
    var descParts = [];
    descParts.push(outfit.color_explain);
    if (outfit.tip && outfit.tip !== "整体搭配协调，推荐穿着。") {
      descParts.push("建议：" + outfit.tip);
    }

    combos.push({
      combo: colorArr,
      name: schemeName,
      desc: descParts.join(" "),
      score: Math.round(outfit.total_score),
      categories: catArr,
      itemIds: idArr,
      groups: outfitItems.map(function (it) { return it.group || "clothing"; }),
      trendCount: trendCount,
      agePrefCount: trendCount, // 兼容旧字段
      sizeFitLevel: "medium",
      occasionFitLevel: outfit.occasion_score,
      seasonFitLevel: outfit.season_score,
      aiSource: false, // 本地算法，非AI
      // 额外信息（供扩展使用）
      colorScore: outfit.color_score,
      silhouetteScore: outfit.silhouette_score,
      occasionScore: outfit.occasion_score,
      seasonScore: outfit.season_score,
      silhouetteExplain: outfit.silhouette_explain,
      colorScheme: outfit.color_scheme
    });
  }

  var totalReady = readyItems.length;
  var trendyCount = readyItems.filter(function (it) { return it.isTrendy; }).length;
  var filterInfo = {
    total: totalReady,
    trendy: trendyCount,
    used: totalReady,
    filteredOut: 0,
    ai: false
  };

  return { combos: combos, filterInfo: filterInfo };
}

function generateCombinations(c1, c2) {
  var all1 = c1 || [];
  var all2 = c2 || [];
  var combos = [];

  // --- 2 色组合：每张图各取一个 ---
  for (var i = 0; i < all1.length; i++) {
    for (var j = 0; j < all2.length; j++) {
      // 按 light 排序，深色在前
      var pair = [all1[i], all2[j]].sort(function (a, b) { return a.l - b.l; });
      combos.push(pair);
    }
  }

  // --- 3 色组合：图1取2色 + 图2取1色 ---
  for (var a1 = 0; a1 < all1.length; a1++) {
    for (var a2 = a1 + 1; a2 < all1.length; a2++) {
      for (var b1 = 0; b1 < all2.length; b1++) {
        var trio = [all1[a1], all1[a2], all2[b1]].sort(function (a, b) { return a.l - b.l; });
        combos.push(trio);
      }
    }
  }

  // --- 3 色组合：图2取2色 + 图1取1色 ---
  for (var b1 = 0; b1 < all2.length; b1++) {
    for (var b2 = b1 + 1; b2 < all2.length; b2++) {
      for (var a1 = 0; a1 < all1.length; a1++) {
        var trio2 = [all2[b1], all2[b2], all1[a1]].sort(function (a, b) { return a.l - b.l; });
        combos.push(trio2);
      }
    }
  }

  // 去重：按 hex 组合的排序字符串
  var seen = {};
  var unique = [];
  for (var k = 0; k < combos.length; k++) {
    var key = combos[k].map(function (c) { return c.hex; }).sort().join("|");
    if (!seen[key]) {
      seen[key] = true;
      unique.push(combos[k]);
    }
  }

  // 评分排序
  var scored = unique.map(function (combo) {
    var info = describeCombo(combo);
    return {
      combo: combo,
      score: scoreCombo(combo),
      name: info.name,
      desc: info.desc,
      trendCount: info.trendCount,
      agePrefCount: info.agePrefCount,
      sizeFitLevel: info.sizeFitLevel,
      occasionFitLevel: info.occasionFitLevel || 0,
      seasonFitLevel: info.seasonFitLevel || 0
    };
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  // 取前 8 个，且尽量不重复 name
  var result = [];
  var nameSet = {};
  for (var s = 0; s < scored.length; s++) {
    if (result.length >= 8) break;
    if (nameSet[scored[s].name]) continue;
    nameSet[scored[s].name] = true;
    result.push(scored[s]);
  }

  return result;
}


  // 渲染服装特征标签
  function renderFeatureTags(container, patternInfo, trendScore, apiResult) {
    container.innerHTML = "";

    // API 识别品类标签（最优先显示）
    if (apiResult && apiResult.categoryName) {
      var catTag = document.createElement("span");
      catTag.className = "feature-tag";
      catTag.style.background = "#e8f5e9";
      catTag.style.color = "#2e7d32";
      catTag.textContent = "✓ " + apiResult.categoryName;
      catTag.title = "AI 识别品类（置信度 " + apiResult.confidence + "%）";
      container.appendChild(catTag);
    }

    // AI 识别分区标签
    if (apiResult && apiResult.zone) {
      var zoneTag = document.createElement("span");
      zoneTag.className = "feature-tag";
      zoneTag.style.background = "#ede9fe";
      zoneTag.style.color = "#6d28d9";
      zoneTag.textContent = "📍 " + apiResult.zone;
      zoneTag.title = "AI 自动分配分区";
      container.appendChild(zoneTag);
    }

    // 花纹标签
    if (patternInfo) {
      var patTag = document.createElement("span");
      patTag.className = "feature-tag pattern";
      var patLabel = patternInfo.type;
      if (patternInfo.fromApi) patLabel = "✓ " + patLabel;
      patTag.textContent = patLabel;
      if (patternInfo.fromApi) patTag.title = "AI 识别纹理";
      container.appendChild(patTag);
    }

    // 趋势匹配标签
    var trendTag = document.createElement("span");
    if (trendScore >= 70) {
      trendTag.className = "feature-tag trend";
      trendTag.textContent = "趋势 " + trendScore + "%";
    } else if (trendScore >= 50) {
      trendTag.className = "feature-tag";
      trendTag.textContent = "趋势 " + trendScore + "%";
    } else {
      trendTag.className = "feature-tag no-trend";
      trendTag.textContent = "趋势 " + trendScore + "%";
    }
    container.appendChild(trendTag);
  }


  /* ===================== 色环渲染 ===================== */

  function renderColorWheel(canvas, colors, centerLabelId, tooltipId) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width;
    var H = canvas.height;
    var cx = W / 2;
    var cy = H / 2;
    var outerR = W / 2 - 8;
    var innerR = outerR * 0.55;

    ctx.clearRect(0, 0, W, H);

    // 绘制色环（HSL hue ring）
    var segments = 360;
    var segAngle = (Math.PI * 2) / segments;

    for (var si = 0; si < segments; si++) {
      var hueDeg = si;
      var startAngle = (hueDeg - 90) * Math.PI / 180 - segAngle / 2;
      var endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = "hsl(" + hueDeg + ", 100%, 50%)";
      ctx.fill();
    }

    // 绘制内圈遮罩（让色环变成甜甜圈）
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // 外边框
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = "#e0ddd7";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内边框
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = "#e0ddd7";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 中心文字
    var centerLabel = document.getElementById(centerLabelId);

    // 绘制提取颜色标记
    var tooltip = document.getElementById(tooltipId);
    var markers = [];

    for (var ci = 0; ci < colors.length; ci++) {
      var col = colors[ci];
      var angle = (col.h - 90) * Math.PI / 180;
      // 饱和度越高越靠外环，越低越靠内环
      var sNorm = Math.max(col.s, 15) / 100;
      var ringPos = innerR + (outerR - innerR) * sNorm;

      var mx = cx + Math.cos(angle) * ringPos;
      var my = cy + Math.sin(angle) * ringPos;

      // 外发光
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();

      // 标记圆点
      ctx.beginPath();
      ctx.arc(mx, my, 10, 0, Math.PI * 2);
      ctx.fillStyle = col.hex;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // 百分比文字
      if (col.pct > 3) {
        ctx.fillStyle = col.l > 55 ? "#333" : "#fff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Math.round(col.pct) + "%", mx, my);
      }

      markers.push({ x: mx, y: my, color: col });
    }

    // 设置中心标签为主色
    if (colors.length > 0 && centerLabel) {
      var dominant = colors[0];
      centerLabel.innerHTML =
        '<div class="hue-name">' + hueName(dominant.h) + '</div>' +
        '<div class="hex-code">' + dominant.hex + '</div>';
    }

    // 交互：鼠标悬停显示颜色信息
    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = W / rect.width;
      var scaleY = H / rect.height;
      var px = (e.clientX - rect.left) * scaleX;
      var py = (e.clientY - rect.top) * scaleY;

      var hit = null;
      for (var i = 0; i < markers.length; i++) {
        var mk = markers[i];
        var dx = px - mk.x;
        var dy = py - mk.y;
        if (dx * dx + dy * dy < 196) { // 14^2
          hit = mk;
          break;
        }
      }

      if (hit) {
        tooltip.style.display = "block";
        tooltip.style.left = (hit.x / scaleX) + "px";
        tooltip.style.top = (hit.y / scaleY) + "px";
        tooltip.textContent = hit.color.hex + " · " + Math.round(hit.color.pct) + "%";
        canvas.style.cursor = "pointer";
      } else {
        tooltip.style.display = "none";
        canvas.style.cursor = "crosshair";
      }
    }

    function onLeave() {
      tooltip.style.display = "none";
    }

    canvas.onmousemove = onMove;
    canvas.onmouseleave = onLeave;
  }

  /* ===================== 色板渲染 ===================== */

  function renderPalette(container, colors) {
    container.innerHTML = "";
    for (var i = 0; i < colors.length; i++) {
      (function (col) {
        var swatch = document.createElement("div");
        swatch.className = "palette-swatch";

        var colorDiv = document.createElement("div");
        colorDiv.className = "swatch-color";
        colorDiv.style.background = col.hex;

        var hexDiv = document.createElement("div");
        hexDiv.className = "swatch-hex";
        hexDiv.textContent = col.hex;

        var pctDiv = document.createElement("div");
        pctDiv.className = "swatch-pct";
        pctDiv.textContent = Math.round(col.pct) + "%";

        swatch.appendChild(colorDiv);
        swatch.appendChild(hexDiv);
        swatch.appendChild(pctDiv);

        swatch.title = "点击复制 " + col.hex;
        swatch.onclick = function () {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(col.hex).then(function () {
              hexDiv.textContent = "已复制!";
              setTimeout(function () { hexDiv.textContent = col.hex; }, 1200);
            });
          }
        };

        container.appendChild(swatch);
      })(colors[i]);
    }
  }

  /* ===================== 图片上传 & 分析流程 ===================== */

  // ===== 动态服装卡片系统 =====

  // 递归防护计数器
  var _createUploadCardDepth = 0;

  // 创建一个上传卡片
  function createUploadCard(itemId, group) {
    _createUploadCardDepth++;
    if (_createUploadCardDepth > 50) {
      console.error("createUploadCard recursion detected! depth:", _createUploadCardDepth, "itemId:", itemId, "group:", group);
      _createUploadCardDepth = 0;
      throw new Error("createUploadCard stack overflow prevented");
    }
    try {
    group = group || "clothing";
    var card = document.createElement("div");
    card.className = "upload-card";
    card.setAttribute("data-item-id", itemId);
    card.setAttribute("data-group", group);

    // 品类选择器（顶部标签位置）
    var label = document.createElement("span");
    label.className = "upload-label";
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.justifyContent = "space-between";
    label.style.gap = "8px";
    label.innerHTML = '<span class="item-index">单品 ' + itemId + '</span>';
    card.appendChild(label);

    // 品类标签条（在卡片最顶部）
    var mCatLabel = document.createElement("div");
    mCatLabel.className = "card-category";
    mCatLabel.textContent = "点击选品类";
    mCatLabel.addEventListener("click", function (e) {
      e.stopPropagation();
      if (typeof openCategoryPicker === "function") {
        openCategoryPicker(itemId);
      }
    });
    card.insertBefore(mCatLabel, label);

    // 上传区
    var zone = document.createElement("div");
    zone.className = "upload-zone";
    zone.id = "zone-" + itemId;

    var placeholder = document.createElement("div");
    placeholder.className = "upload-placeholder";
    placeholder.id = "placeholder-" + itemId;
    placeholder.innerHTML = '<div class="add-icon">+</div>';
    zone.appendChild(placeholder);

    var preview = document.createElement("img");
    preview.id = "preview-" + itemId;
    preview.alt = "预览图";
    preview.style.display = "none";
    zone.appendChild(preview);

    card.appendChild(zone);

    // 文件信息
    var info = document.createElement("div");
    info.className = "file-info";
    info.id = "info-" + itemId;
    card.appendChild(info);

    // 色彩分析区
    var analysis = document.createElement("div");
    analysis.className = "color-analysis";
    analysis.id = "analysis-" + itemId;
    analysis.innerHTML =
      '<div class="analysis-title">服装特征分析</div>' +
      '<div class="feature-tags" id="features-' + itemId + '"></div>' +
      '<div class="analysis-title" style="margin-top:6px;">主色提取</div>' +
      '<div class="color-palette" id="palette-' + itemId + '"></div>';
    card.appendChild(analysis);

    // 事件绑定
    (function (id, z, prev, ph, grp) {
      // 点击空卡片打开上传弹窗
      z.addEventListener("click", function () {
        var currentItem = getItemById(id);
        if (!currentItem || !currentItem.imgData) {
          if (typeof openUploadModal === "function") {
            openUploadModal(grp, id);
          }
        }
      });
      // 拖拽上传
      z.addEventListener("dragover", function (e) {
        e.preventDefault();
        z.classList.add("dragover");
      });
      z.addEventListener("dragleave", function () {
        z.classList.remove("dragover");
      });
      z.addEventListener("drop", function (e) {
        e.preventDefault();
        z.classList.remove("dragover");
        var file = e.dataTransfer.files[0];
        if (file && file.type.indexOf("image/") === 0) {
          if (typeof handleImageFile === "function") {
            handleImageFile(file, grp);
          }
        }
      });
    })(itemId, zone, preview, placeholder, group);

    // 删除按钮（浮动在右上角）
    var mDelBtn = document.createElement("div");
    mDelBtn.className = "card-delete";
    mDelBtn.textContent = "×";
    mDelBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      removeItem(itemId);
      if (typeof updateCounts === "function") updateCounts();
      if (typeof updateAnalyzeButton === "function") updateAnalyzeButton();
      if (typeof saveWardrobe === "function") saveWardrobe();
    });
    card.appendChild(mDelBtn);

    return card;
    } finally {
      _createUploadCardDepth--;
    }
  }

  // 处理服装图片上传
  function handleItemFile(file, itemId, preview, placeholder, zone, info, analysis) {
    if (file.type.indexOf("image/") !== 0) {
      alert("请选择图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("图片大小不能超过 10MB");
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
      placeholder.style.display = "none";
      zone.classList.add("has-image");

      // 更新 state
      var item = getItemById(itemId);
      if (item) {
        item.imgData = e.target.result;
      }

      info.textContent = file.name + " · " + formatSize(file.size);
      info.classList.add("visible");

      // 显示加载状态
      analysis.classList.add("visible");
      var palette = document.getElementById("palette-" + itemId);
      var featuresEl = document.getElementById("features-" + itemId);
      featuresEl.innerHTML = '<span class="extracting" style="font-size:11px;color:var(--text-muted);">分析中...</span>';
      palette.innerHTML = '<div class="extracting"><span class="spinner"></span>正在提取颜色...</div>';

      preview.onload = function () {
        setTimeout(function () {
          var colors = extractColors(preview);
          if (item) item.colors = colors;
          if (colors.length > 0) {
            renderPalette(palette, colors);

            // 分析花纹特征（本地算法）
            var patternInfo = analyzePattern(preview, colors);
            if (item) item.pattern = patternInfo;

            // 分析趋势匹配度
            var trendScore = calculateItemTrendScore(colors, patternInfo);
            if (item) item.trendScore = trendScore;
            if (item) item.isTrendy = trendScore >= 50;

            // 渲染初始特征标签
            renderFeatureTags(featuresEl, patternInfo, trendScore, null);
          } else {
            palette.innerHTML = '<div class="extracting">未检测到有效颜色</div>';
            featuresEl.innerHTML = '';
          }
          updateAnalyzeButton();
        }, 100);
      };
    };
    reader.readAsDataURL(file);
  }

  // 根据 ID 获取服装
  function getItemById(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  // 添加新服装
  function addItem(group) {
    group = group || "clothing";
    var itemId = state.nextId++;
    // 获取该分组的默认品类
    var groupCats = getAllCategories().filter(function (c) { return c.group === group && !c.custom; });
    var defaultCat = groupCats.length > 0 ? groupCats[0].value : "other";

    var item = {
      id: itemId,
      imgData: null,
      colors: null,
      category: defaultCat,
      group: group
    };
    state.items.push(item);

    var card = createUploadCard(itemId, group);
    var gridId = group === "accessory" ? "accessoryGrid" : "clothingGrid";
    var grid = document.getElementById(gridId);
    // 找到该区块中的添加卡片，插入到它前面
    var addCards = grid.querySelectorAll(".add-card");
    if (addCards.length > 0) {
      grid.insertBefore(card, addCards[0]);
    } else {
      grid.appendChild(card);
    }

    // 更新区块内的序号
    updateGroupItemIndexes(group);

    updateAnalyzeButton();
    return itemId;
  }

  // 更新某个区块内的服装序号
  function updateGroupItemIndexes(group) {
    var gridId = group === "accessory" ? "accessoryGrid" : "clothingGrid";
    var grid = document.getElementById(gridId);
    var cards = grid.querySelectorAll('.upload-card[data-item-id]');
    for (var i = 0; i < cards.length; i++) {
      var idxEl = cards[i].querySelector(".item-index");
      if (idxEl) {
        var groupLabel = group === "accessory" ? "配饰 " : "服装 ";
        idxEl.textContent = groupLabel + (i + 1);
      }
    }
  }

  // 移除服装
  function removeItem(itemId) {
    // 找到服装所在分组
    var group = "clothing";
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === itemId) {
        group = state.items[i].group || "clothing";
        state.items.splice(i, 1);
        break;
      }
    }
    // 从 DOM 中移除
    var card = document.querySelector('.upload-card[data-item-id="' + itemId + '"]');
    if (card) card.remove();

    // 更新对应区块内的序号
    updateGroupItemIndexes(group);

    // 隐藏结果
    var matchSection = document.getElementById("matchSection");
    if (matchSection) matchSection.classList.remove("visible");

    updateAnalyzeButton();
  }

  // 更新分析按钮状态（至少 1 件已完成颜色分析的服装即可）
  function updateAnalyzeButton() {
    var btn = document.getElementById("analyzeBtn");
    var readyClothing = 0;
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      if (it.colors && it.colors.length > 0 && isClothingItem(it)) readyClothing++;
    }
    btn.disabled = readyClothing < 1;
  }

  // 如果已有结果则刷新
  function refreshMatchIfNeeded() {
    var matchSection = document.getElementById("matchSection");
    if (matchSection && matchSection.classList.contains("visible")) {
      var result = generateCombinationsFromItems();
      renderMatchGrid(result.combos, result.filterInfo);
    }
  }

  // （旧的桌面版添加按钮已移除，使用下方的移动端上传弹窗流程）

  // ===== API 设置面板交互 =====
  loadApiConfig();

  // 性别切换
  var maleBtn = document.getElementById("maleBtn");
  var femaleBtn = document.getElementById("femaleBtn");

  function setGender(gender) {
    if (state.gender === gender) {
      // 再次点击取消选择，进入百搭模式
      state.gender = null;
      maleBtn.classList.remove("active", "male");
      femaleBtn.classList.remove("active", "female");
    } else {
      state.gender = gender;
      maleBtn.classList.remove("active", "male");
      femaleBtn.classList.remove("active", "female");
      if (gender === "male") maleBtn.classList.add("active", "male");
      if (gender === "female") femaleBtn.classList.add("active", "female");
    }
    updateMatchTitle();
    // 如果已有结果，重新生成
    refreshMatchIfNeeded();
  }

  maleBtn.addEventListener("click", function () { setGender("male"); });
  femaleBtn.addEventListener("click", function () { setGender("female"); });

  // 年龄切换
  var studentBtn = document.getElementById("studentBtn");
  var workerBtn = document.getElementById("workerBtn");
  var middleBtn = document.getElementById("middleBtn");

  function setAge(age) {
    if (state.age === age) {
      // 再次点击取消选择
      state.age = null;
      studentBtn.classList.remove("active", "student");
      workerBtn.classList.remove("active", "worker");
      middleBtn.classList.remove("active", "middle");
    } else {
      state.age = age;
      studentBtn.classList.remove("active", "student");
      workerBtn.classList.remove("active", "worker");
      middleBtn.classList.remove("active", "middle");
      if (age === "student") studentBtn.classList.add("active", "student");
      if (age === "worker") workerBtn.classList.add("active", "worker");
      if (age === "middle") middleBtn.classList.add("active", "middle");
    }
    updateMatchTitle();
    // 如果已有结果，重新生成
    refreshMatchIfNeeded();
  }

  middleBtn.addEventListener("click", function () { setAge("middle"); });
  workerBtn.addEventListener("click", function () { setAge("worker"); });
  studentBtn.addEventListener("click", function () { setAge("student"); });

  // 尺码切换
  var sizeBtns = document.querySelectorAll(".size-btn");
  function setSize(size) {
    if (state.size === size) {
      // 再次点击取消
      state.size = null;
      sizeBtns.forEach(function (btn) { btn.classList.remove("active"); });
    } else {
      state.size = size;
      sizeBtns.forEach(function (btn) {
        btn.classList.remove("active");
        if (btn.dataset.size === size) btn.classList.add("active");
      });
    }
    updateMatchTitle();
    // 如果已有结果，重新生成
    refreshMatchIfNeeded();
  }

  sizeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { setSize(this.dataset.size); });
  });

  // 场合切换
  var occasionBtns = document.querySelectorAll(".occasion-btn");
  var OCCASION_LABELS = {
    business: "商务沙龙", dinner: "家庭聚餐", party: "朋友聚会",
    date: "约会", work: "日常工作", home: "居家", travel: "旅游"
  };
  function setOccasion(occ) {
    if (state.occasion === occ) {
      state.occasion = null;
      occasionBtns.forEach(function (btn) { btn.classList.remove("active"); });
    } else {
      state.occasion = occ;
      occasionBtns.forEach(function (btn) {
        btn.classList.remove("active");
        if (btn.dataset.occasion === occ) btn.classList.add("active");
      });
    }
    updateMatchTitle();
    refreshMatchIfNeeded();
  }
  occasionBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { setOccasion(this.dataset.occasion); });
  });

  // 季节切换
  var seasonBtns = document.querySelectorAll(".season-btn");
  var SEASON_LABELS = { spring: "春季", summer: "夏季", autumn: "秋季", winter: "冬季" };
  function setSeason(season) {
    if (state.season === season) {
      state.season = null;
      seasonBtns.forEach(function (btn) { btn.classList.remove("active"); });
    } else {
      state.season = season;
      seasonBtns.forEach(function (btn) {
        btn.classList.remove("active");
        if (btn.dataset.season === season) btn.classList.add("active");
      });
    }
    updateMatchTitle();
    refreshMatchIfNeeded();
  }


// ===== 导出公共 API =====
global.XuanYiLuCore = {
  // 状态
  state: state,
  CURRENT_COLOR_VERSION: CURRENT_COLOR_VERSION,
  
  // 颜色提取
  extractColors: extractColors,
  
  // 色彩工具
  rgbToHsl: rgbToHsl,
  hslToRgb: hslToRgb,
  hueDistance: hueDistance,
  isNeutral: isNeutral,
  
  // 搭配生成
  generateCombinations: generateCombinations,
  
  // 大模型接口
  buildAIContext: buildAIContext,
  callAIOutfit: callAIOutfit,
  isAIOutfitReady: isAIOutfitReady,
  
  // 设置函数
  setGender: setGender,
  setAge: setAge,
  setSize: setSize,
  setOccasion: setOccasion,
  setSeason: setSeason
};

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
