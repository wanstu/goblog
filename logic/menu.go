// Package logic 提供业务逻辑层
// 重要原则：logic 层不直接操作数据库，所有 DB 操作通过 models 包完成
package logic

import (
	"encoding/json"

	"goblog/models"
)

// defaultMenusJSON 硬编码的默认菜单数据（JSON 字符串）
// override 字段 1~5 对应列表中每条硬编码菜单的唯一标识
// 当数据库中存在相同 override 值的记录时，会用 DB 记录覆盖对应的硬编码菜单
var defaultMenusJSON = `[
  {
    "title": "blog",
    "color": "rgb(45, 51, 47)",
    "cover_type": "icon",
    "cover_color": "rgb(66, 72, 69)",
    "cover_value": "blog",
    "link": "https://blog.wanstu.cn",
    "desc": "个人博客，记录学习、工作、生活中的点滴",
    "override": 1
  },
  {
    "title": "哔哩哔哩",
    "color": "rgb(45, 51, 47)",
    "cover_type": "icon",
    "cover_color": "rgb(66, 72, 69)",
    "cover_value": "bilibili-line",
    "link": "https://www.bilibili.com",
    "desc": "哔哩哔哩 (゜-゜)つロ 干杯~-bilibili",
    "override": 2
  },
  {
    "title": "抖音",
    "color": "rgb(45, 51, 47)",
    "cover_type": "icon",
    "cover_color": "rgb(66, 72, 69)",
    "cover_value": "douyin1",
    "link": "https://www.douyin.com/",
    "desc": "记录美好生活",
    "override": 3
  },
  {
    "title": "email",
    "color": "rgb(45, 51, 47)",
    "cover_type": "icon",
    "cover_color": "rgb(66, 72, 69)",
    "cover_value": "youxiang",
    "link": "https://mail.163.com/",
    "desc": "email",
    "override": 4
  },
  {
    "title": "tapd",
    "color": "rgb(45, 51, 47)",
    "cover_type": "icon",
    "cover_color": "rgb(66, 72, 69)",
    "cover_value": "TAPD",
    "link": "https://www.tapd.cn/my_dashboard",
    "desc": "tapd",
    "override": 5
  }
]`

// GetMenuList 获取合并后的完整菜单列表
//
// 合并规则：
//  1. 解析硬编码 JSON → 5 条默认菜单（override=1~5, id=0）
//  2. 查询数据库 → 所有自定义/覆盖记录
//  3. 建立 override → DB记录 的映射表
//  4. 遍历默认菜单：如果 DB 中存在相同 override 的记录，用 DB 版本替换
//  5. 将 override=0（独立自定义）的 DB 记录追加到末尾
//
// 结果排序：硬编码(可能被覆盖) → 独立自定义菜单(按 sort_order)
//
// 本函数不进行任何数据库操作，所有数据获取委托给 models 包
func GetMenuList() ([]models.Menu, error) {
	// 步骤1: 解析硬编码 JSON → []Menu（id 默认为 0）
	var defaultMenus []models.Menu
	if err := json.Unmarshal([]byte(defaultMenusJSON), &defaultMenus); err != nil {
		return nil, err
	}

	// 步骤2: 从数据库获取所有记录（包含覆盖记录和独立自定义记录）
	dbMenus, err := models.GetAll()
	if err != nil {
		return nil, err
	}

	// 步骤3: 建立 override → *Menu 映射表
	// key: override 值（1~5=覆盖硬编码, 0=独立自定义）
	overrideMap := make(map[int]*models.Menu)
	var customMenus []models.Menu // 收集 override=0 的独立自定义菜单
	for i := range dbMenus {
		if dbMenus[i].Override >= 1 && dbMenus[i].Override <= 5 {
			overrideMap[dbMenus[i].Override] = &dbMenus[i]
		} else {
			// override=0 的记录追加到列表末尾
			customMenus = append(customMenus, dbMenus[i])
		}
	}

	// 步骤4: 遍历默认菜单，如果被 DB 覆盖则用 DB 版本替换
	var result []models.Menu
	for _, dm := range defaultMenus {
		// 检查是否有相同 override 值的 DB 覆盖记录
		if override, exists := overrideMap[dm.Override]; exists {
			// 存在覆盖 → 使用 DB 中的数据（保留 ID/修改内容）
			result = append(result, *override)
		} else {
			// 无覆盖 → 使用硬编码默认值
			result = append(result, dm)
		}
	}

	// 步骤5: 追加独立自定义菜单（override=0）
	result = append(result, customMenus...)
	return result, nil
}
