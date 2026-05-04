// Package favicon 提供网站图标抓取功能
// 前端传入 URL → 后端 fetch 该站点的 favicon → 保存到 uploads/ → 返回路径
package favicon

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Fetch 接受一个网站 URL，抓取其 favicon 并保存到 uploads/
// POST /api/favicon  body: { "url": "https://example.com" }
func Fetch(c *gin.Context) {
	// 步骤1: 解析请求体
	var req struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "请提供有效的 url 参数"})
		return
	}

	// 步骤2: 解析网站域名，拼接 favicon 地址
	parsed, err := url.Parse(req.URL)
	if err != nil || parsed.Host == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "无效的 URL"})
		return
	}
	// 尝试多个常见的 favicon 路径
	faviconURLs := []string{
		fmt.Sprintf("%s://%s/favicon.ico", parsed.Scheme, parsed.Host),
		fmt.Sprintf("%s://%s/favicon.png", parsed.Scheme, parsed.Host),
	}

	// 步骤3: 依次尝试下载 favicon
	var resp *http.Response
	var finalURL string
	for _, fu := range faviconURLs {
		resp, err = http.Get(fu)
		if err == nil && resp.StatusCode == 200 {
			finalURL = fu
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
	}
	if finalURL == "" {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "msg": "未找到该网站的 favicon"})
		return
	}
	defer resp.Body.Close()

	// 步骤4: 确定扩展名并生成唯一文件名
	ext := filepath.Ext(finalURL)
	if ext == "" {
		ext = ".ico" // 默认 ico
	}
	newFileName := fmt.Sprintf("favicon_%d%s", time.Now().UnixNano(), strings.ToLower(ext))

	// 步骤5: 保存到 uploads/ 目录
	dstPath := filepath.Join("./uploads", newFileName)
	dst, err := os.Create(dstPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "创建文件失败: " + err.Error()})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, resp.Body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "保存文件失败: " + err.Error()})
		return
	}

	// 步骤6: 返回文件路径
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "获取成功",
		"data": gin.H{"url": "/uploads/" + newFileName},
	})
}
