<template>
  <view class="container">
    <view class="mask" @contextmenu.prevent="onMaskContextMenu" @click="hideContextMenu">
      <view class="content">
        <!-- 在线/离线状态指示 -->
        <view class="status-bar">
          <view class="status-dot" :class="isOnline ? 'online' : 'offline'"></view>
          <text class="status-text">{{ isOnline ? '在线' : '离线' }}</text>
          <text v-if="!isOnline" class="status-hint">· 右键菜单可切换在线模式</text>
        </view>

        <view class="time-box">
          <view class="line"><view class="time">{{ timeStr }}</view></view>
          <view class="line">
            <view class="date">{{ dateStr }}</view>
            <view class="week-day">{{ weekDayStr }}</view>
          </view>
        </view>
        <view class="search-box">
          <view class="search-engine">
            <uni-data-select class="select" :clear="false" mode="none" v-model="searchEngine" :localdata="engineList" @change="changeEngine"></uni-data-select>
          </view>
          <view class="search-input">
            <input class="input" :focus="inputFocus" @keyup.enter="searchQuery" @keydown.enter="searchQuery" @blur="() => {inputFocus = false}" v-model="query" placeholder="请输入搜索内容" />
          </view>
          <view class="search-btn" @click="searchQuery"><uni-icons type="search" size="30"></uni-icons></view>
        </view>
        <view class="menu-list">
          <view v-for="item in menuList" :key="item.title + '_' + (item.id||0)" class="menu-item" @contextmenu.prevent.stop="onItemContextMenu($event, item)">
            <a :href="item.link" target="_blank" :title="item.desc">
              <view class="menu-cover">
                <view v-if="item.cover_type === 'icon'" class="iconfont">
                  <gicon :name="item.cover_value" :size="200" :color="item.cover_color"></gicon>
                </view>
                <image v-else-if="item.cover_type === 'image' && item.cover_value" :src="imageSrcs[item.cover_value] || item.cover_value" mode="aspectFill" class="cover-image" />
              </view>
              <view class="menu-title" :style="'color:' + item.color">{{item.title}}</view>
            </a>
          </view>
        </view>
      </view>
    </view>

    <!-- 右键菜单 -->
    <view v-if="contextMenu.show" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @click.stop>
      <view v-if="contextMenuItem" class="context-menu-item" @click="editContextMenuItem">
        <uni-icons type="compose" size="16" color="#333"></uni-icons>
        <text>编辑 {{ contextMenuItem.title }}</text>
      </view>
      <view v-if="contextMenuItem && contextMenuItem.id > 0" class="context-menu-item" @click="deleteContextMenuItem">
        <uni-icons type="trash" size="16" color="#ff4757"></uni-icons>
        <text style="color:#ff4757">删除 {{ contextMenuItem.title }}</text>
      </view>
      <view class="context-menu-item" @click="openAddModal">
        <uni-icons type="plus" size="16" color="#333"></uni-icons>
        <text>新增图标</text>
      </view>
      <view class="context-menu-item" @click="changeWallpaper">
        <uni-icons type="image" size="16" color="#333"></uni-icons>
        <text>更换背景</text>
      </view>
      <view class="context-divider"></view>
      <view class="context-menu-item" @click="handleRefresh">
        <uni-icons type="refresh" size="16" color="#333"></uni-icons>
        <text>刷新数据</text>
      </view>
      <view class="context-menu-item" @click="handleImport">
        <uni-icons type="download" size="16" color="#333"></uni-icons>
        <text>导入数据</text>
      </view>
      <view class="context-menu-item" @click="handleExport">
        <uni-icons type="upload" size="16" color="#333"></uni-icons>
        <text>导出数据</text>
      </view>
      <view class="context-divider"></view>
      <view class="context-menu-item" @click="openSettings">
        <uni-icons type="gear" size="16" color="#333"></uni-icons>
        <text>设置</text>
      </view>
    </view>

    <!-- 图标管理弹窗 -->
    <view v-if="showAdminModal" class="modal-overlay" @click.self="closeAdminModal">
      <view class="modal-box">
        <view class="modal-header">
          <text class="modal-title">{{ editingId ? '编辑图标' : '新增图标' }}</text>
          <view class="modal-close" @click="closeAdminModal"><uni-icons type="close" size="20"></uni-icons></view>
        </view>

        <!-- 添加模式 -->
        <view v-if="!editingId" class="modal-form add-form">
          <input v-model="form.title" placeholder="标题（必填）" class="form-input" />
          <input v-model="form.link" placeholder="链接 https://..." class="form-input" />
          <view class="form-row" v-if="isHttpUrl(form.link)">
            <text class="form-label"></text>
            <button class="btn-favicon" @click="handleFetchFavicon">获取网站图标</button>
          </view>
          <input v-model="form.desc" placeholder="描述" class="form-input" />
          <view class="form-row">
            <text class="form-label">类型：</text>
            <uni-data-select class="form-select" :clear="false" v-model="form.cover_type" :localdata="coverTypeOptions"></uni-data-select>
          </view>
          <template v-if="form.cover_type === 'icon'">
            <view class="color-picker-row">
              <text class="color-label">颜色：</text>
              <view class="color-swatch" :style="{ backgroundColor: form.cover_color }" @click="openColorPicker('cover_color')"></view>
              <text class="color-hex">{{ form.cover_color }}</text>
            </view>
            <view class="form-row">
              <text class="form-label">图标：</text>
              <uni-data-select class="form-select" :clear="false" v-model="form.cover_value" :localdata="iconOptions"></uni-data-select>
              <gicon v-if="form.cover_value" :name="form.cover_value" :size="40" color="#333"></gicon>
            </view>
          </template>
          <template v-if="form.cover_type === 'image'">
            <view class="form-row upload-row">
              <text class="form-label">图片：</text>
              <button class="btn-upload" @click="chooseImage">选择图片</button>
              <text v-if="uploading" class="upload-tip">上传中...</text>
            </view>
            <image v-if="form.cover_value" :src="form.cover_value" mode="aspectFill" class="preview-image" />
            <text v-if="form.cover_value" class="image-url">{{ fmtUrl(form.cover_value) }}</text>
          </template>
          <view class="color-picker-row">
            <text class="color-label">文字颜色：</text>
            <view class="color-swatch" :style="{ backgroundColor: form.color }" @click="openColorPicker('color')"></view>
            <text class="color-hex">{{ form.color }}</text>
          </view>
          <view class="form-btns"><button class="btn btn-primary" @click="handleAdd">添加</button></view>
        </view>

        <!-- 编辑模式，含删除按钮 -->
        <view v-if="editingId" class="modal-form edit-form">
          <input v-model="form.title" placeholder="标题（必填）" class="form-input" />
          <input v-model="form.link" placeholder="链接 https://..." class="form-input" />
          <view class="form-row" v-if="isHttpUrl(form.link)">
            <text class="form-label"></text>
            <button class="btn-favicon" @click="handleFetchFavicon">获取网站图标</button>
          </view>
          <input v-model="form.desc" placeholder="描述" class="form-input" />
          <view class="form-row">
            <text class="form-label">类型：</text>
            <uni-data-select class="form-select" :clear="false" v-model="form.cover_type" :localdata="coverTypeOptions"></uni-data-select>
          </view>
          <template v-if="form.cover_type === 'icon'">
            <view class="color-picker-row">
              <text class="color-label">颜色：</text>
              <view class="color-swatch" :style="{ backgroundColor: form.cover_color }" @click="openColorPicker('cover_color')"></view>
              <text class="color-hex">{{ form.cover_color }}</text>
            </view>
            <view class="form-row">
              <text class="form-label">图标：</text>
              <uni-data-select class="form-select" :clear="false" v-model="form.cover_value" :localdata="iconOptions"></uni-data-select>
              <gicon v-if="form.cover_value" :name="form.cover_value" :size="40" color="#333"></gicon>
            </view>
          </template>
          <template v-if="form.cover_type === 'image'">
            <view class="form-row upload-row">
              <text class="form-label">图片：</text>
              <button class="btn-upload" @click="chooseImage">选择图片</button>
              <text v-if="uploading" class="upload-tip">上传中...</text>
            </view>
            <image v-if="form.cover_value" :src="form.cover_value" mode="aspectFill" class="preview-image" />
            <text v-if="form.cover_value" class="image-url">{{ fmtUrl(form.cover_value) }}</text>
          </template>
          <view class="color-picker-row">
            <text class="color-label">文字颜色：</text>
            <view class="color-swatch" :style="{ backgroundColor: form.color }" @click="openColorPicker('color')"></view>
            <text class="color-hex">{{ form.color }}</text>
          </view>
          <view class="form-btns">
            <button class="btn btn-primary" @click="handleUpdate">更新</button>
            <button class="btn btn-cancel" @click="cancelEdit">取消编辑</button>
            <button class="btn btn-delete" @click="confirmDelete">删除</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 冲突解决弹窗 -->
    <conflict-modal
        :visible="showConflictModal"
        :conflicts="conflicts"
        @close="showConflictModal = false"
        @resolve="onResolveConflicts"
    />

    <!-- 裁剪预览弹窗 -->
    <crop-modal
        :visible="showCropModal"
        :image-url="cropImageUrl"
        @close="showCropModal = false"
        @confirm="onCropConfirm"
    />

    <!-- 设置面板 -->
    <settings-modal
        :visible="showSettingsModal"
        :wallpaper-version="wallpaperVersion"
        @close="showSettingsModal = false"
        @export="handleExport"
        @import="handleImport"
        @modeChange="onModeChange"
        @conflicts="onConflictsFound"
        @wallpaperSelect="onWallpaperSelect"
        @wallpaperChange="onWallpaperChange"
        @addWallpaper="changeWallpaper"
    />
  </view>
