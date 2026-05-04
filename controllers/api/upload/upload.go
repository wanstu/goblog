// Package upload 提供文件上传的 API 控制器
// 支持图片等文件的接收、存储、返回访问 URL
package upload

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// uploadDir 上传文件存储目录（相对于项目根目录）
const uploadDir = "./uploads"

// Image 接收图片文件上传
// POST /api/upload
// 表单字段: file - 要上传的文件
// 返回: 文件的公开访问 URL
func Image(c *gin.Context) {
	// 步骤1: 从 multipart 表单中获取上传文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "获取上传文件失败: " + err.Error(),
		})
		return
	}
	defer file.Close()

	// 步骤2: 校验文件类型 — 仅允许常见图片格式
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true,
		".gif": true, ".webp": true, ".svg": true, ".bmp": true,
	}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "不支持的文件格式，仅允许 jpg/png/gif/webp/svg/bmp",
		})
		return
	}

	// 步骤3: 生成唯一文件名（时间戳 + 原始扩展名），避免冲突
	newFileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)

	// 步骤4: 确保上传目录存在（自动创建）
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建上传目录失败",
		})
		return
	}

	// 步骤5: 在服务器上创建目标文件
	dstPath := filepath.Join(uploadDir, newFileName)
	dst, err := os.Create(dstPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建文件失败: " + err.Error(),
		})
		return
	}
	defer dst.Close()

	// 步骤6: 将上传文件内容写入目标文件
	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "保存文件失败: " + err.Error(),
		})
		return
	}

	// 步骤7: 返回文件的公开访问 URL
	// /uploads/ 路径由 main.go 中的静态文件中间件提供服务
	fileURL := "/uploads/" + newFileName
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "上传成功",
		"data": gin.H{
			"url": fileURL,
		},
	})
}
