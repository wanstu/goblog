<template>
  <view class="gicon">
    <view :style="'font-family: iconfont;font-size:' + size + 'rpx;color:' + color">{{name}}</view>
  </view>
</template>
<script setup>
import {defineProps} from "vue";
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
</script>
<style lang="scss" scoped>
</style>