</template>

<script setup>
import dayjs from "dayjs";
import {computed, ref, reactive, onMounted, nextTick} from "vue";
import {onLoad} from "@dcloudio/uni-app";
import common from "@/api/common.js";
import config from "@/api/config.js";
import cache from "@/utils/cache.js";
import gicon from "@/components/gicon.vue";
import conflictModal from "@/components/conflict-modal.vue";
import cropModal from "@/components/crop-modal.vue";
import settingsModal from "@/components/settings-modal.vue";
import compress from "@/utils/compress.js";

// ============================================================
// 初始化 — 尊重强制离线标记，刷新后保持离线
// ============================================================
onLoad(async () => {
  init()
  // 强制离线 → 跳过网络检查，直接加载缓存
  if (config.isForcedOffline()) {
    isOnline.value = false; loadMenuList(); return
  }
  // 检查后端连通性
  const online = await common.ping()
  if (!online) {
    config.setMode(false); isOnline.value = false; loadMenuList(); return
  }
  // 在线 → 拉取在线JSONA + 本地JSONB → 合并JSONC → 冲突则选 → JSond → 上传覆盖在线
  const result = await common.switchToOnline()
  if (result.success) {
    isOnline.value = true
    menuList.value = result.menus
  } else if (result.conflicts) {
    // 有冲突 → 先显示本地数据（稍后通过冲突弹窗解决）
    isOnline.value = false
    await loadMenuList()
    conflicts.value = result.conflicts
    conflictAPIMenus.value = result.apiMenus
    conflictLocalMenus.value = result.localMenus
    showConflictModal.value = true
  } else {
    // API 失败 → 降级离线
    config.setMode(false); isOnline.value = false; loadMenuList()
  }
})

