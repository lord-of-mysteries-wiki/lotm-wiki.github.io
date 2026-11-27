// 途径唯一配色源：常规途径以已审阅的原夜间主色为基准。
// 核对记录：docs/途径官方彩色标识核对.md；day/night 是主题变体，不是主辅色。
const pathwayPalette = {
  "占卜家": {
    "day": "#B99AE4",
    "night": "#B99AE4"
  },
  "学徒": {
    "day": "#71DAF2",
    "night": "#71DAF2"
  },
  "偷盗者": {
    "day": "#626B53",
    "night": "#E2E3D5"
  },
  "秘祈人": {
    "day": "#F17A76",
    "night": "#F17A76"
  },
  "观众": {
    "day": "#C2D7EC",
    "night": "#C2D7EC"
  },
  "水手": {
    "day": "#89B9FF",
    "night": "#89B9FF"
  },
  "歌颂者": {
    "day": "#FFE078",
    "night": "#FFE078"
  },
  "阅读者": {
    "day": "#B2B8FF",
    "night": "#B2B8FF"
  },
  "不眠者": {
    "day": "#C5DDFF",
    "night": "#C5DDFF"
  },
  "收尸人": {
    "day": "#DFE7BD",
    "night": "#DFE7BD"
  },
  "战士": {
    "day": "#F4AD69",
    "night": "#F4AD69"
  },
  "耕种者": {
    "day": "#8AE2BC",
    "night": "#8AE2BC"
  },
  "药师": {
    "day": "#F397A8",
    "night": "#F397A8"
  },
  "仲裁人": {
    "day": "#F1C765",
    "night": "#F1C765"
  },
  "律师": {
    "day": "#8CA8FF",
    "night": "#8CA8FF"
  },
  "猎人": {
    "day": "#FF8170",
    "night": "#FF8170"
  },
  "刺客": {
    "day": "#F7A3E0",
    "night": "#F7A3E0"
  },
  "罪犯": {
    "day": "#FF896C",
    "night": "#FF896C"
  },
  "囚犯": {
    "day": "#C9B5EC",
    "night": "#C9B5EC"
  },
  "窥秘人": {
    "day": "#C597FF",
    "night": "#C597FF"
  },
  "通识者": {
    "day": "#F5C17B",
    "night": "#F5C17B"
  },
  "怪物": {
    "day": "#9ADFF0",
    "night": "#9ADFF0"
  },
  "恶棍": {
    "day": "#BA3736",
    "night": "#BA3736"
  },
  "掮客": {
    "day": "#C2C6C4",
    "night": "#C2C6C4"
  },
  "吝啬鬼": {
    "day": "#2C6A53",
    "night": "#2C6A53"
  },
  "舞蹈家": {
    "day": "#9DA7AA",
    "night": "#9DA7AA"
  },
  "失梦人": {
    "day": "#E0E2DD",
    "night": "#E0E2DD"
  },
  "天文爱好者": {
    "day": "#1F6CA5",
    "night": "#1F6CA5"
  },
  "流浪汉": {
    "day": "#242127",
    "night": "#242127"
  },
  "萨满": {
    "day": "#8F5CC0",
    "night": "#8F5CC0"
  },
  "入门者": {
    "day": "#798F88",
    "night": "#798F88"
  },
  "病患": {
    "day": "#2F6846",
    "night": "#2F6846"
  }
};

function pathwayPrimary(name, theme = 'day') {
  return pathwayPalette[name]?.[theme === 'night' ? 'night' : 'day'] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { pathwayPalette, pathwayPrimary };
}
