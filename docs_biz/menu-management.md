# 菜单/图标管理功能

## 功能概述

主页面（桌面导航页）展示的图标/菜单由两部分数据合并而成：

1. **硬编码默认菜单**（5 条固定数据）
2. **用户自定义菜单**（存储在 SQLite 数据库中，可通过弹窗管理）

## 数据来源与合并

### 硬编码数据
- 位置：`logic/menu.go` 中的 `defaultMenusJSON` 变量
- 格式：JSON 字符串，解析为 `[]models.Menu`
- 特点：不可通过 API 修改或删除，修改需直接编辑源代码

### 数据库数据
- 表名：`menus`
- 管理方式：**页面空白处右键** → 右键菜单 → "图标管理" → 弹窗增删改查

### 合并规则
```
完整列表 = 硬编码默认菜单（前5条） + 数据库自定义菜单（后续N条）
```

## API 接口

### 获取菜单列表
```
GET /api/menu/list
```
**响应**：返回合并后的完整列表，包含硬编码默认菜单 + 数据库自定义菜单

### 新增菜单项
```
POST /api/menu
Content-Type: application/json

{
  "title": "示例",
  "color": "#2d332f",
  "cover_type": "icon",      // "icon"=svg图标, "image"=上传图片
  "cover_color": "#424845",
  "cover_value": "blog",     // icon模式下为iconfont class名，image模式下为图片URL
  "link": "https://example.com",
  "desc": "描述文字"
}
```
**注意**：`id` 字段由数据库自动生成，不传

### 更新菜单项
```
PUT /api/menu/:id
Content-Type: application/json

{ 同新增格式，id 从 URL 获取 }
```

### 删除菜单项
```
DELETE /api/menu/:id
```

### 上传图片
```
POST /api/upload
Content-Type: multipart/form-data

表单字段: file (图片文件)
限制格式: jpg, jpeg, png, gif, webp, svg, bmp

响应: { "code": 0, "msg": "上传成功", "data": { "url": "/uploads/1734567890123456789.png" } }
```
上传的图片存储在项目根目录 `./uploads/` 下，通过 `/uploads/<文件名>` 公开访问。

## 数据库表结构

```sql
CREATE TABLE menus (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,       -- 菜单标题
    color       TEXT    DEFAULT '',     -- 标题文字颜色
    cover_type  TEXT    DEFAULT 'icon', -- 封面类型（目前仅支持 icon）
    cover_color TEXT    DEFAULT '',     -- 图标颜色
    cover_value TEXT    DEFAULT '',     -- 图标 class 名（对应 iconfont）
    link        TEXT    DEFAULT '',     -- 点击跳转链接
    desc        TEXT    DEFAULT '',     -- 描述（hover 提示）
    sort_order  INTEGER DEFAULT 0      -- 排序序号（越小越靠前）
);
```

## 前端交互

### 主页面加载
1. 页面 `onLoad` 时调用 `GET /api/menu/list` 获取菜单数据
2. 请求成功：渲染返回的合并列表
3. 请求失败：降级使用本地硬编码的兜底数据（5条默认菜单）

### 图标管理弹窗
- **入口**：页面空白处点击右键 → 弹出右键菜单 → 选择"图标管理"
- **颜色选择**：颜色字段使用原生 `<input type="color">` 色板选择器，取代纯文本输入
- **封面类型**：
  - **svg 图标**：从预设 iconfont 列表中选择，可选择图标颜色
  - **上传图片**：点击"选择图片"从相册选取，自动上传到服务器，可预览上传结果
- **功能**：
  - **查询**：弹窗底部显示数据库中的自定义菜单列表
  - **新增**：上方表单填写后点击"添加"
  - **编辑**：点击列表项的"编辑"，表单回填数据，修改后点击"更新"
  - **删除**：点击列表项的"删除"直接移除
- 注意：硬编码的 5 条默认菜单不在弹窗中显示和管理

### 封面渲染
- `cover_type === 'icon'` → 使用 `<gicon>` 组件渲染 iconfont SVG 图标
- `cover_type === 'image'` → 使用 `<image>` 标签渲染上传的图片

## 数据库表结构

```sql
CREATE TABLE menus (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,       -- 菜单标题
    color       TEXT    DEFAULT '',     -- 标题文字颜色（十六进制，如 #2d332f）
    cover_type  TEXT    DEFAULT 'icon', -- 封面类型: "icon"=svg图标, "image"=上传图片
    cover_color TEXT    DEFAULT '',     -- 图标颜色（十六进制）
    cover_value TEXT    DEFAULT '',     -- icon模式下=iconfont class名, image模式下=图片URL
    link        TEXT    DEFAULT '',     -- 点击跳转链接
    desc        TEXT    DEFAULT '',     -- 描述（hover 提示）
    sort_order  INTEGER DEFAULT 0      -- 排序序号（越小越靠前）
);
```

## 数据流示意

```
用户操作 → 右键菜单 → 管理弹窗 → API 请求 → Controller → Logic → Model → SQLite
                                            ↓                           ↓
主页面 ← API 响应 ← Controller ← Logic（合并硬编码+DB） ← Model    uploads/
图片上传 → /api/upload → 保存到 ./uploads/ → 返回 /uploads/xxx.png
```
用户操作 → 管理弹窗 → API 请求 → Controller → Logic → Model → SQLite
                                    ↓
主页面 ← API 响应 ← Controller ← Logic（合并硬编码+DB） ← Model
```