// ============================================================
// 在线状态
// ============================================================
const isOnline = ref(config.isOnline())

// ============================================================
// 菜单数据 — 通过 sync 层获取（自动判断在线/离线）
// ============================================================
const menuList = ref([])
// 图片URL→解析后显示URL映射（优先IDB缓存）
const imageSrcs = reactive({})
const defaultMenuList = [
  { title: "blog", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "blog", link: "https://blog.wanstu.cn", desc: "个人博客", override: 1 },
  { title: "哔哩哔哩", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "bilibili-line", link: "https://www.bilibili.com", desc: "哔哩哔哩", override: 2 },
  { title: "抖音", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "douyin1", link: "https://www.douyin.com/", desc: "记录美好生活", override: 3 },
  { title: "email", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "youxiang", link: "https://mail.163.com/", desc: "email", override: 4 },
  { title: "tapd", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "TAPD", link: "https://www.tapd.cn/my_dashboard", desc: "tapd", override: 5 }
]

// —— 从 sync 层加载菜单，并确保硬编码默认菜单始终存在 ——
const loadMenuList = async () => {
  try {
    const result = await common.getMenuList()
    const list = result?.menus || (Array.isArray(result) ? result : [])
    // 关键：确保列表中至少有硬编码默认菜单（离线缓存可能为空）
    const merged = ensureDefaults(list)
    menuList.value = merged
    // 预解析所有图片类型菜单项的显示 URL（IDB 缓存优先）
    for (const item of merged) {
      if (item.cover_type === 'image' && item.cover_value && !imageSrcs[item.cover_value]) {
        cache.getImageDisplayUrl(item.cover_value).then(src => { imageSrcs[item.cover_value] = src })
      }
    }
  } catch (e) {
    console.error('加载菜单失败', e)
    menuList.value = defaultMenuList
  }
}

// 检查列表是否包含硬编码默认项，不全则合并
function ensureDefaults(list) {
  if (!list || list.length === 0) return [...defaultMenuList]
  // 检查 override 1~5 是否都存在
  const hasOverride = new Set(list.filter(m => m.override >= 1 && m.override <= 5).map(m => m.override))
  if (hasOverride.size >= 5) return list // 5 条硬编码全在
  // 缺了某些硬编码项 → 补回
  const merged = [...list]
  defaultMenuList.forEach((d, i) => {
    if (!hasOverride.has(d.override || (i + 1))) {
      merged.unshift({ ...d, id: 0 }) // id=0 表示纯硬编码，非 DB 覆盖
    }
  })
  return merged
}

// ============================================================
// 颜色选择器 + URL 工具
// ============================================================
const openColorPicker = (field) => {
  const input = document.createElement('input')
  input.type = 'color'
  input.value = form[field]
  input.addEventListener('input', (e) => { form[field] = e.target.value })
  input.click()
}

function isHttpUrl(str) { return str && /^https?:\/\/.+/.test(str.trim()) }

function fmtUrl(url) {
  if (!url) return ''
  if (url.startsWith('data:')) return url.substring(0, 40) + '...'
  return url.length > 50 ? url.substring(0, 50) + '...' : url
}

