
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `shijian_nutrition` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `shijian_nutrition`;
DROP TABLE IF EXISTS `analysis_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `source` enum('image','text') NOT NULL DEFAULT 'text',
  `food_text` varchar(500) DEFAULT NULL,
  `score` int DEFAULT NULL,
  `calories` decimal(8,2) DEFAULT NULL,
  `protein` decimal(8,2) DEFAULT NULL,
  `carb` decimal(8,2) DEFAULT NULL,
  `fat` decimal(8,2) DEFAULT NULL,
  `fiber` decimal(8,2) DEFAULT NULL,
  `report` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_history_user` (`user_id`,`created_at`),
  CONSTRAINT `fk_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI 分析历史';
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `analysis_history` WRITE;
/*!40000 ALTER TABLE `analysis_history` DISABLE KEYS */;
INSERT INTO `analysis_history` VALUES (3,1,'text','一份番茄炒蛋盖饭',86,620.00,22.00,78.00,24.00,4.00,NULL,'2026-11-11 09:46:12'),(4,1,'text','回锅肉盖饭',55,750.00,25.00,85.00,35.00,3.00,'{\"fat\": 35, \"carb\": 85, \"fiber\": 3, \"foods\": [{\"name\": \"回锅肉\", \"note\": \"约150克，含五花肉、蒜苗、青椒、豆瓣酱\"}, {\"name\": \"米饭\", \"note\": \"约200克\"}], \"score\": 55, \"comment\": \"回锅肉盖饭很香，但五花肉脂肪和豆瓣酱的油盐都偏高，蔬菜量偏少、纤维不足。建议把米饭减到150克左右，加一份清炒绿叶菜，回锅肉选瘦肉多些、少放油盐，这样更均衡。\", \"protein\": 25, \"calories\": 750}','2026-11-11 13:11:05'),(5,1,'text','大杯全糖珍珠奶茶',20,650.00,5.00,115.00,16.00,1.00,'{\"fat\": 16, \"carb\": 115, \"fiber\": 1, \"foods\": [{\"name\": \"全糖珍珠奶茶\", \"note\": \"大杯约700ml，全糖，含珍珠\"}], \"score\": 20, \"comment\": \"这杯大杯全糖珍珠奶茶热量和添加糖都很高，珍珠又主要是淀粉，蛋白质和膳食纤维很少，饱腹感短、血糖波动大。偶尔解馋可以，建议选小杯、三分糖或无糖，少加珍珠，搭配无糖茶或蛋白质食物。\", \"protein\": 5, \"calories\": 650}','2026-11-11 13:12:00'),(6,1,'text','大杯全糖珍珠奶茶',25,650.00,4.00,115.00,14.00,0.00,'{\"fat\": 14, \"carb\": 115, \"fiber\": 0, \"foods\": [{\"name\": \"珍珠奶茶\", \"note\": \"大杯约700ml，全糖，含珍珠\"}], \"score\": 25, \"comment\": \"这杯大杯全糖珍珠奶茶热量和糖分都偏高，珍珠带来大量精制碳水，膳食纤维几乎为零，蛋白质也很少。偶尔解馋可以，建议选小杯、半糖或无糖，少加珍珠，搭配坚果或鸡蛋补充蛋白质；平时多喝水。\", \"protein\": 4, \"calories\": 650}','2026-11-11 13:15:26');
/*!40000 ALTER TABLE `analysis_history` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `intake_meals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `intake_meals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `meal_date` date NOT NULL,
  `name` varchar(100) NOT NULL,
  `calories` decimal(8,2) NOT NULL DEFAULT '0.00',
  `protein` decimal(8,2) NOT NULL DEFAULT '0.00',
  `carb` decimal(8,2) NOT NULL DEFAULT '0.00',
  `fat` decimal(8,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`meal_date`),
  CONSTRAINT `fk_meals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='今日摄入明细';
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `intake_meals` WRITE;
/*!40000 ALTER TABLE `intake_meals` DISABLE KEYS */;
INSERT INTO `intake_meals` VALUES (3,1,'2026-11-11','燕麦牛奶粥',320.00,12.00,48.00,8.00,'2026-11-11 08:51:57'),(4,1,'2026-11-11','番茄炒蛋盖饭',620.00,18.00,88.00,20.00,'2026-11-11 08:51:57');
/*!40000 ALTER TABLE `intake_meals` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `token` char(64) NOT NULL,
  `user_id` int unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`token`),
  KEY `fk_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='登录会话表';
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('0d353112fa2d40d49f2eb7d4e7afacd2efc9b380d98d19a4e5c1a2eac701cd85',1,'2026-11-11 11:05:45','2026-11-18 19:05:45'),('1114e9f225e44c606823a8d77e645b7dd6e2574c4c4180af707a5e0f0fa6e87a',1,'2026-11-11 08:50:39','2026-11-18 16:50:39'),('35a5b67d6e1bcbbb69734c9ec183435240652050c356a54980ddf2c1115b5913',1,'2026-11-11 11:09:47','2026-11-18 19:09:47'),('40967ee0cdcd3b98dcd5dc5da27cb81d482e35eb650f6919baf2a5b9feeb985d',1,'2026-11-11 11:24:42','2026-11-18 19:24:42'),('4dc397b05b803d344969c7b138f4b8100c4ee9de2368d719d83676a875072564',1,'2026-11-11 11:35:08','2026-11-18 19:35:08'),('5d8bfe40ed20e0ba5c2fedaa37dcbc1e69a5087850b822a4c3487241a89c705e',1,'2026-11-11 09:13:55','2026-11-18 17:13:55'),('6503c8b515340e7d0f3d4661e9aa5077081ce55398c63130c0107aedf1191f50',1,'2026-11-11 11:04:28','2026-11-18 19:04:28'),('6a3bb578623deb6624df87f6ac68b768d55795a90f9f81cd9521aa3b2490579c',1,'2026-11-11 11:02:50','2026-11-18 19:02:50'),('862da9e99137f330efc501deec21c3498706ce1444660204a72b0a2ac370926a',1,'2026-11-11 13:00:59','2026-11-18 21:00:59'),('8ac4f7ce81e03a9dccff095126e6ebf006bf9c8685c3840a228a1d91cdb06dad',1,'2026-11-11 09:45:39','2026-11-18 17:45:39'),('900a4228da096a37eaa3701476fbae2cae26c080780e56c3588bb1298f0a56d0',1,'2026-11-11 11:12:30','2026-11-18 19:12:30'),('90271c90dd89c0a6abb533e3d330d64934410b4d1578498c7168647e31f5189f',1,'2026-11-11 13:09:18','2026-11-18 21:09:18'),('95c250c800bbee6e78a7ec751ab57591b4e1b004c65e9a5ca56b3b788b9a1321',1,'2026-11-11 11:11:15','2026-11-18 19:11:15'),('99475dcc3a15f4a608cbdff12d8746112a0e1301bf8cd59e83471ba2932470a4',1,'2026-11-11 08:50:52','2026-11-18 16:50:52'),('995a0af910f1ba224c242e104056fff67d3b02374f2d041fee0bc6ea0102f832',1,'2026-11-11 11:04:15','2026-11-18 19:04:15'),('9eac4e53f5ca002a2cd07e017b6e1194107da1ac4cdeaf95f776da1375303368',1,'2026-11-11 11:37:55','2026-11-18 19:37:55'),('a0db19fa0f904870f029ea5227327a58bdb788b2e25375f175ac63fdee29c182',1,'2026-11-11 11:34:50','2026-11-18 19:34:50'),('a39a2644f6baf1a46794c18f80eed30bc5ce25a56bcb4bcb3b4e60666ea93699',1,'2026-11-11 11:26:34','2026-11-18 19:26:34'),('b65c956963dcb8a44428e0330263c3599c6b887f6e5c9f0c6d134783d2b3fddf',1,'2026-11-11 08:51:14','2026-11-18 16:51:14'),('c7908b577808bbcf67b8ab5c0850245b33c3d5d2ad01d14b90fefdf0f531ebef',1,'2026-11-11 13:15:14','2026-11-18 21:15:14'),('cb54d6e717bdb61a06af153287dc97314398529265ce736b2c3ce43110abd29f',1,'2026-11-11 11:51:02','2026-11-18 19:51:02'),('d3cc5bf6910d1511f13bbb72cb0eee0195cfb6dfd84262ed1a27c951f2785314',1,'2026-11-11 10:52:10','2026-11-18 18:52:10'),('d45ad46873fa9a243181aa46e6d4360a0e48aa57c09058bf91c34df3401ec66a',1,'2026-11-11 11:20:05','2026-11-18 19:20:05'),('d947f56f63addd93aaea59a9040e9516b2c01208ea1cf9721f5dc87af6f3c1f5',1,'2026-11-11 12:30:53','2026-11-18 20:30:53'),('dd01787192f0ec99e017287c05d091836e34fc0c83e0cd9f765f3e6ecde484f5',1,'2026-11-11 08:54:17','2026-11-18 16:54:17'),('ea825bbdd0aa78c9b67e86382ded2966bb936bb79a4970a48f45fefbb5e06d79',1,'2026-11-11 11:18:29','2026-11-18 19:18:29'),('eae89b0c5913fc2ad998ded241a95e6f8f03e3fcf3f0f587b7f0c49b3a9e7453',1,'2026-11-11 10:59:29','2026-11-18 18:59:29'),('ef3b239176736255606732e2f6a337c17e8eb447f8642a95db3c48a58c084128',1,'2026-11-11 11:16:50','2026-11-18 19:16:50');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `goal` int NOT NULL DEFAULT '2000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'test','3cda78033a1fc3baad95ea3994a86047:caed28832cb163bbb5fcc416b01f04d3cc9c61ee1fe27bdf83d0af6d4008f52d12e5b96f9b74550c020e27b5a5eeed12d2bf0203c85943f611af168a0c09631e',2000,'2026-11-11 08:50:27');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

