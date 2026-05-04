<template>
  <!-- 图片裁剪弹窗：拖动裁剪框或四角/四边手柄调整范围，确认后回传裁剪区域 -->
  <view v-if="visible" class="crop-overlay" @click.self="$emit('close')">
    <view class="crop-box">
      <view class="crop-header">
        <text class="crop-title">裁剪图片</text>
        <text class="crop-desc">拖动边框或四角手柄调整裁剪范围，确定后按裁剪后保存</text>
      </view>

      <view class="crop-canvas" ref="canvasRef">
        <image v-if="imageUrl" :src="imageUrl" mode="widthFix" class="crop-image" @load="onImageLoad" />
        <!-- 遮罩层（裁剪框外的半透明区域） -->
        <view class="crop-mask-top" :style="maskTopStyle"></view>
        <view class="crop-mask-bottom" :style="maskBottomStyle"></view>
        <view class="crop-mask-left" :style="maskLeftStyle"></view>
        <view class="crop-mask-right" :style="maskRightStyle"></view>
        <!-- 裁剪框本身可拖动 -->
        <view class="crop-frame" :style="cropFrameStyle" @mousedown.stop="onFrameDragStart" @touchstart.stop.prevent="onFrameDragStart">
          <!-- 网格辅助线 -->
          <view class="crop-grid-h1"></view>
          <view class="crop-grid-h2"></view>
          <view class="crop-grid-v1"></view>
          <view class="crop-grid-v2"></view>
          <!-- 8个拖拽手柄（四角 + 四边中点） -->
          <view class="crop-handle corner tl" @mousedown.stop="onResizeStart($event,'tl')" @touchstart.stop.prevent="onResizeStart($event,'tl')"></view>
          <view class="crop-handle corner tr" @mousedown.stop="onResizeStart($event,'tr')" @touchstart.stop.prevent="onResizeStart($event,'tr')"></view>
          <view class="crop-handle corner bl" @mousedown.stop="onResizeStart($event,'bl')" @touchstart.stop.prevent="onResizeStart($event,'bl')"></view>
          <view class="crop-handle corner br" @mousedown.stop="onResizeStart($event,'br')" @touchstart.stop.prevent="onResizeStart($event,'br')"></view>
          <view class="crop-handle edge top" @mousedown.stop="onResizeStart($event,'top')" @touchstart.stop.prevent="onResizeStart($event,'top')"></view>
          <view class="crop-handle edge bottom" @mousedown.stop="onResizeStart($event,'bottom')" @touchstart.stop.prevent="onResizeStart($event,'bottom')"></view>
          <view class="crop-handle edge left" @mousedown.stop="onResizeStart($event,'left')" @touchstart.stop.prevent="onResizeStart($event,'left')"></view>
          <view class="crop-handle edge right" @mousedown.stop="onResizeStart($event,'right')" @touchstart.stop.prevent="onResizeStart($event,'right')"></view>
        </view>
      </view>

      <view class="crop-footer">
        <button class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="confirm">确定裁剪</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
})
const emit = defineEmits(['close', 'confirm'])

const canvasRef = ref(null)

// 裁剪框相对容器比例（0~1），默认 80% 居中
const crop = reactive({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })

// ---- 裁剪框整体拖动 ----
let dragState = null // { type:'move'|'resize', startX, startY, cropX, cropY, cropW, cropH, handle }
const MIN_SIZE = 0.05

function getXY(e) {
  const evt = e.touches ? e.touches[0] : e
  return { x: evt.clientX, y: evt.clientY }
}