// 抓取网站 favicon 并设为图标
const handleFetchFavicon = async () => {
  if (!isHttpUrl(form.link)) return
  if (!isOnline.value) { uni.showToast({ title: '离线模式不支持获取网站图标', icon: 'none' }); return }
  uni.showToast({ title: '获取中...', icon: 'loading' })
  try {
    const res = await common.fetchFavicon(form.link)
    if (res.data && res.data.code === 0) {
      form.cover_type = 'image'
      form.cover_value = res.data.data.url
      uni.showToast({ title: '已获取网站图标' })
    } else {
      uni.showToast({ title: res.data?.msg || '该网站无图标', icon: 'error' })
    }
  } catch (e) { uni.showToast({ title: '获取失败', icon: 'error' }) }
}

// ============================================================
// 右键菜单
// ============================================================
const contextMenu = reactive({ show: false, x: 0, y: 0 })
const contextMenuItem = ref(null)

const onMaskContextMenu = (e) => {
  contextMenuItem.value = null
  contextMenu.show = true
  contextMenu.x = e.clientX; contextMenu.y = e.clientY
}
const onItemContextMenu = (e, item) => {
  contextMenuItem.value = item
  contextMenu.show = true
  contextMenu.x = e.clientX; contextMenu.y = e.clientY
}
const hideContextMenu = () => { contextMenu.show = false }

const openAddModal = () => { contextMenu.show = false; showAdminModal.value = true }
const editContextMenuItem = () => {
  const item = contextMenuItem.value
  contextMenu.show = false
  if (!item) return
  showAdminModal.value = true
  nextTick(() => { startEdit(item) })
}

// 右键菜单中的"删除 xxx" → 确认后删除该项的 DB 记录
const deleteContextMenuItem = () => {
  const item = contextMenuItem.value
  contextMenu.show = false
  if (!item || !item.id) return
  uni.showModal({
    title: '确认删除',
    content: '确定删除"' + item.title + '"？此操作不可恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await common.deleteMenu(item.id)
          if (result && result.success === false) {
            uni.showToast({ title: result.error || '删除失败', icon: 'error' })
            return
          }
          await loadMenuList()
          uni.showToast({ title: '删除成功' })
        } catch (e) { uni.showToast({ title: '删除失败', icon: 'error' }) }
      }
    }
  })
}

// ---- 右键菜单：更换背景 ----
const changeWallpaper = () => {
  contextMenu.show = false
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: async (res) => {
      try {
        const dataUrl = await compress.compressToBase64(res.tempFilePaths[0], 1920, 1080, 0.75)
        const cssUrl = 'url(' + dataUrl + ')'
        const newWp = { url: cssUrl, _local: true, _time: Date.now() }
        const wps = (await cache.getWallpapers()) || [...wallpaperList]
        wps.unshift(newWp)
        await cache.setWallpapers(wps.slice(0, 10))
        wallpaperList.splice(0, wallpaperList.length, ...wps)
        wallpaperUrl.value = cssUrl
        // 通知 settings-modal 刷新壁纸列表
        wallpaperVersion.value++
        try {
          const blob = compress.dataURLToBlob(dataUrl)
          await cache.saveImageBlob('wallpaper_' + Date.now(), blob)
        } catch (e) { console.warn('IDB 壁纸备份失败', e) }
        uni.showToast({ title: '背景已更换' })
      } catch (e) {
        console.error('壁纸保存失败', e)
        uni.showToast({ title: '壁纸保存失败', icon: 'error' })
      }
    }
  })
}

// ---- 右键菜单：刷新数据 ----
const handleRefresh = async () => {
  contextMenu.show = false
  uni.showToast({ title: '刷新中...', icon: 'loading' })
  const result = await common.refreshFromAPI()
  if (result.success) {
    await loadMenuList()
    uni.showToast({ title: '刷新成功' })
  } else if (result.conflicts) {
    // 有冲突 → 弹出冲突解决
    conflictAPIMenus.value = result.apiMenus
    conflictLocalMenus.value = result.localMenus
    conflicts.value = result.conflicts
    showConflictModal.value = true
  } else {
    uni.showToast({ title: result.error || '刷新失败', icon: 'error' })
    // API 失败 → 用缓存
    loadMenuList()
  }
}

// ---- 右键菜单：导入/导出 ----
const handleExport = async () => {
  contextMenu.show = false
  showSettingsModal.value = false
  const json = await cache.exportAll()
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'goblog-backup-' + new Date().toISOString().slice(0,10) + '.json'
  a.click()
  URL.revokeObjectURL(a.href)
  uni.showToast({ title: '导出成功' })
}

