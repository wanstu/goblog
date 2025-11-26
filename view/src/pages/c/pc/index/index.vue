<template>
  <view class="container">
    <view class="mask">
      <view class="content">
        <view class="time-box">
          <view class="line">
            <view class="time">
              {{ timeStr }}
            </view>
          </view>
          <view class="line">
            <view class="date">
              {{ dateStr }}
            </view>
            <view class="week-day">
              {{ weekDayStr }}
            </view>
          </view>
        </view>
        <view class="search-box">
          <view class="search-engine">
            <uni-data-select
                class="select"
                :clear="false"
                mode="none"
                v-model="searchEngine"
                :localdata="engineList"
                @change="changeEngine"
            >
            </uni-data-select>
          </view>
          <view class="search-input">
            <input
                class="input"
                :focus="inputFocus"
                @keyup.enter="searchQuery"
                @keydown.enter="searchQuery"
                @blur="() => {inputFocus = false}"
                v-model="query"
                placeholder="请输入搜索内容"
            />

          </view>
          <view class="search-btn" @click="searchQuery">
            <uni-icons type="search" size="30"></uni-icons>
          </view>
        </view>
        <view class="menu-list">
          <view v-for="item in menuList" :key="item.title" class="menu-item">
            <a :href="item.link" target="_blank" :title="item.desc">
              <view class="menu-cover">
                <view v-if="item.cover.type === 'icon'" class="iconfont">
                  <gicon :name="item.cover.value" :size="200" :color="item.cover.color"></gicon>
                </view>
              </view>
              <view class="menu-title" :style="'color:' + item.color">
                {{item.title}}
              </view>
            </a>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import dayjs from "dayjs";
import {computed, ref, reactive, onMounted, nextTick} from "vue";
import {onLoad} from "@dcloudio/uni-app";
import common from "@/api/common.js";
import gicon from "@/components/gicon.vue";

onLoad(() => {
  init()
  common.hello()
})

const menuList = reactive([
  {
    title: "blog",
    color: "rgb(45, 51, 47)",
    cover: {
      type: 'icon',
      color: "rgb(66, 72, 69)",
      value: "blog"
    },
    link: "https://blog.wanstu.cn",
    desc: "个人博客，记录学习、工作、生活中的点滴"
  },
  {
    title: "哔哩哔哩",
    color: "rgb(45, 51, 47)",
    cover: {
    type: 'icon',
      color: "rgb(66, 72, 69)",
      value: "bilibili-line"
    },
    link: "https://www.bilibili.com",
    desc: "哔哩哔哩 (゜-゜)つロ 干杯~-bilibili"
  }
]);
const pcPath = "/static/wallpaper/pc/"
const weekDayStyleType = 1 // 1: 星期 2: 周 3: 英文
const wallpaperList = [
  {
    url: 'url(' + pcPath + '3c864d5f80be61addac66938d5e2a6244ab48304.jpg)'
  }
]
const engineList = [
  {
    value: 0,
    text: "bing",
    searchLink: "https://cn.bing.com/search?q="
  },
  {
    value: 1,
    text: "google",
    searchLink: "https://www.google.com/search?q="
  },
  {
    value: 2,
    text: "duckduckgo",
    searchLink: "https://duckduckgo.com?q="
  },
  {
    value: 3,
    text: "baidu",
    searchLink: "https://www.baidu.com/s?&wd="
  },
]
const engineLinkMap = []
engineList.map((item) => {
  engineLinkMap[item.value] = item.searchLink
})

const inputFocus = ref(true)
const wallpaperUrl = ref('')
const time = ref('')
const query = ref('')
const searchEngine = ref(engineList[0].value)

onMounted(() => {
  inputSetFocus(true)
})

document.addEventListener('keydown', function(event) {
  // 检查是否是 Tab 键
  if (event.key === 'Tab') {
    event.preventDefault()
    if(inputFocus.value) {
      nextEngine()
    }
    inputSetFocus(true)
  }
});


const inputSetFocus = async (e) => {
  await new Promise((resolve) => {
    inputFocus.value = !e
    nextTick(() => {
      inputFocus.value = e
      resolve()
    })
  })
}

const changeEngine = (e) => {
  searchEngine.value = e
  inputSetFocus(true)
}
const nextEngine = () => {
  searchEngine.value = (searchEngine.value + 1) % engineList.length
  inputSetFocus(true)
}

const searchQuery = () => {
  if (query.value) {
    uni.showToast({
      title: '搜索：' + query.value
    })
    const searchLink = engineLinkMap[searchEngine.value]
    if (searchLink) {
      window.open(searchLink + query.value)
    }
  }else {
    uni.showToast({
      title: '请输入搜索内容',
      icon: 'error'
    })
  }
}

