<template>
  <view class="container">
    <view class="mask" @contextmenu.prevent="onMaskContextMenu" @click="hideContextMenu">
      <view class="content">
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
          <view v-for="item in menuList" :key="item.title" class="menu-item" @contextmenu.prevent.stop="onItemContextMenu($event, item)">
            <a :href="item.link" target="_blank" :title="item.desc">
              <view class="menu-cover">
                <view v-if="item.cover_type === 'icon'" class="iconfont">
                  <gicon :name="item.cover_value" :size="200" :color="item.cover_color"></gicon>
                </view>
                <image v-else-if="item.cover_type === 'image' && item.cover_value" :src="item.cover_value" mode="aspectFill" class="cover-image" />
              </view>
              <view class="menu-title" :style="'color:' + item.color">{{item.title}}</view>
            </a>
          </view>
        </view>
      </view>
    </view>

    <!-- 右键菜单 — position:fixed 相对视口 -->
    <view v-if="contextMenu.show" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @click.stop>
      <!-- 在图标上右键：显示"编辑 xxx" -->
      <view v-if="contextMenuItem" class="context-menu-item" @click="editContextMenuItem">
        <uni-icons type="compose" size="16" color="#333"></uni-icons>
        <text>编辑 {{ contextMenuItem.title }}</text>
      </view>
      <!-- 空白处右键：显示"新增图标" -->
      <view v-if="!contextMenuItem" class="context-menu-item" @click="openAddModal">
        <uni-icons type="plus" size="16" color="#333"></uni-icons>
        <text>新增图标</text>
      </view>
    </view>

    <!-- 管理弹窗 — position:fixed 覆盖全屏 -->
    <view v-if="showAdminModal" class="modal-overlay" @click.self="closeAdminModal">
      <view class="modal-box">
        <view class="modal-header">
          <text class="modal-title">{{ editingId ? '编辑图标' : '新增图标' }}</text>
          <view class="modal-close" @click="closeAdminModal"><uni-icons type="close" size="20"></uni-icons></view>
        </view>

        <!-- ===== 添加模式表单 ===== -->
        <view v-if="!editingId" class="modal-form add-form">
          <input v-model="form.title" placeholder="标题（必填）" class="form-input" />
          <input v-model="form.link" placeholder="链接 https://..." class="form-input" />
          <input v-model="form.desc" placeholder="描述" class="form-input" />
          <view class="form-row">
            <text class="form-label">类型：</text>
            <uni-data-select class="form-select" :clear="false" v-model="form.cover_type" :localdata="coverTypeOptions"></uni-data-select>
          </view>
          <template v-if="form.cover_type === 'icon'">
            <!-- 颜色选择器：色块+值，点击色块js动态触发原生取色器 -->
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
            <text v-if="form.cover_value" class="image-url">{{ form.cover_value }}</text>
          </template>
          <view class="color-picker-row">
            <text class="color-label">文字颜色：</text>
            <view class="color-swatch" :style="{ backgroundColor: form.color }" @click="openColorPicker('color')"></view>
            <text class="color-hex">{{ form.color }}</text>
          </view>
          <view class="form-btns"><button class="btn btn-primary" @click="handleAdd">添加</button></view>
        </view>

        <!-- ===== 编辑模式表单 ===== -->
        <view v-if="editingId" class="modal-form edit-form">
          <input v-model="form.title" placeholder="标题（必填）" class="form-input" />
          <input v-model="form.link" placeholder="链接 https://..." class="form-input" />
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
            <text v-if="form.cover_value" class="image-url">{{ form.cover_value }}</text>
          </template>
          <view class="color-picker-row">
            <text class="color-label">文字颜色：</text>
            <view class="color-swatch" :style="{ backgroundColor: form.color }" @click="openColorPicker('color')"></view>
            <text class="color-hex">{{ form.color }}</text>
          </view>
          <view class="form-btns">
            <button class="btn btn-primary" @click="handleUpdate">更新</button>
            <button class="btn btn-cancel" @click="cancelEdit">取消编辑</button>
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

// ============================================================
// 页面初始化
// ============================================================
onLoad(() => { init(); common.hello(); loadMenuList() })

