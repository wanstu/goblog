# 离线模式与数据同步

## 概述

goblog 前端支持在线/离线两种工作模式，自动检测后端连通性并在模式间切换。两种模式共用同一套数据同步层（`sync.js`），确保数据一致性和用户体验的平滑过渡。

## 在线模式

```
数据获取:  API 请求 → 写入缓存(localStorage) → 前端回显
数据写入:  API 请求 → API 重新拉取全量 → 写入缓存 → 前端回显
```

- 所有操作通过后端 API 完成
- 每次写入成功后自动拉取全量数据更新缓存
- 缓存保持与服务端同步

## 离线模式

```
数据获取:  缓存(localStorage) → 前端回显
数据写入:  写入缓存 → 前端回显（标记 _offline=true）
图片上传:  压缩(base64) → 存 IndexedDB Blob
```

- 不需要后端连接
- 新增/修改的数据标记 `_offline: true` 和 `_updated` 时间戳
- 图片压缩后存入 IndexedDB，避免 localStorage 空间不足

## 模式切换

### 自动切换
- 页面加载时 ping 后端 `/api/ping`
- 在线模式中任何 API 调用失败 → 自动降级为离线

### 手动切换
- 右键菜单 → 设置 → 切换在线/离线
- 离线时有"切换在线"按钮

### 切换流程（离线→在线）

1. 点"切换在线"
2. ping 后端确认可连通
3. 拉取服务端最新数据：`sync.switchToOnline()`
4. 合并本地缓存和服务端数据：`sync.mergeData(apiData, localData)`
5. 无冲突 → 以服务端数据为准，本地独有项自动推送到 API
6. 有冲突 → 弹出冲突解决弹窗，用户逐项选择保留版本
7. 冲突解决后，将最终数据推送到 API

## 数据合并

### 合并键（唯一标识）
- 数据库 ID: `id:N`（服务器分配的正整数 id）
- 硬编码覆盖: `override:N`（1~5 对应 5 条默认菜单）
- 离线临时: `temp:标题+链接`（离线创建的临时项）

### 合并规则
1. 以服务端数据为基准
2. 仅存在于本地的项 → 推送到服务端
3. 仅存在于服务端的项 → 保留
4. 双方都有且数据相同 → 保留服务端
5. 双方都有且数据不同 → 标记为冲突，用户选择

## 存储结构

### localStorage
| Key | 内容 | 大小 |
|-----|------|------|
| `goblog_config` | API URL、模式、同步时间 | <1KB |
| `goblog_menus` | 菜单列表 JSON（含 `_offline`, `_updated` 标记） | <10KB |
| `goblog_wallpapers` | 壁纸列表 JSON | <5KB |
| `goblog_images` | 图片文件名→base64 映射（离线回退用） | <100KB |

### IndexedDB
| 数据库 | 对象仓库 | 内容 |
|--------|----------|------|
| `goblog` v1 | `images` | 图片 Blob（原始二进制，不膨胀） |

## 导入导出

- **导出**: 右键菜单 → 导出数据 → 下载 JSON 文件（含菜单、壁纸、配置、图片映射）
- **导入**: 右键菜单 → 导入数据 → 选择 JSON 文件 → 自动合并（与离线→在线流程相同）
- 导入格式: `{ version, exportedAt, config, menus, wallpapers, images }`

## 缓存策略

- **不启用自动刷新**（用户设置）
- 刷新时机：
  - 页面加载时
  - 新增/更新/删除操作成功后
  - 手动点"刷新数据"
  - 离线→在线切换时
- 首次加载（无缓存）: 使用内置默认菜单

## 图片处理

- 在线模式: 上传到服务器 `/api/upload`，存储返回的 URL
- 离线模式: Canvas 压缩（600×600, JPEG q=0.7）→ base64 → IndexedDB Blob
- 显示时: 在线用 URL，离线用 IndexedDB 恢复 Blob URL
- 裁剪: 仅视觉预览（`crop-modal.vue`），不上传裁剪后图片

## 依赖关系

```
config.js     ← 零依赖
compress.js   ← 零依赖
cache.js      → config.js
request.js    → config.js
sync.js       → config.js, cache.js, request.js
common.js     → sync.js, request.js
组件           → common.js, config.js, cache.js
```

无循环依赖。
