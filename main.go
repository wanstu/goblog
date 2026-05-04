package main

import (
	"net/http"

	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"goblog/database"
	"goblog/models"
	"goblog/routes"
	"strings"
)

// corsMiddleware 处理跨域请求（CORS）
// 允许所有来源的请求，并处理 OPTIONS 预检请求
// 开发/生产环境都启用，避免前端跨域被浏览器拦截
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 允许所有来源（生产环境可按需限制为特定域名）
		c.Header("Access-Control-Allow-Origin", "*")
		// 允许的请求方法
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		// 允许的请求头
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		// 预检请求的有效期（秒），减少 OPTIONS 请求频率
		c.Header("Access-Control-Max-Age", "86400")

		// OPTIONS 预检请求直接返回 204，不进入后续路由
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func main() {
	// 步骤1: 初始化数据库（持久化文件存储，不再是内存模式）
	if err := database.Init("goblog"); err != nil {
		panic("数据库初始化失败: " + err.Error())
	}

	// 步骤2: 自动建表（仅在表不存在时创建，已有表则跳过）
	if err := models.InitMenuTable(); err != nil {
		panic("菜单表初始化失败: " + err.Error())
	}

	app := gin.Default()
	// CORS 中间件 — 必须在路由注册之前应用
	app.Use(corsMiddleware())
	loadFront(app)
	loadRoute(app)
	// 托管上传目录 — 用户上传的图片通过 /uploads/<文件名> 公开访问
	app.Static("/uploads", "./uploads")

	// 启动 HTTP 服务，监听 0.0.0.0:7000
	app.Run("0.0.0.0:7000")
}

// loadRoute 加载所有路由定义并注册到 Gin 引擎
// 支持 GET/POST/PUT/DELETE 全部 HTTP 方法
func loadRoute(app *gin.Engine) {
	// 收集所有路由定义（包括主路由和 API 路由组）
	routes.LoadRoutes()
	for _, route := range routes.Routes {
		// 根据路由的 Method 字段注册对应的 HTTP 处理器
		switch strings.ToUpper(route.Method) {
		case "GET":
			app.GET(route.Path, route.Exec)
		case "POST":
			app.POST(route.Path, route.Exec)
		case "PUT":
			app.PUT(route.Path, route.Exec)
		case "DELETE":
			app.DELETE(route.Path, route.Exec)
		}
	}
}

// loadFront 托管前端静态文件（UniApp/Vite 构建产物）
// 访问任意路由时，若无后端匹配，则返回前端 index.html（SPA 模式）
func loadFront(app *gin.Engine) {
	app.Use(static.Serve("/", static.LocalFile("./view/dist/build/h5", true)))
}
