package routes

import (
	"github.com/gin-gonic/gin"
	"goblog/controllers/index"
)

type Route struct {
	Method string
	Path   string
	Exec   func(c *gin.Context)
}

var Routes = []Route{
	buildRoute("GET", "/hello/:name", index.Hello),
}

func LoadRoute() {
	for _, route := range ApiRoutes {
		route.Path = "/" + ApiPrefix + "/" + route.Path
		Routes = append(Routes, route)
	}
}

func buildRoute(method string, path string, exec func(c *gin.Context)) Route {
	return Route{
		Method: method,
		Path:   path,
		Exec:   exec,
	}
}