const init = () => {
  timeChange()
  wallpaperChange()
}

const timeChange = () => {
  time.value = dayjs()
  setInterval(() => {
    time.value = dayjs()
  }, 1000)
}
const wallpaperChange = () => {
  randomWallpaper()
  setInterval(() => {
    randomWallpaper()
  }, 1000 * 10)
}

const randomWallpaper = () => {
  const randomIndex = Math.floor(Math.random() * wallpaperList.length)
  const randomWallpaper = wallpaperList[randomIndex]
  // 设置背景图
  wallpaperUrl.value = randomWallpaper.url

}

const dateStr = computed(() => {
  return dayjs(time.value).format("YYYY年MM月DD日")
})
const timeStr = computed(() => {
  return dayjs(time.value).format("HH:mm:ss")
})

const weekDayStr = computed(() => {
  const weekDay = dayjs(time.value).format("dddd")
  if (weekDayStyleType === 3) {
    return weekDay
  }

  let weekDayStr = ''
  switch (weekDay) {
    case "Sunday":
      weekDayStr = "日"
      break;
    case "Monday":
      weekDayStr = "一"
      break;
    case "Tuesday":
      weekDayStr = "二"
      break;
    case "Wednesday":
      weekDayStr = "三"
      break;
    case "Thursday":
      weekDayStr = "四"
      break;
    case "Friday":
      weekDayStr = "五"
      break;
    case "Saturday":
      weekDayStr = "六"
      break;
  }

  if (weekDayStyleType === 1) {
    weekDayStr = "星期" + weekDayStr
  }else if (weekDayStyleType === 2) {
    weekDayStr = "周" + weekDayStr
  }

  return weekDayStr
})
</script>

<style lang="scss" scoped>
.container {
  background: v-bind(wallpaperUrl) no-repeat center center / cover;
  width: 100%;
  height: 100vh;
  position: absolute;
  left: 0;
  top: 0;
  .mask {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
  }
  .content {
    width: 88%;
    height: 80%;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.09);
    //backdrop-filter: blur(2px);
    border-radius: 5rpx;

    .time-box {
      color: #fff;
      //color: #39c5bb;
      width: 600rpx;
      margin: 100rpx auto 0;
      .line {
        display: flex;
        justify-content: space-around;
      }
      .time {
        font-size: 200rpx;
        font-family: 'UnidreamLED',serif;
      }
      .date {
        font-size: 40rpx;
        font-weight: bold;
      }
      .week-day {
        font-size: 40rpx;
        font-weight: bold;
      }
    }

    .search-box {
      display: flex;
      width: 40%;
      height: 100rpx;
      border-radius: 50rpx;
      margin: 100rpx auto 0;
      justify-content: space-around;
      background: #fff;
      padding: 0 40rpx;
      gap: 10rpx;
      .search-engine {
        width: 280rpx;
        height: 100%;
        font-weight: bold;
        .select {
          border-radius: 50rpx;
          height: 100%;
          border: none;
        }
      }
      .search-input {
        width: 100%;
        height: 100%;
        .input {
          height: 100%;
        }
      }
      .search-btn {
        cursor: pointer;
      }
    }

    .menu-list {
      width: 50%;
      height: 100%;
      display: flex;
      margin: 0 auto;
      padding: 100rpx 200rpx;
      gap: 10rpx;
      .menu-item:hover {
        transform: scale(1.03);
      }
      .menu-item:hover .menu-cover{
        //border: 5rpx solid rgba(57, 197, 187, 0.5);
        //box-shadow: 0 2px 2px 0 rgba(57, 197, 187, 0.3);
        box-shadow: 0 2px 2px 0 rgba(0,0,0,0.12), 0 3px 1px -2px rgba(0,0,0,0.06), 0 1px 5px 0 rgba(0,0,0,0.12), 0 -1px 0.5px 0 rgba(0,0,0,0.09);
      }
      a {
        text-decoration: none;
        &:visited {
          color: inherit; /* 访问后颜色 */
        }
        &:hover {
          color: inherit; /* 悬停时颜色 */
        }
        &:active {
          color: inherit; /* 点击时颜色 */
        }
      }
      .menu-item {
        cursor: pointer;
        width: 200rpx;
        height: 240rpx;
        .menu-cover {
          overflow: hidden;
          border-radius: 10rpx;
          width: 200rpx;
          height: 200rpx;
          background: rgba(255, 255, 255, 0.2);
        }
        .menu-title {
          text-align: center;
          color: #fff;
        }

      }
    }
  }
}
</style>
