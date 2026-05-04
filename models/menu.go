// Package models 提供数据模型定义及数据库 CRUD 操作
// 所有数据库操作均封装在此层，logic 层和 controller 层不得直接操作 DB
package models

import "goblog/database"

// Menu 菜单项数据模型，与数据库 menus 表一一对应
type Menu struct {
	ID         int    `json:"id"`          // 主键 ID，自增；硬编码菜单为 0
	Title      string `json:"title"`       // 菜单标题，如 "博客"、"哔哩哔哩"
	Color      string `json:"color"`       // 标题文字颜色，如 "#2d332f"
	CoverType  string `json:"cover_type"`  // 封面类型："icon"=svg图标, "image"=上传图片
	CoverColor string `json:"cover_color"` // 图标颜色
	CoverValue string `json:"cover_value"` // icon模式下=iconfont class名，image模式下=图片URL
	Link       string `json:"link"`        // 点击后跳转的目标 URL
	Desc       string `json:"desc"`        // 描述文字（鼠标悬停时显示）
	SortOrder  int    `json:"sort_order"`  // 排序序号，值越小越靠前
	Override   int    `json:"override"`    // 覆盖标记：0=独立自定义菜单, 1~5=覆盖对应硬编码菜单
}

// InitMenuTable 初始化菜单表结构
// 仅在表不存在时创建（CREATE TABLE IF NOT EXISTS），已有表则跳过
// 同时执行迁移：为旧表添加 override 列（若已存在则忽略错误）
// 应用启动时由 main.go 调用一次
func InitMenuTable() error {
	db := database.GetDB()
	createSQL := `
		CREATE TABLE IF NOT EXISTS menus (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			title       TEXT    NOT NULL,
			color       TEXT    DEFAULT '',
			cover_type  TEXT    DEFAULT 'icon',
			cover_color TEXT    DEFAULT '',
			cover_value TEXT    DEFAULT '',
			link        TEXT    DEFAULT '',
			desc        TEXT    DEFAULT '',
			sort_order  INTEGER DEFAULT 0,
			override    INTEGER DEFAULT 0
		);
	`
	if _, err := db.Exec(createSQL); err != nil {
		return err
	}

	// 迁移：为已有数据库添加 override 列
	// ALTER TABLE ADD COLUMN 在列已存在时会报错，忽略该错误
	db.Exec("ALTER TABLE menus ADD COLUMN override INTEGER DEFAULT 0")
	return nil
}

// GetAll 获取数据库中所有菜单项
// 按 sort_order ASC, id ASC 排序，保证列表顺序稳定
func GetAll() ([]Menu, error) {
	db := database.GetDB()
	query := `SELECT id, title, color, cover_type, cover_color, cover_value, link, desc, sort_order, override
	          FROM menus ORDER BY sort_order ASC, id ASC`
	// 执行查询
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // 函数返回前关闭结果集，防止资源泄漏

	// 遍历查询结果，逐行扫描到 Menu 结构体
	var menus []Menu
	for rows.Next() {
		var m Menu
		err := rows.Scan(&m.ID, &m.Title, &m.Color, &m.CoverType,
			&m.CoverColor, &m.CoverValue, &m.Link, &m.Desc, &m.SortOrder, &m.Override)
		if err != nil {
			return nil, err
		}
		menus = append(menus, m)
	}
	return menus, nil
}

// GetByID 根据主键 ID 查询单个菜单项
// 返回 nil + sql.ErrNoRows 表示该 ID 不存在
func GetByID(id int) (*Menu, error) {
	db := database.GetDB()
	var m Menu
	query := `SELECT id, title, color, cover_type, cover_color, cover_value, link, desc, sort_order, override
	          FROM menus WHERE id = ?`
	err := db.QueryRow(query, id).Scan(
		&m.ID, &m.Title, &m.Color, &m.CoverType,
		&m.CoverColor, &m.CoverValue, &m.Link, &m.Desc, &m.SortOrder, &m.Override,
	)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// Create 新增菜单项到数据库
// 返回新插入记录的自增 ID
func Create(m *Menu) (int64, error) {
	db := database.GetDB()
	insertSQL := `INSERT INTO menus (title, color, cover_type, cover_color, cover_value, link, desc, sort_order, override)
	              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	// 使用参数化查询防止 SQL 注入
	result, err := db.Exec(insertSQL,
		m.Title, m.Color, m.CoverType, m.CoverColor, m.CoverValue, m.Link, m.Desc, m.SortOrder, m.Override,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// Update 更新数据库中已存在的菜单项（按 ID 匹配）
func Update(m *Menu) error {
	db := database.GetDB()
	updateSQL := `UPDATE menus SET title=?, color=?, cover_type=?, cover_color=?,
	              cover_value=?, link=?, desc=?, sort_order=?, override=? WHERE id=?`
	_, err := db.Exec(updateSQL,
		m.Title, m.Color, m.CoverType, m.CoverColor,
		m.CoverValue, m.Link, m.Desc, m.SortOrder, m.Override, m.ID,
	)
	return err
}

// Delete 根据主键 ID 删除菜单项
func Delete(id int) error {
	db := database.GetDB()
	_, err := db.Exec("DELETE FROM menus WHERE id = ?", id)
	return err
}
