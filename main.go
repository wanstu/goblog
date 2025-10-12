package main

import (
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"goblog/routes"
	"strings"
)

func main() {
	app := gin.Default()
	loadFront(app)
	loadRoute(app)
	app.Run("0.0.0.0:7000")
}

func loadRoute(app *gin.Engine) {
	// 加载路由
	routes.LoadRoute()
	for _, route := range routes.Routes {
		switch strings.ToUpper(route.Method) {
		case "GET":
			app.GET(route.Path, route.Exec)
		}
	}
}

func loadFront(app *gin.Engine) {
	app.Use(static.Serve("/", static.LocalFile("./view/dist/build/h5", true)))
}
