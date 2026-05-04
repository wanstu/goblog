<template>
  <!-- 设置面板：API URL 配置、在线/离线模式、壁纸管理、存储用量、导入导出 -->
  <view v-if="visible" class="settings-overlay" @click.self="$emit('close')">
    <view class="settings-box">
      <view class="settings-header">
        <text class="settings-title">设置</text>
        <view class="settings-close" @click="$emit('close')">
          <uni-icons type="close" size="20"></uni-icons>
        </view>
      </view>

      <!-- API URL -->
      <view class="setting-section">
        <text class="section-title">API 地址</text>
        <view class="setting-row">
          <input class="setting-input" v-model="apiUrl" placeholder="http://localhost:7000" />
          <button class="btn-small btn-save" @click="saveApiUrl">保存</button>
        </view>
      </view>

      <!-- 在线/离线状态 -->
      <view class="setting-section">
        <text class="section-title">连接模式</text>
        <view class="setting-row">
          <text class="mode-text">
            当前: <text :class="isOnline ? 'mode-online' : 'mode-offline'">{{ isOnline ? '在线' : '离线' }}</text>
          </text>
          <button v-if="isOnline" class="btn-small btn-danger" @click="goOffline">切换离线</button>
          <button v-else class="btn-small btn-primary" @click="goOnline">切换在线</button>
        </view>
        <text v-if="errorText" class="error-text">{{ errorText }}</text>
        <text v-if="!isOnline" class="hint-text">
          离线模式下，新增/修改的数据仅保存在浏览器中。恢复在线后会自动提示合并数据。
        </text>
      </view>

      <!-- 壁纸管理 -->
      <view class="setting-section">
        <text class="section-title">壁纸管理</text>
        <view class="setting-row" style="margin-bottom: 12rpx;">
          <text class="hint-text">{{ wallpapers.length }} 张壁纸</text>
          <button class="btn-small btn-outline" @click="$emit('addWallpaper')">添加壁纸</button>
        </view>
        <!-- 壁纸网格预览 -->
        <view class="wallpaper-grid" v-if="wallpapers.length > 0">
          <view
              v-for="(wp, idx) in wallpapers"
              :key="idx"
              class="wallpaper-item"
              :class="{ active: selectedIdx === idx }"
              @click="selectWallpaper(idx)"
          >
            <!-- 壁纸缩略图 — 从 url(...) 中提取路径作为背景 -->
            <view class="wallpaper-thumb" :style="{ backgroundImage: wp.url }"></view>
            <view class="wallpaper-actions">
              <text v-if="selectedIdx === idx" class="wp-label current">当前</text>
              <text v-if="wp._local" class="wp-label local">本地</text>
              <button v-if="wallpapers.length > 1" class="btn-tiny btn-delete" @click.stop="deleteWallpaper(idx)">✕</button>
            </view>
          </view>
        </view>
        <text v-else class="hint-text">暂无壁纸，点击"添加壁纸"上传</text>
      </view>

      <!-- 存储用量 -->
      <view class="setting-section">
        <text class="section-title">浏览器存储</text>
        <view class="storage-bar">
          <view class="storage-fill" :style="{ width: usage.percent + '%' }"></view>
        </view>
        <text class="hint-text">已用 {{ usage.percent }}% (约 {{ (usage.used / 1024).toFixed(0) }} KB)</text>
        <button class="btn-small btn-danger" @click="clearData" style="margin-top: 10rpx;">清除全部缓存</button>
      </view>

      <!-- 导入导出 -->
      <view class="setting-section">
        <text class="section-title">备份</text>
        <view class="setting-row">
          <button class="btn-small btn-outline" @click="$emit('export')">导出数据</button>
          <button class="btn-small btn-outline" @click="$emit('import')">导入数据</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import config from '@/api/config.js'
import cache from '@/utils/cache.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  wallpaperVersion: { type: Number, default: 0 },  // 父组件触发刷新
})

const emit = defineEmits(['close', 'export', 'import', 'modeChange', 'wallpaperSelect', 'wallpaperChange', 'addWallpaper'])

