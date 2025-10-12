package routes

import "goblog/controllers/api/index"

var ApiPrefix = "api"
var ApiRoutes []Route = []Route{
	buildRoute("GET", "/hello", index.Hello),
}