function onFrameDragStart(e) {
  const pos = getXY(e)
  dragState = { type: 'move', startX: pos.x, startY: pos.y, cropX: crop.x, cropY: crop.y, cropW: crop.w, cropH: crop.h }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

function onResizeStart(e, handle) {
  e.stopPropagation()
  const pos = getXY(e)
  dragState = { type: 'resize', startX: pos.x, startY: pos.y, cropX: crop.x, cropY: crop.y, cropW: crop.w, cropH: crop.h, handle }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

function onDrag(e) {
  if (!dragState) return
  const pos = getXY(e)
  const el = canvasRef.value?.$el || canvasRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const dx = (pos.x - dragState.startX) / rect.width
  const dy = (pos.y - dragState.startY) / rect.height

  if (dragState.type === 'move') {
    // 整体移动裁剪框
    crop.x = Math.max(0, Math.min(dragState.cropX + dx, 1 - crop.w))
    crop.y = Math.max(0, Math.min(dragState.cropY + dy, 1 - crop.h))
  } else {
    // 拖拽手柄调整大小
    let { cropX: x, cropY: y, cropW: w, cropH: h } = dragState
    switch (dragState.handle) {
      case 'tl': x += dx; y += dy; w -= dx; h -= dy; break
      case 'tr': y += dy; w += dx; h -= dy; break
      case 'bl': x += dx; w -= dx; h += dy; break
      case 'br': w += dx; h += dy; break
      case 'top': y += dy; h -= dy; break
      case 'bottom': h += dy; break
      case 'left': x += dx; w -= dx; break
      case 'right': w += dx; break
    }
    // 约束边界
    if (w >= MIN_SIZE && h >= MIN_SIZE) {
      crop.x = Math.max(0, Math.min(x, 1 - w))
      crop.y = Math.max(0, Math.min(y, 1 - h))
      crop.w = Math.min(w, 1 - crop.x)
      crop.h = Math.min(h, 1 - crop.y)
    }
  }
}

function onDragEnd() {
  dragState = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', onDragEnd)
}

// ---- 计算样式 ----
const cropFrameStyle = computed(() => ({
  left: (crop.x * 100) + '%',
  top: (crop.y * 100) + '%',
  width: (crop.w * 100) + '%',
  height: (crop.h * 100) + '%',
}))
const maskTopStyle = computed(() => ({ height: (crop.y * 100) + '%' }))
const maskBottomStyle = computed(() => ({ top: ((crop.y + crop.h) * 100) + '%' }))
const maskLeftStyle = computed(() => ({
  top: (crop.y * 100) + '%', height: (crop.h * 100) + '%', width: (crop.x * 100) + '%',
}))
const maskRightStyle = computed(() => ({
  top: (crop.y * 100) + '%', height: (crop.h * 100) + '%', left: ((crop.x + crop.w) * 100) + '%',
}))

function confirm() {
  emit('confirm', { ...crop })
}
</script>

<style lang="scss" scoped>
.crop-overlay {
  position: fixed; left: 0; top: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 3000;
}
.crop-box {
  width: 750rpx; max-height: 90vh;
  background: #fff; border-radius: 20rpx; padding: 40rpx;
}
.crop-header {
  margin-bottom: 20rpx;
  .crop-title { font-size: 34rpx; font-weight: bold; display: block; }
  .crop-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
}
.crop-canvas {
  position: relative; overflow: hidden;
  background: #333; border-radius: 10rpx;
  user-select: none;
  .crop-image { width: 100%; display: block; pointer-events: none; }
  .crop-mask-top, .crop-mask-bottom { position: absolute; left: 0; right: 0; background: rgba(0,0,0,0.55); }
  .crop-mask-top { top: 0; }
  .crop-mask-bottom { bottom: 0; }
  .crop-mask-left, .crop-mask-right { position: absolute; background: rgba(0,0,0,0.55); }
  .crop-mask-left { left: 0; }
  .crop-mask-right { right: 0; }
  .crop-frame {
    position: absolute;
    border: 2rpx solid rgba(255,255,255,0.9);
    box-shadow: 0 0 0 9999px rgba(0,0,0,0); /* 裁切框外透明 */
    z-index: 2; cursor: move;
    /* 九宫格辅助线 */
    .crop-grid-h1, .crop-grid-h2 {
      position: absolute; left: 0; right: 0;
      border-top: 1rpx solid rgba(255,255,255,0.3);
    }
    .crop-grid-h1 { top: 33.33%; }
    .crop-grid-h2 { top: 66.66%; }
    .crop-grid-v1, .crop-grid-v2 {
      position: absolute; top: 0; bottom: 0;
      border-left: 1rpx solid rgba(255,255,255,0.3);
    }
    .crop-grid-v1 { left: 33.33%; }
    .crop-grid-v2 { left: 66.66%; }
  }
  .crop-handle {
    position: absolute; z-index: 5;
    &.corner {
      width: 48rpx; height: 48rpx;
      background: #fff; border: 3rpx solid #007aff;
      &.tl { left: -24rpx; top: -24rpx; cursor: nw-resize; }
      &.tr { right: -24rpx; top: -24rpx; cursor: ne-resize; }
      &.bl { left: -24rpx; bottom: -24rpx; cursor: sw-resize; }
      &.br { right: -24rpx; bottom: -24rpx; cursor: se-resize; }
    }
    &.edge {
      background: rgba(255,255,255,0.8);
      border: 2rpx solid #007aff;
      &.top { left: 30%; right: 30%; top: -12rpx; height: 24rpx; cursor: n-resize; }
      &.bottom { left: 30%; right: 30%; bottom: -12rpx; height: 24rpx; cursor: s-resize; }
      &.left { top: 30%; bottom: 30%; left: -12rpx; width: 24rpx; cursor: w-resize; }
      &.right { top: 30%; bottom: 30%; right: -12rpx; width: 24rpx; cursor: e-resize; }
    }
  }
}
.crop-footer {
  display: flex; gap: 16rpx; justify-content: flex-end; margin-top: 30rpx;
  .btn { padding: 16rpx 36rpx; border-radius: 10rpx; font-size: 28rpx; border: none; cursor: pointer; }
  .btn-primary { background: #007aff; color: #fff; }
  .btn-cancel { background: #e5e5e5; color: #333; }
}
</style>