// ============================================================
// 菜单数据
// ============================================================
const menuList = ref([])
const defaultMenuList = [
  { title: "blog", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "blog", link: "https://blog.wanstu.cn", desc: "个人博客" },
  { title: "哔哩哔哩", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "bilibili-line", link: "https://www.bilibili.com", desc: "哔哩哔哩" },
  { title: "抖音", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "douyin1", link: "https://www.douyin.com/", desc: "记录美好生活" },
  { title: "email", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "youxiang", link: "https://mail.163.com/", desc: "email" },
  { title: "tapd", color: "rgb(45, 51, 47)", cover_type: "icon", cover_color: "rgb(66, 72, 69)", cover_value: "TAPD", link: "https://www.tapd.cn/my_dashboard", desc: "tapd" }
]

const loadMenuList = async () => {
  try {
    const res = await common.getMenuList()
    if (res.data && res.data.code === 0) { menuList.value = res.data.data || defaultMenuList }
    else { menuList.value = defaultMenuList }
  } catch (e) { console.error('加载菜单列表失败', e); menuList.value = defaultMenuList }
}

// ============================================================
// 颜色选择器 — 通过 JS 动态创建 input[type=color] 触发原生取色器
// (uni-app H5 模式中，模板内的 <input type=color> 可能因视图封装而失效)
// ============================================================
const openColorPicker = (field) => {
  // 步骤1: 创建原生 HTML input 元素
  const input = document.createElement('input')
  input.type = 'color'
  input.value = form[field]       // 初始值为当前颜色

  // 步骤2: 监听 input 事件，实时同步颜色值到表单
  input.addEventListener('input', (e) => {
    form[field] = e.target.value
  })

  // 步骤3: 触发点击，弹出浏览器原生颜色选择器
  input.click()
}

// ============================================================
// 右键菜单
// ============================================================
const contextMenu = reactive({ show: false, x: 0, y: 0 })
const contextMenuItem = ref(null)   // 右键命中的菜单项；null=空白处

// 空白处右键 → 弹出"新增图标"
const onMaskContextMenu = (e) => {
  contextMenuItem.value = null
  contextMenu.show = true
  contextMenu.x = e.clientX; contextMenu.y = e.clientY
}

// 图标上右键 → 弹出"编辑 xxx"
const onItemContextMenu = (e, item) => {
  contextMenuItem.value = item
  contextMenu.show = true
  contextMenu.x = e.clientX; contextMenu.y = e.clientY
}

const hideContextMenu = () => { contextMenu.show = false }

// "新增图标" → 打开弹窗进入添加模式
const openAddModal = () => {
  contextMenu.show = false
  showAdminModal.value = true
}
// "编辑 xxx" → 打开弹窗并填充该图标的编辑表单
const editContextMenuItem = () => {
  const item = contextMenuItem.value
  contextMenu.show = false
  if (!item) return
  showAdminModal.value = true
  nextTick(() => { startEdit(item) })
}

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
// 图片上传
// ============================================================
const chooseImage = () => {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album'],
    success: async (res) => {
      uploading.value = true
      try {
        const uploadRes = await common.uploadImage(res.tempFilePaths[0])
        if (uploadRes.data && uploadRes.data.code === 0) {
          form.cover_value = uploadRes.data.data.url
          uni.showToast({ title: '上传成功' })
        } else { uni.showToast({ title: uploadRes.data?.msg || '上传失败', icon: 'error' }) }
      } catch (e) { uni.showToast({ title: '网络错误', icon: 'error' }) }
      finally { uploading.value = false }
    },
    fail: () => { uni.showToast({ title: '取消选择', icon: 'none' }) }
  })
}

// ============================================================
// CRUD
// ============================================================
const handleAdd = async () => {
  if (!form.title) { uni.showToast({ title: '标题不能为空', icon: 'error' }); return }
  if (!form.link) { uni.showToast({ title: '链接不能为空', icon: 'error' }); return }
  try {
    const res = await common.addMenu({ ...form })
    if (res.data && res.data.code === 0) {
      uni.showToast({ title: '添加成功' })
      resetForm(); closeAdminModal(); loadMenuList()
    } else { uni.showToast({ title: res.data.msg || '添加失败', icon: 'error' }) }
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
    const res = await common.updateMenu(editingId.value, { ...form })
    if (res.data && res.data.code === 0) {
      uni.showToast({ title: '更新成功' })
      resetForm(); closeAdminModal(); loadMenuList()
    } else { uni.showToast({ title: res.data.msg || '更新失败', icon: 'error' }) }
  } catch (e) { uni.showToast({ title: '网络错误', icon: 'error' }) }
}

