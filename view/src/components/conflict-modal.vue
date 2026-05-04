<template>
  <!-- 冲突解决弹窗：离线→在线或导入数据时，同一项存在两个不同版本 -->
  <view v-if="visible" class="conflict-overlay" @click.self="$emit('close')">
    <view class="conflict-box">
      <view class="conflict-header">
        <text class="conflict-title">数据冲突 — 请选择保留的版本</text>
      </view>

      <!-- 冲突列表 -->
      <view class="conflict-list">
        <view v-for="(conflict, idx) in conflicts" :key="conflict.key" class="conflict-item">
          <text class="conflict-item-title">冲突 {{ idx + 1 }}: {{ conflict.local.title || conflict.api.title }}</text>

          <!-- 并排显示两个版本 -->
          <view class="conflict-compare">
            <!-- 本地版本（离线/导入的） -->
            <view
                class="conflict-version"
                :class="{ selected: choices[conflict.key] === 'local' }"
                @click="choose(conflict.key, 'local')"
            >
              <text class="version-label">📦 本地版本</text>
              <text class="version-field">标题: {{ conflict.local.title }}</text>
              <text class="version-field">链接: {{ conflict.local.link }}</text>
              <text class="version-field">描述: {{ conflict.local.desc }}</text>
              <text class="version-field">类型: {{ conflict.local.cover_type }}</text>
              <text v-if="conflict.local.cover_type === 'icon'" class="version-field">图标: {{ conflict.local.cover_value }}</text>
            </view>

            <!-- 在线版本（API/服务器） -->
            <view
                class="conflict-version"
                :class="{ selected: choices[conflict.key] === 'api' }"
                @click="choose(conflict.key, 'api')"
            >
              <text class="version-label">☁️ 在线版本</text>
              <text class="version-field">标题: {{ conflict.api.title }}</text>
              <text class="version-field">链接: {{ conflict.api.link }}</text>
              <text class="version-field">描述: {{ conflict.api.desc }}</text>
              <text class="version-field">类型: {{ conflict.api.cover_type }}</text>
              <text v-if="conflict.api.cover_type === 'icon'" class="version-field">图标: {{ conflict.api.cover_value }}</text>
            </view>
          </view>

          <!-- 差异字段高亮 -->
          <view class="conflict-diffs">
            <text v-for="diff in getDiffs(conflict)" :key="diff" class="diff-badge">{{ diff }}</text>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="conflict-footer">
        <button class="btn btn-outline" @click="chooseAll('local')">全部用本地</button>
        <button class="btn btn-outline" @click="chooseAll('api')">全部用在线</button>
        <button class="btn btn-primary" :disabled="!allResolved" @click="confirmResolve">确认合并</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  conflicts: { type: Array, default: () => [] }, // [{ key, local, api }]
})

const emit = defineEmits(['close', 'resolve'])

// choices[conflict.key] = 'local' | 'api'
const choices = reactive({})

// 重置选择状态（弹窗打开时）
watch(() => props.visible, (v) => {
  if (v) {
    Object.keys(choices).forEach(k => delete choices[k])
  }
})

// 是否全部冲突已做出选择
const allResolved = computed(() => {
  return props.conflicts.length > 0 && props.conflicts.every(c => choices[c.key])
})

// 单个选择
function choose(key, version) {
  choices[key] = version
}

// 全部选择同一版本
function chooseAll(version) {
  props.conflicts.forEach(c => { choices[c.key] = version })
}

// 获取差异字段列表
function getDiffs(conflict) {
  const diffs = []
  const fields = ['title', 'link', 'desc', 'cover_value', 'cover_type']
  fields.forEach(f => {
    if (conflict.local[f] !== conflict.api[f]) diffs.push(f)
  })
  return diffs
}

// 确认合并 → 将选择结果返回父组件
function confirmResolve() {
  const resolutions = props.conflicts.map(c => ({
    key: c.key,
    choose: choices[c.key],
  }))
  emit('resolve', resolutions)
}
</script>

<style lang="scss" scoped>
.conflict-overlay {
  position: fixed; left: 0; top: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 3000;
}
.conflict-box {
  width: 900rpx; max-height: 85vh;
  background: #fff; border-radius: 20rpx; padding: 40rpx;
  overflow-y: auto;
}
.conflict-header {
  margin-bottom: 30rpx;
  .conflict-title { font-size: 34rpx; font-weight: bold; color: #e67e22; }
}
.conflict-item {
  border: 1rpx solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx;
  .conflict-item-title { font-size: 28rpx; font-weight: bold; margin-bottom: 16rpx; display: block; }
}
.conflict-compare {
  display: flex; gap: 16rpx;
  .conflict-version {
    flex: 1; padding: 16rpx;
    border: 2rpx solid #e5e5e5; border-radius: 10rpx; cursor: pointer;
    &.selected { border-color: #007aff; background: #f0f7ff; }
    .version-label { font-size: 26rpx; font-weight: bold; display: block; margin-bottom: 10rpx; }
    .version-field { font-size: 24rpx; color: #666; display: block; margin-bottom: 4rpx; }
  }
}
.conflict-diffs {
  margin-top: 12rpx; display: flex; gap: 8rpx; flex-wrap: wrap;
  .diff-badge {
    font-size: 20rpx; background: #fff3cd; color: #856404;
    padding: 4rpx 12rpx; border-radius: 4rpx;
  }
}
.conflict-footer {
  display: flex; gap: 16rpx; justify-content: flex-end; margin-top: 30rpx;
  .btn {
    padding: 16rpx 36rpx; border-radius: 10rpx; font-size: 28rpx; border: none; cursor: pointer;
  }
  .btn-primary { background: #007aff; color: #fff; }
  .btn-primary:disabled { background: #ccc; }
  .btn-outline { background: #fff; border: 1rpx solid #007aff; color: #007aff; }
}
</style>