// 表单数据
const apiUrl = ref(config.getApiUrl())
const isOnline = ref(config.isOnline())
const usage = ref(cache.getStorageUsage())
// 壁纸管理
const wallpapers = ref([])       // 壁纸列表
const selectedIdx = ref(-1)     // 当前选中壁纸索引

// 弹窗打开时刷新所有状态
watch(() => props.visible, async (v) => {
  if (v) {
    apiUrl.value = config.getApiUrl()
    isOnline.value = config.isOnline()
    usage.value = cache.getStorageUsage()
    await loadWallpapers()
  }
})

// 父组件通知壁纸变化（上传/删除后） → 重新加载列表
watch(() => props.wallpaperVersion, async () => {
  if (props.visible) await loadWallpapers()
})

// 从 IndexedDB 加载壁纸列表
async function loadWallpapers() {
  try {
    const wps = await cache.getWallpapers()
    wallpapers.value = wps && wps.length > 0 ? wps : []
    // 默认选中第一张
    selectedIdx.value = wallpapers.value.length > 0 ? 0 : -1
  } catch (e) { console.warn('加载壁纸失败', e); wallpapers.value = [] }
}

// 选中壁纸 → 更新首页背景
function selectWallpaper(idx) {
  selectedIdx.value = idx
  const wp = wallpapers.value[idx]
  if (wp) emit('wallpaperSelect', wp.url)
}

// 删除壁纸（至少保留一张）
async function deleteWallpaper(idx) {
  if (wallpapers.value.length <= 1) {
    uni.showToast({ title: '至少保留一张壁纸', icon: 'none' })
    return
  }
  const wp = wallpapers.value[idx]
  // 从 IndexedDB 删除对应的 Blob
  if (wp._local) {
    try { await cache.deleteImageBlob('wallpaper_' + wp._time) } catch (e) {}
  }
  // 从列表中去掉
  wallpapers.value.splice(idx, 1)
  await cache.setWallpapers(wallpapers.value)
  // 调整选中
  if (selectedIdx.value >= wallpapers.value.length) selectedIdx.value = wallpapers.value.length - 1
  if (selectedIdx.value < 0) selectedIdx.value = 0
  emit('wallpaperChange', wallpapers.value)
  uni.showToast({ title: '已删除' })
}

// 保存 API URL（允许为空以清除后端地址）
function saveApiUrl() {
  let url = apiUrl.value.trim()
  if (url && url.endsWith('/')) url = url.slice(0, -1)
  config.setApiUrl(url)
  uni.showToast({ title: url ? 'API 地址已保存' : 'API 地址已清除', icon: 'success' })
}

// 切换到离线模式 — 先尝试推送离线数据到服务器
async function goOffline() {
  uni.showToast({ title: '同步中...', icon: 'loading' })
  try {
    const sync = await import('@/api/sync.js').then(m => m.default)
    const result = await sync.switchToOnline()
    if (result.success) {
      config.forceOffline()
      isOnline.value = false
      emit('modeChange', false)
      uni.showToast({ title: '已同步并切换离线' })
    } else if (result.error && result.error.includes('不可达')) {
      config.forceOffline()
      isOnline.value = false
      emit('modeChange', false)
      uni.showToast({ title: '后端不可达，已离线' })
    } else {
      config.forceOffline()
      isOnline.value = false
      emit('modeChange', false)
      uni.showToast({ title: '已切换离线（部分数据未同步）' })
    }
  } catch (e) {
    config.forceOffline()
    isOnline.value = false
    emit('modeChange', false)
    uni.showToast({ title: '已切换离线' })
  }
}

// 切换失败的错误信息（内联显示在设置面板内，不会被 z-index 遮挡）
const errorText = ref('')

