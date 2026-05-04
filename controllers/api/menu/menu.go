// Package menu 提供菜单/图标的 RESTful API 控制器
// 负责 HTTP 请求的参数解析、调用 logic/model 层、返回 JSON 响应
// 控制器层不直接操作数据库，所有 DB 操作通过 models 包完成
package menu

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"goblog/logic"
	"goblog/models"
)

// List 获取完整菜单列表
// GET /api/menu/list
// 返回：硬编码默认菜单 + 数据库中的自定义菜单（合并后）
func List(c *gin.Context) {
	// 调用 logic 层获取合并后的菜单数据
	menus, err := logic.GetMenuList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "获取菜单列表失败: " + err.Error(),
		})
		return
	}

	// 返回统一 JSON 格式：code=0 表示成功
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "success",
		"data": menus,
	})
}

// Create 新增菜单项
// POST /api/menu
// 请求体：Menu JSON 对象（不含 id 字段，由数据库自动生成）
func Create(c *gin.Context) {
	var menu models.Menu
	// 解析请求体中的 JSON 数据到 Menu 结构体
	if err := json.NewDecoder(c.Request.Body).Decode(&menu); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求数据格式错误: " + err.Error(),
		})
		return
	}

	// 调用 Model 层写入数据库
	id, err := models.Create(&menu)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建菜单失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "创建成功",
		"data": gin.H{"id": id},
	})
}

// Update 更新菜单项
// PUT /api/menu/:id
// 请求体：Menu JSON 对象
func Update(c *gin.Context) {
	// 从 URL 路径参数中提取菜单 ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "无效的 ID"})
		return
	}

	// 解析请求体
	var menu models.Menu
	if err := json.NewDecoder(c.Request.Body).Decode(&menu); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "请求数据格式错误: " + err.Error()})
		return
	}
	menu.ID = id

	// 先检查记录是否存在，避免盲目更新
	if _, err := models.GetByID(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "msg": "菜单项不存在"})
		return
	}

	// 调用 Model 层执行更新
	if err := models.Update(&menu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "更新菜单失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "更新成功"})
}

// Delete 删除菜单项
// DELETE /api/menu/:id
func Delete(c *gin.Context) {
	// 从 URL 路径参数中提取菜单 ID
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "msg": "无效的 ID"})
		return
	}

	// 先检查记录是否存在
	if _, err := models.GetByID(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "msg": "菜单项不存在"})
		return
	}

	// 调用 Model 层执行删除
	if err := models.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "msg": "删除菜单失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "删除成功"})
}