// ============================================================
// 原有代码：壁纸、时钟、搜索引擎
// ============================================================
const pcPath = "/static/wallpaper/pc/"
const weekDayStyleType = 1
const wallpaperList = [{ url: 'url(' + pcPath + '3c864d5f80be61addac66938d5e2a6244ab48304.jpg)' }]
const engineList = [
  { value: 0, text: "bing", searchLink: "https://cn.bing.com/search?q=" },
  { value: 1, text: "google", searchLink: "https://www.google.com/search?q=" },
  { value: 2, text: "duckduckgo", searchLink: "https://duckduckgo.com?q=" },
  { value: 3, text: "baidu", searchLink: "https://www.baidu.com/s?&wd=" },
]
const engineLinkMap = []; engineList.map((item) => { engineLinkMap[item.value] = item.searchLink })

const inputFocus = ref(true); const wallpaperUrl = ref(''); const time = ref(''); const query = ref('')
const searchEngine = ref(engineList[0].value)

onMounted(() => { inputSetFocus(true) })

document.addEventListener('keydown', function(event) {
  if (showAdminModal.value) return
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
const randomWallpaper = () => { wallpaperUrl.value = wallpaperList[Math.floor(Math.random() * wallpaperList.length)].url }
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

/* ===== 右键菜单 ===== */
.context-menu {
  position: fixed;
  background: #fff; border-radius: 12rpx;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  min-width: 240rpx; z-index: 2000; padding: 8rpx 0;
}
.context-menu-item {
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 28rpx; font-size: 28rpx; color: #333; cursor: pointer;
  &:hover { background: #f0f0f0; }
}

/* ===== 弹窗 ===== */
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
/* 添加模式表单 */
.add-form { background: #f8fafb; border-radius: 12rpx; padding: 20rpx; }
/* 编辑模式表单 */
.edit-form { background: #fff8e6; border-radius: 12rpx; padding: 20rpx; }

.modal-form {
  display: flex; flex-direction: column; gap: 16rpx;

  .form-input {
    height: 70rpx; border: 1rpx solid #ddd;
    border-radius: 10rpx; padding: 0 20rpx; font-size: 28rpx;
  }
  .form-row {
    display: flex; align-items: center; gap: 10rpx;
    .form-label { font-size: 28rpx; white-space: nowrap; }
    .form-select { flex: 1; height: 70rpx; }
  }
  /* 颜色选择器：可视化色块 + 十六进制值 */
  .color-picker-row {
    display: flex; align-items: center; gap: 12rpx;
    .color-label { font-size: 28rpx; white-space: nowrap; }
    .color-swatch {
      width: 72rpx; height: 56rpx;
      border-radius: 8rpx; border: 2rpx solid #ddd;
      cursor: pointer;
      &:hover { border-color: #007aff; }
    }
    .color-hex {
      font-size: 24rpx; color: #666;
      font-family: monospace;
      background: #f5f5f5; padding: 6rpx 12rpx; border-radius: 6rpx;
    }
  }
  .upload-row {
    .btn-upload { padding: 12rpx 24rpx; border-radius: 8rpx; font-size: 26rpx; border: 1rpx solid #007aff; background: #fff; color: #007aff; cursor: pointer; }
    .upload-tip { font-size: 24rpx; color: #007aff; }
  }
  .preview-image { width: 200rpx; height: 200rpx; border-radius: 10rpx; object-fit: cover; border: 1rpx solid #eee; }
  .image-url { font-size: 22rpx; color: #999; word-break: break-all; }
  .form-btns {
    display: flex; gap: 20rpx; margin-top: 10rpx;
    .btn { padding: 12rpx 30rpx; border-radius: 10rpx; font-size: 28rpx; border: none; cursor: pointer; }
    .btn-primary { background: #007aff; color: #fff; }
    .btn-cancel { background: #e5e5e5; color: #333; }
  }
}

.cover-image { width: 100%; height: 100%; object-fit: cover; }
</style>
