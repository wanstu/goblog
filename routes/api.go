package routes

import "goblog/controllers/api/index"

var prefix = "api"
var routes []Route = []Route{
	buildRoute("GET", "/hello", index.Hello),
}

var ApiRoutes = RouteSheet{
	prefix: prefix,
	routes: routes,
}
