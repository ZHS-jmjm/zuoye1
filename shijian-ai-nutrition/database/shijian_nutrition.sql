-- ============================================================
-- 食鉴 · AI 营养分析师 —— MySQL 数据库初始化脚本
-- 数据库：shijian_nutrition（utf8mb4）
--
-- 使用方式（任选其一）：
--   A. 直接运行：后端 server/server.js 启动时会自动建库建表并创建演示账号，
--      无需手动导入本文件。
--   B. 手动导入（比如想在图形工具里查看）：
--      "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql" -u root -p < shijian_nutrition.sql
--
-- 表结构：
--   users             用户表（账号、scrypt 密码散列、每日热量目标）
--   sessions          登录会话表（token，7 天有效）
--   intake_meals      今日摄入明细（每餐一行，支持单餐删除）
--   analysis_history  AI 分析历史（每次分析的报告摘要）
-- ============================================================

CREATE DATABASE IF NOT EXISTS shijian_nutrition DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shijian_nutrition;

-- ---------- 用户表 ----------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)      NOT NULL COMMENT '用户名（唯一）',
  password_hash VARCHAR(255)     NOT NULL COMMENT 'scrypt 散列，格式 salt:key（演示用，非生产级）',
  goal          INT              NOT NULL DEFAULT 2000 COMMENT '每日热量目标 kcal',
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ---------- 登录会话表 ----------
CREATE TABLE IF NOT EXISTS sessions (
  token      CHAR(64)     NOT NULL COMMENT '会话令牌（SHA-256 十六进制）',
  user_id    INT UNSIGNED NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME     NOT NULL COMMENT '过期时间（7 天）',
  PRIMARY KEY (token),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录会话表';

-- ---------- 今日摄入明细表 ----------
CREATE TABLE IF NOT EXISTS intake_meals (
  id        INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id   INT UNSIGNED   NOT NULL,
  meal_date DATE           NOT NULL COMMENT '记录日期',
  name      VARCHAR(100)   NOT NULL COMMENT '餐食名称',
  calories  DECIMAL(8,2)   NOT NULL DEFAULT 0 COMMENT '热量 kcal',
  protein   DECIMAL(8,2)   NOT NULL DEFAULT 0 COMMENT '蛋白质 g',
  carb      DECIMAL(8,2)   NOT NULL DEFAULT 0 COMMENT '碳水 g',
  fat       DECIMAL(8,2)   NOT NULL DEFAULT 0 COMMENT '脂肪 g',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_date (user_id, meal_date),
  CONSTRAINT fk_meals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='今日摄入明细（每餐一行）';

-- ---------- AI 分析历史表 ----------
CREATE TABLE IF NOT EXISTS analysis_history (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NOT NULL,
  source     ENUM('image','text') NOT NULL DEFAULT 'text' COMMENT '分析来源',
  food_text  VARCHAR(500)  NULL COMMENT '用户输入的文字描述',
  score      INT           NULL COMMENT '健康评分 0-100',
  calories   DECIMAL(8,2)  NULL,
  protein    DECIMAL(8,2)  NULL,
  carb       DECIMAL(8,2)  NULL,
  fat        DECIMAL(8,2)  NULL,
  fiber      DECIMAL(8,2)  NULL,
  report     JSON          NULL COMMENT '完整分析报告 JSON',
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_user (user_id, created_at),
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 分析历史';

-- ---------- 演示账号：test / 123456 ----------
-- password_hash 是 scrypt("123456", salt, 64) 的 "salt:key" 形式，
-- 与 server/db.js 里的 verifyPassword() 算法一致。
INSERT IGNORE INTO users (username, password_hash, goal)
VALUES ('test', 'd0347d41f363f15e3bed3038bdaab399:d7cbe0ee97e5757f09c4f56cd1fc63fdbef14a8fc740750a7281cc0bcc7745b2025e7212cc69edb5039cd679d770a8a8f29065b81087f42ab026158c701eab1b', 2000);

-- 给演示账号塞两笔今天的记录，主页「今日概览」打开就有数据
INSERT INTO intake_meals (user_id, meal_date, name, calories, protein, carb, fat)
SELECT id, CURDATE(), '燕麦牛奶粥', 320, 12, 48, 8 FROM users WHERE username = 'test';

INSERT INTO intake_meals (user_id, meal_date, name, calories, protein, carb, fat)
SELECT id, CURDATE(), '番茄炒蛋盖饭', 620, 18, 88, 20 FROM users WHERE username = 'test';