// 导入 — 用原生 <input type="file">（H5 uni.chooseFile 不可用）
const handleImport = () => {
  contextMenu.show = false
  showSettingsModal.value = false
  // 创建隐藏的文件选择器
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    // 用 FileReader 读取 JSON 内容
    const reader = new FileReader()
    reader.onload = async (ev) => { await doImport(ev.target.result) }
    reader.onerror = () => { uni.showToast({ title: '读取文件失败', icon: 'error' }) }
    reader.readAsText(file)
  }
  input.click()
}

// 执行导入 + 合并（不直接覆盖，先合并再保存）
const doImport = async (jsonStr) => {
  try {
    const data = JSON.parse(jsonStr)
    if (!data || !data.version) { uni.showToast({ title: '无效的备份文件格式', icon: 'error' }); return }
    const importedMenus = data.menus || []
    const localMenus = await cache.getMenus() || []

    // 用 sync 的合并逻辑（本地优先，冲突检测）
    const { default: sync } = await import('@/api/sync.js')
    const merged = sync.mergeForOnline(localMenus, importedMenus)

    if (merged.conflicts.length > 0) {
      // 有冲突 → 弹出冲突弹窗让用户选
      conflicts.value = merged.conflicts
      conflictAPIMenus.value = importedMenus
      conflictLocalMenus.value = localMenus
      showConflictModal.value = true
      return
    }

    // 无冲突 → 保存合并结果并推送
    await cache.setMenus(merged.result)
    if (isOnline.value) {
      await sync.pushToAPI(merged.result, [])
    }
    // 恢复壁纸（如果存在）
    if (data.wallpapers && Array.isArray(data.wallpapers)) await cache.setWallpapers(data.wallpapers)
    if (data.images && typeof data.images === 'object') cache.setImageMap(data.images)

    await loadMenuList()
    uni.showToast({ title: '导入成功' })
  } catch (e) { uni.showToast({ title: '导入失败: ' + e.message, icon: 'error' }) }
}

// ---- 右键菜单：设置 ----
const showSettingsModal = ref(false)
const openSettings = () => { contextMenu.show = false; showSettingsModal.value = true }

// ============================================================
// 管理弹窗
// ============================================================
const showAdminModal = ref(false)
const editingId = ref(null)
const uploading = ref(false)

const form = reactive({
  title: '', link: '', desc: '',
  cover_type: 'icon', cover_value: 'blog',
  cover_color: '#424845', color: '#2d332f',
  sort_order: 0, override: 0,
})

const coverTypeOptions = [
  { value: 'icon', text: 'svg 图标' },
  { value: 'image', text: '上传图片' },
]
const iconOptions = [
  { value: 'blog', text: 'blog' }, { value: 'bilibili-line', text: 'bilibili-line' },
  { value: 'bilibili', text: 'bilibili' }, { value: 'douyin1', text: 'douyin1' },
  { value: 'youxiang', text: 'youxiang' }, { value: 'TAPD', text: 'TAPD' },
  { value: 'muitab', text: 'muitab' },
]

const closeAdminModal = () => { showAdminModal.value = false; cancelEdit() }

const resetForm = () => {
  form.title = ''; form.link = ''; form.desc = ''
  form.cover_type = 'icon'; form.cover_value = 'blog'
  form.cover_color = '#424845'; form.color = '#2d332f'
  form.sort_order = 0; form.override = 0
  editingId.value = null; uploading.value = false
}

// ============================================================
// 图片上传 + 裁剪
// ============================================================
const cropImageUrl = ref('')
const showCropModal = ref(false)

// 选择图片 → 先转 data URL（避免 blob URL 过期） → 弹出裁剪弹窗
const chooseImage = () => {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album'],
    success: async (res) => {
      try {
        // 将临时文件转为稳定的 data URL，供裁剪弹窗和后续上传使用
        cropImageUrl.value = await compress.tempFilePathToDataURL(res.tempFilePaths[0])
        showCropModal.value = true
      } catch (e) {
        uni.showToast({ title: '图片读取失败', icon: 'error' })
      }
    },
    fail: () => { uni.showToast({ title: '取消选择', icon: 'none' }) }
  })
}

// 裁剪确认 → 真实裁剪 → 上传或存本地
const onCropConfirm = async (cropRect) => {
  showCropModal.value = false
  uploading.value = true
  try {
    // 步骤1: 按裁剪区域真实裁剪图片，得到裁剪后的 data URL（600px 宽）
    const croppedURL = await compress.cropToDataURL(cropImageUrl.value, cropRect, 600)

    if (isOnline.value) {
      // 步骤2a: 在线模式 — 用 fetch+FormData 上传（避开 uni.uploadFile blob URL 无后缀问题）
      const blob = compress.dataURLToBlob(croppedURL)
      const formData = new FormData()
      formData.append('file', blob, 'crop-' + Date.now() + '.jpg')
      const resp = await fetch(config.getApiUrl() + '/api/upload', { method: 'POST', body: formData })
      const json = await resp.json()
      if (json && json.code === 0) {
        form.cover_value = json.data.url
        uni.showToast({ title: '上传成功' })
      } else {
        uni.showToast({ title: json?.msg || '上传失败', icon: 'error' })
      }
    } else {
      // 步骤2b: 离线模式 — 直接把 data URL 存入 cover_value（可被 <image src> 直接渲染）
      //          同时存 IndexedDB Blob 作为持久备份
      form.cover_value = croppedURL
      try {
        const blob = compress.dataURLToBlob(croppedURL)
        await cache.saveImageBlob('offline_' + Date.now(), blob)
      } catch (e) { console.warn('IndexedDB 备份失败', e) }
      uni.showToast({ title: '已保存到本地' })
    }
  } catch (e) {
    console.error('裁剪/上传失败', e)
    uni.showToast({ title: isOnline.value ? '上传失败' : '保存失败', icon: 'error' })
  } finally { uploading.value = false }
}

