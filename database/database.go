// Package database 提供全局数据库连接管理
// 所有数据库连接通过此包获取，确保整个应用使用同一个连接池
package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3" // SQLite 驱动，通过空白导入注册
)

// DB 全局数据库连接实例，应用启动时在 main.go 中初始化
var DB *sql.DB

// Init 初始化数据库连接
// dbPath: 数据库文件路径（不含扩展名），如 "goblog" → goblog.db
// 使用 WAL 模式提升并发读写性能，cache=shared 允许多连接共享缓存
func Init(dbPath string) error {
	var err error
	// 构建 DSN：文件模式 + WAL 日志（提升并发写入性能）+ 共享缓存
	dsn := "file:" + dbPath + ".db?cache=shared&_journal_mode=WAL"
	DB, err = sql.Open("sqlite3", dsn)
	if err != nil {
		log.Printf("数据库连接失败: %v", err)
		return err
	}

	// 设置连接池参数
	// SQLite 只支持单写连接，设为 1 可避免 "database is locked" 错误
	DB.SetMaxOpenConns(1)
	DB.SetMaxIdleConns(1)

	// 验证连接是否真正可用
	if err = DB.Ping(); err != nil {
		log.Printf("数据库 Ping 失败: %v", err)
		return err
	}

	log.Println("数据库初始化成功:", dbPath+".db")
	return nil
}

// GetDB 返回全局数据库连接实例
// 供 models 层调用，确保 logic 层不直接持有 DB 引用
func GetDB() *sql.DB {
	return DB
}
