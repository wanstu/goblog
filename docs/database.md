# 数据库与分层架构

## 数据库连接

- **驱动**: `github.com/mattn/go-sqlite3`
- **数据库类型**: SQLite
- **数据库文件**: `goblog.db`（项目根目录，应用启动时自动创建）
- **连接模式**: WAL 日志模式 + 共享缓存（`cache=shared&_journal_mode=WAL`）
- **连接池配置**: 最大连接数 = 1（SQLite 仅支持单写连接，避免 `database is locked` 错误）

### 初始化流程

1. `main.go` 启动时调用 `database.Init("goblog")` 建立数据库连接
2. 连接成功后调用各模型的 `InitTable()` 方法自动建表
3. 表使用 `CREATE TABLE IF NOT EXISTS`，不会覆盖已有数据

```go
// database 包提供全局数据库连接管理
import "goblog/database"

// 初始化
database.Init("goblog")

// 获取连接实例
db := database.GetDB()
```

## 分层架构

```
请求流程:
  HTTP 请求 → Controller → Logic → Model → SQLite
                    ↑          ↑        ↑
              参数解析    业务规则   DB 操作
              响应返回    数据合并
```

### 各层职责

| 层 | 目录 | 职责 | 能做 | 禁止做 |
|----|------|------|------|--------|
| **Controller** | `controllers/` | HTTP 请求/响应处理 | 解析参数、调用 logic/model、返回 JSON | 直接操作 DB |
| **Logic** | `logic/` | 业务规则处理 | 调用 model、数据合并/转换/校验 | 直接操作 DB |
| **Model** | `models/` | 数据持久化 | CRUD 操作、表结构定义/迁移 | — |

### 分层原则

- **Controller 不直接调 Model**（除非是简单查询），应通过 Logic 层
- **Logic 不操作 DB**，所有数据库访问通过 Model 完成
- **Model 只做数据操作**，不含业务逻辑

### 响应格式

统一 JSON 响应格式：
```json
{
  "code": 0,        // 0=成功, 其他=错误码
  "msg": "success", // 提示信息
  "data": {}        // 数据体（可选）
}
```

错误码约定：
- `0`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

## 新增功能步骤

1. 在 `models/` 下创建模型文件，定义结构体和 CRUD 方法
2. 在 `logic/` 下创建业务逻辑文件
3. 在 `controllers/api/` 下创建 API 处理器
4. 在 `routes/api.go` 中注册路由
5. 在 `main.go` 中调用 `InitTable()` 自动建表

## 路由注册

路由定义在 `routes/` 包中，使用 `RouteSheet` 结构组织：

```go
var ApiRoutes = RouteSheet{
    prefix: "api",                              // 路由前缀，自动拼接
    routes: []Route{
        buildRoute("GET",  "/menu/list", menu.List),
        buildRoute("POST", "/menu",      menu.Create),
    },
}
```

`main.go` 中的 `loadRoute()` 会将所有路由注册到 Gin 引擎，支持 GET/POST/PUT/DELETE 方法。