// ============================================================
// CRUD — 所有操作最终通过 loadMenuList() 刷新显示（内建 ensureDefaults 防护）
// ============================================================
const handleAdd = async () => {
  if (!form.title) { uni.showToast({ title: '标题不能为空', icon: 'error' }); return }
  if (!form.link) { uni.showToast({ title: '链接不能为空', icon: 'error' }); return }
  try {
    const result = await common.addMenu({ ...form })
    // addMenu 返回 { menus, source } 或 { success: false, error }
    if (result && result.success === false) {
      uni.showToast({ title: result.error || '添加失败', icon: 'error' })
      return
    }
    // 无论在线还是离线，统一重新加载确保兜底
    await loadMenuList()
    uni.showToast({ title: '添加成功' })
    resetForm(); closeAdminModal()
  } catch (e) { uni.showToast({ title: '网络错误', icon: 'error' }) }
}

const startEdit = (item) => {
  editingId.value = (item.id && item.id > 0) ? item.id : null
  form.title = item.title; form.link = item.link; form.desc = item.desc
  form.cover_type = item.cover_type || 'icon'; form.cover_value = item.cover_value
  form.cover_color = item.cover_color || '#424845'; form.color = item.color || '#2d332f'
  form.sort_order = item.sort_order || 0; form.override = item.override || 0
}
const cancelEdit = () => { resetForm() }

const handleUpdate = async () => {
  if (!editingId.value) return
  if (!form.title) { uni.showToast({ title: '标题不能为空', icon: 'error' }); return }
  try {
    const result = await common.updateMenu(editingId.value, { ...form })
    if (result && result.success === false) {
      uni.showToast({ title: result.error || '更新失败', icon: 'error' })
      return
    }
    await loadMenuList()
    uni.showToast({ title: '更新成功' })
    resetForm(); closeAdminModal()
  } catch (e) { uni.showToast({ title: '网络错误', icon: 'error' }) }
}

// 删除确认弹窗
const confirmDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除图标 "' + form.title + '" 吗？',
    success: async (res) => {
      if (res.confirm) {
        const result = await common.deleteMenu(editingId.value)
        if (result && result.success === false) {
          uni.showToast({ title: result.error || '删除失败', icon: 'error' })
          return
        }
        await loadMenuList()
        uni.showToast({ title: '删除成功' })
        resetForm(); closeAdminModal()
      }
    }
  })
}

// ============================================================
// 冲突解决
// ============================================================
const showConflictModal = ref(false)
const conflicts = ref([])
const conflictAPIMenus = ref([])
const conflictLocalMenus = ref([])

const onConflictsFound = (c, api, local) => {
  // 关闭设置弹窗，避免遮挡冲突弹窗
  showSettingsModal.value = false
  conflicts.value = c
  conflictAPIMenus.value = api
  conflictLocalMenus.value = local
  showConflictModal.value = true
}

const onResolveConflicts = async (resolutions) => {
  showConflictModal.value = false
  try {
    const result = await common.applyResolutions(resolutions, conflictAPIMenus.value, conflictLocalMenus.value)
    if (result.success) {
      await loadMenuList()
      isOnline.value = true
      uni.showToast({ title: '合并完成，已切换在线' })
      // 合并完成后重新打开设置弹窗
      showSettingsModal.value = true
    } else {
      uni.showToast({ title: '合并失败', icon: 'error' })
    }
  } catch (e) { uni.showToast({ title: '合并失败', icon: 'error' }) }
}

// 模式切换回调 — 在线切换后加载来自 API 的数据（含离线合并结果）
const onModeChange = (online) => {
  isOnline.value = online
  // 切换后重新加载（在线从 API，离线从缓存；ensureDefaults 兜底）
  loadMenuList()
}

// 壁纸管理回调 — 选中壁纸立即生效
const wallpaperVersion = ref(1)  // 版本号，触发 settings-modal 刷新壁纸列表

