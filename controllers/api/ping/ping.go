// Package ping 提供健康检查端点
// 前端通过此端点判断后端是否在线，决定使用在线/离线模式
package ping

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Status 返回后端服务状态
// GET /api/ping
// 响应极简，仅用于连通性检查 — 前端可据此切换在线/离线模式
func Status(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "pong",
	})
}