// 尝试切换到在线模式
async function goOnline() {
  errorText.value = ''
  try {
    const sync = await import('@/api/sync.js').then(m => m.default)
    const result = await sync.switchToOnline()
    if (result.success) {
      config.setMode(true)
      isOnline.value = true
      emit('modeChange', true)
      uni.showToast({ title: '已切换到在线模式' })
    } else if (result.conflicts) {
      // 先关闭设置弹窗，再打开冲突弹窗（避免两个弹窗重叠）
      emit('close')
      setTimeout(() => emit('conflicts', result.conflicts, result.apiMenus, result.localMenus), 100)
    } else {
      // 在面板内显示错误（避免被 overlay 遮挡）
      errorText.value = result.error || '后端不可达，切换失败'
    }
  } catch (e) {
    console.error('切换在线异常', e)
    errorText.value = '切换异常: ' + (e.message || '网络错误')
  }
}

// 清除缓存
async function clearData() {
  const res = await uni.showModal({ title: '确认清除', content: '将删除全部浏览器缓存数据，确定？' })
  if (res.confirm) {
    await cache.clearAll()
    usage.value = cache.getStorageUsage()
    uni.showToast({ title: '缓存已清除' })
  }
}
</script>

<style lang="scss" scoped>
.settings-overlay {
  position: fixed; left: 0; top: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 3000;
}
.settings-box {
  width: 650rpx; max-height: 85vh;
  background: #fff; border-radius: 20rpx; padding: 40rpx; overflow-y: auto;
}
.settings-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 40rpx;
  .settings-title { font-size: 36rpx; font-weight: bold; }
  .settings-close { cursor: pointer; }
}
.setting-section {
  margin-bottom: 36rpx;
  .section-title { font-size: 28rpx; font-weight: bold; color: #333; display: block; margin-bottom: 16rpx; }
}
.setting-row {
  display: flex; align-items: center; gap: 16rpx;
}
.setting-input {
  flex: 1; height: 70rpx;
  border: 1rpx solid #ddd; border-radius: 10rpx;
  padding: 0 20rpx; font-size: 28rpx;
}
.mode-text { font-size: 28rpx; }
.mode-online { color: #34c759; font-weight: bold; }
.mode-offline { color: #ff9500; font-weight: bold; }
.hint-text { font-size: 22rpx; color: #999; display: block; margin-top: 10rpx; }
.error-text { font-size: 24rpx; color: #ff4757; display: block; margin-top: 10rpx; font-weight: bold; }
.storage-bar {
  width: 100%; height: 20rpx;
  background: #f0f0f0; border-radius: 10rpx; overflow: hidden;
  .storage-fill {
    height: 100%; background: #007aff; border-radius: 10rpx;
    transition: width 0.3s;
  }
}
.btn-small {
  padding: 10rpx 24rpx; border-radius: 8rpx; font-size: 26rpx; border: none; cursor: pointer;
  white-space: nowrap;
}
.btn-save { background: #007aff; color: #fff; }
.btn-primary { background: #007aff; color: #fff; }
.btn-danger { background: #ff4757; color: #fff; }
.btn-outline { background: #fff; border: 1rpx solid #007aff; color: #007aff; }

/* 壁纸管理网格 */
.wallpaper-grid {
  display: flex; flex-wrap: wrap; gap: 16rpx;
}
.wallpaper-item {
  width: 130rpx; height: 160rpx;
  border: 2rpx solid #e5e5e5; border-radius: 10rpx;
  overflow: hidden; position: relative; cursor: pointer;
  &.active { border-color: #007aff; }
}
.wallpaper-thumb {
  width: 100%; height: 100%;
  background-size: cover; background-position: center;
}
.wallpaper-actions {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 4rpx 8rpx;
  background: rgba(0,0,0,0.4);
}
.wp-label {
  font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx;
  color: #fff;
  &.current { background: #007aff; }
  &.local { background: #ff9500; }
}
.btn-tiny {
  width: 36rpx; height: 36rpx; padding: 0;
  border-radius: 50%; border: none; cursor: pointer;
  font-size: 20rpx; line-height: 36rpx; text-align: center;
}
.btn-delete { background: #ff4757; color: #fff; }
</style>
