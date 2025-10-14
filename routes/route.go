package routes

import (
	"github.com/gin-gonic/gin"
	"goblog/controllers/index"
)

type Router interface {
	getPrefix() string
	getRoutes() []Route
}

type Route struct {
	Method string
	Path   string
	Exec   func(c *gin.Context)
}

type RouteSheet struct {
	prefix string
	routes []Route
}

func (rt *RouteSheet) getPrefix() string {
	return rt.prefix
}

func (rt *RouteSheet) getRoutes() []Route {
	return rt.routes
}

var Routes = []Route{
	buildRoute("GET", "/hello/:name", index.Hello),
}

func LoadRoutes() {
	Routes = append(Routes, loadRoute(ApiRoutes)...)
}
func loadRoute(rt RouteSheet) (routes []Route) {
	for _, route := range rt.getRoutes() {
		route.Path = "/" + rt.getPrefix() + "/" + route.Path
		routes = append(routes, route)
	}
	return
}

func buildRoute(method string, path string, exec func(c *gin.Context)) Route {
	return Route{
		Method: method,
		Path:   path,
		Exec:   exec,
	}
}