const onWallpaperSelect = (cssUrl) => {
  wallpaperUrl.value = cssUrl
}
// 壁纸管理回调 — 列表变更后刷新页面壁纸列表
const onWallpaperChange = async (wps) => {
  wallpaperList.splice(0, wallpaperList.length, ...wps)
  wallpaperVersion.value++ // 触发 settings-modal 刷新
}

// ============================================================
// 壁纸、时钟、搜索引擎（原有代码）
// ============================================================
const pcPath = "/static/wallpaper/pc/"
const weekDayStyleType = 1
const wallpaperList = reactive([
  { url: 'url(' + pcPath + '3c864d5f80be61addac66938d5e2a6244ab48304.jpg)' }
])
const engineList = [
  { value: 0, text: "bing", searchLink: "https://cn.bing.com/search?q=" },
  { value: 1, text: "google", searchLink: "https://www.google.com/search?q=" },
  { value: 2, text: "duckduckgo", searchLink: "https://duckduckgo.com?q=" },
  { value: 3, text: "baidu", searchLink: "https://www.baidu.com/s?&wd=" },
]
const engineLinkMap = []; engineList.map((item) => { engineLinkMap[item.value] = item.searchLink })

const inputFocus = ref(true); const wallpaperUrl = ref(wallpaperList[0].url); const time = ref(''); const query = ref('')
const searchEngine = ref(engineList[0].value)

onMounted(async () => {
  inputSetFocus(true)
  // 加载 IndexedDB 缓存的壁纸（getWallpapers 现为 async）
  try {
    const cached = await cache.getWallpapers()
    if (cached && cached.length > 0) {
      wallpaperList.splice(0, wallpaperList.length, ...cached)
      wallpaperUrl.value = cached[0].url
    }
  } catch (e) { console.warn('加载缓存壁纸失败', e) }
})

document.addEventListener('keydown', function(event) {
  if (showAdminModal.value || showSettingsModal.value || showConflictModal.value || showCropModal.value) return
  const focusKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']
  const reg = /[A-Za-z0-9]/;
  if((event.key.length === 1 && reg.exec(event.key)) || focusKeys.includes(event.key)) {
    inputSetFocus(true)
  } else if (event.key === 'Tab') { event.preventDefault(); if(inputFocus.value) { nextEngine() }; inputSetFocus(true) }
  else if (event.key === 'Enter') { searchQuery() }
});

const inputSetFocus = async (e) => {
  await new Promise((resolve) => { inputFocus.value = !e; nextTick(() => { inputFocus.value = e; resolve() }) })
}
const changeEngine = (e) => { searchEngine.value = e; inputSetFocus(true) }
const nextEngine = () => { searchEngine.value = (searchEngine.value + 1) % engineList.length; inputSetFocus(true) }
const searchQuery = () => {
  if (query.value) { const lk = engineLinkMap[searchEngine.value]; if (lk) window.open(lk + query.value) }
  else { uni.showToast({ title: '请输入搜索内容', icon: 'error' }) }
}
const init = () => { timeChange(); wallpaperChange() }
const timeChange = () => { time.value = dayjs(); setInterval(() => { time.value = dayjs() }, 1000) }
const wallpaperChange = () => { randomWallpaper(); setInterval(() => { randomWallpaper() }, 1000 * 10) }
const randomWallpaper = () => {
  if (wallpaperList.length === 0) return
  wallpaperUrl.value = wallpaperList[Math.floor(Math.random() * wallpaperList.length)].url
}
const dateStr = computed(() => dayjs(time.value).format("YYYY年MM月DD日"))
const timeStr = computed(() => dayjs(time.value).format("HH:mm:ss"))
const weekDayStr = computed(() => {
  const wd = dayjs(time.value).format("dddd"); if (weekDayStyleType === 3) return wd
  let s = ''; switch (wd) { case "Sunday": s="日"; break; case "Monday": s="一"; break; case "Tuesday": s="二"; break; case "Wednesday": s="三"; break; case "Thursday": s="四"; break; case "Friday": s="五"; break; case "Saturday": s="六"; break; }
  if (weekDayStyleType === 1) s = "星期" + s; else if (weekDayStyleType === 2) s = "周" + s; return s
})
</script>

