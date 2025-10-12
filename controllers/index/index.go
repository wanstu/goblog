package index

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func Hello(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		name = "world!"
	}
	c.JSONP(http.StatusOK, gin.H{
		"msg": "hello, " + name,
	})
}
