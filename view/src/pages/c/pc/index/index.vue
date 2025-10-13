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
      </view>
    </view>
  </view>
</template>

<script setup>
import dayjs from "dayjs";
import {computed, ref, onMounted, nextTick} from "vue";
import {onLoad} from "@dcloudio/uni-app";
import common from "~/api/common";

onLoad(() => {
  init()
  common.hello()
})

const pcPath = "/static/wallpaper/pc/"
const weekDayStyleType = 1 // 1: 星期 2: 周 3: 英文
const wallpaperList = [
  {
    url: 'url(' + pcPath + '3c864d5f80be61addac66938d5e2a6244ab48304.jpg)'
  },
  // {
  //   url: 'url(' + pcPath + '367a093d90fd3ad56142ca9b5a9f562c30630294.jpg)'
  // },
  // {
  //   url: 'url(' + pcPath + '9558a3afa507a3d7a4a224c56696662d8c4855f3.jpg)'
  // },
  // {
  //   url: 'url(' + pcPath + 'eb618b48c4667105855341ce0b1fc44ee68445c6.jpg)'
  // },
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
  }
}
</style>