<style lang="scss" scoped>
.container {
  overflow: hidden;
  background: v-bind(wallpaperUrl) no-repeat center center / cover;
  width: 100%; height: 100vh;
  position: absolute; left: 0; top: 0;
}
.mask { width: 100%; height: 100%; position: absolute; left: 0; top: 0; }
.content {
  width: 88%; height: 80%;
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 5rpx;
}
/* 在线/离线状态指示 */
.status-bar {
  position: absolute; top: 20rpx; right: 40rpx;
  display: flex; align-items: center; gap: 8rpx; z-index: 10;
  .status-dot {
    width: 14rpx; height: 14rpx; border-radius: 50%;
    &.online { background: #34c759; }
    &.offline { background: #ff9500; }
  }
  .status-text { font-size: 22rpx; color: rgba(255,255,255,0.8); }
  .status-hint { font-size: 20rpx; color: rgba(255,255,255,0.5); }
}
.time-box {
  color: #fff; width: 600rpx; margin: 100rpx auto 0;
  .line { display: flex; justify-content: space-around; }
  .time { font-size: 200rpx; font-family: 'UnidreamLED',serif; }
  .date { font-size: 40rpx; font-weight: bold; }
  .week-day { font-size: 40rpx; font-weight: bold; }
}
.search-box {
  display: flex; width: 40%; height: 100rpx;
  border-radius: 50rpx; margin: 100rpx auto 0;
  justify-content: space-around; background: #fff;
  padding: 0 40rpx; gap: 10rpx;
  .search-engine { width: 280rpx; height: 100%; font-weight: bold; .select { border-radius: 50rpx; height: 100%; border: none; } }
  .search-input { width: 100%; height: 100%; .input { height: 100%; } }
  .search-btn { cursor: pointer; }
}
.menu-list {
  width: 50%; display: flex; flex-wrap: wrap;
  margin: 0 auto; padding: 100rpx 200rpx; gap: 10rpx;
  .menu-item:hover { transform: scale(1.03); }
  .menu-item:hover .menu-cover {
    box-shadow: 0 2px 2px 0 rgba(0,0,0,0.12),0 3px 1px -2px rgba(0,0,0,0.06),0 1px 5px 0 rgba(0,0,0,0.12),0 -1px 0.5px 0 rgba(0,0,0,0.09);
  }
  a { text-decoration: none; &:visited,&:hover,&:active { color: inherit; } }
  .menu-item {
    cursor: pointer; width: 200rpx; height: 240rpx;
    .menu-cover { overflow: hidden; border-radius: 10rpx; width: 200rpx; height: 200rpx; background: rgba(255, 255, 255, 0.2); }
    .menu-title { text-align: center; color: #fff; }
  }
}

/* 右键菜单 */
.context-menu {
  position: fixed; background: #fff; border-radius: 12rpx;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  min-width: 260rpx; z-index: 2000; padding: 8rpx 0;
}
.context-menu-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 28rpx; font-size: 28rpx; color: #333; cursor: pointer;
  &:hover { background: #f0f0f0; }
}
.context-divider { height: 1rpx; background: #e5e5e5; margin: 4rpx 0; }

/* 弹窗 */
.modal-overlay {
  position: fixed; left: 0; top: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal-box {
  width: 700rpx; max-height: 80vh;
  background: #fff; border-radius: 20rpx; padding: 40rpx; overflow-y: auto;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 30rpx;
  .modal-title { font-size: 36rpx; font-weight: bold; }
  .modal-close { cursor: pointer; }
}
.add-form { background: #f8fafb; border-radius: 12rpx; padding: 20rpx; }
.edit-form { background: #fff8e6; border-radius: 12rpx; padding: 20rpx; }

.modal-form {
  display: flex; flex-direction: column; gap: 16rpx;
  .form-input { height: 70rpx; border: 1rpx solid #ddd; border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx; }
  .form-row { display: flex; align-items: center; gap: 10rpx;
    .form-label { font-size: 28rpx; white-space: nowrap; }
    .form-select { flex: 1; height: 70rpx; }
  }
  .color-picker-row { display: flex; align-items: center; gap: 12rpx;
    .color-label { font-size: 28rpx; white-space: nowrap; }
    .color-swatch { width: 72rpx; height: 56rpx; border-radius: 8rpx; border: 2rpx solid #ddd; cursor: pointer; &:hover { border-color: #007aff; } }
    .color-hex { font-size: 24rpx; color: #666; font-family: monospace; background: #f5f5f5; padding: 6rpx 12rpx; border-radius: 6rpx; }
  }
  .upload-row {
    .btn-upload { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 26rpx; border: 1rpx solid #007aff; background: #fff; color: #007aff; cursor: pointer; }
    .upload-tip { font-size: 24rpx; color: #007aff; }
  }
  .btn-favicon {
    padding: 8rpx 20rpx; border-radius: 8rpx; font-size: 24rpx;
    border: 1rpx solid #34c759; background: #fff; color: #34c759; cursor: pointer;
  }
  .preview-image { width: 200rpx; height: 200rpx; border-radius: 10rpx; object-fit: cover; border: 1rpx solid #eee; }
  .image-url { font-size: 22rpx; color: #999; word-break: break-all; }
  .form-btns { display: flex; gap: 20rpx; margin-top: 10rpx;
    .btn { padding: 12rpx 30rpx; border-radius: 10rpx; font-size: 28rpx; border: none; cursor: pointer; }
    .btn-primary { background: #007aff; color: #fff; }
    .btn-cancel { background: #e5e5e5; color: #333; }
    .btn-delete { background: #ff4757; color: #fff; }
  }
}
.cover-image { width: 100%; height: 100%; object-fit: cover; }
</style>
