<template>
  <view class="gicon">
<!--    <view :style="'font-family: iconfont;font-size:' + size + 'rpx;color:' + color">{{name}}</view>-->
    <view :class="getClass" :style="'font-size:' + size + 'rpx;color:' + color"></view>
  </view>
</template>
<script setup>
// 引入 css

import '/src/static/icon/iconfont.css';
import {defineProps, computed} from "vue";
const props = defineProps({
  name: {
    type: String,
    default: ""
  },
  size: {
    type: Number,
    default: 30
  },
  color: {
    type: String,
    default: "black"
  }
})
const getClass = computed(() => {
  return 'icon iconfont ' + props.name
});
</script>
<style lang="scss" scoped>
</style>