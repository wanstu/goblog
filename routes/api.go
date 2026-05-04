package routes

import (
	"goblog/controllers/api/favicon"
	"goblog/controllers/api/index"
	"goblog/controllers/api/menu"
	"goblog/controllers/api/ping"
	"goblog/controllers/api/upload"
)

var prefix = "api"
var routes []Route = []Route{
	buildRoute("GET", "/hello", index.Hello),
	// 健康检查 — 前端用于判断后端是否在线
	buildRoute("GET", "/ping", ping.Status),
	// 菜单/图标管理 API
	buildRoute("GET", "/menu/list", menu.List),     // 获取菜单列表（默认+数据库）
	buildRoute("POST", "/menu", menu.Create),       // 新增自定义菜单
	buildRoute("PUT", "/menu/:id", menu.Update),    // 更新自定义菜单
	buildRoute("DELETE", "/menu/:id", menu.Delete), // 删除自定义菜单
	// 文件上传 API
	buildRoute("POST", "/upload", upload.Image), // 上传图片/文件
	// 网站 favicon 抓取
	buildRoute("POST", "/favicon", favicon.Fetch), // 抓取网站图标
}

var ApiRoutes = RouteSheet{
	prefix: prefix,
	routes: routes,
}
