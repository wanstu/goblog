package main

import (
	"database/sql"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	"goblog/routes"
	"strings"
)

func main() {
	app := gin.Default()
	loadFront(app)
	loadRoute(app)
	//loadDb(app, "goblog")

	app.Run("0.0.0.0:7000")
}

func loadDb(app *gin.Engine, dbName string) (db *sql.DB) {
	db, err := sql.Open("sqlite3", "file:"+dbName+".db?mode=memory")
	if err != nil {
		panic(err)
	}

	res, _ := db.Query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
	if res != nil {
		// 遍历 res
	}

	return
}

func loadRoute(app *gin.Engine) {
	// 加载路由
	routes.LoadRoutes()
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
