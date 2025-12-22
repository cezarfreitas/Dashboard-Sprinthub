-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: projetos_bancointeli:3306
-- Tempo de geração: 22/12/2025 às 12:01
-- Versão do servidor: 9.5.0
-- Versão do PHP: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `bancointeli`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `metas_mensais`
--

CREATE TABLE `metas_mensais` (
  `id` int NOT NULL,
  `vendedor_id` int NOT NULL,
  `unidade_id` int NOT NULL,
  `mes` int NOT NULL,
  `ano` int NOT NULL,
  `meta_valor` decimal(12,2) NOT NULL DEFAULT '0.00',
  `meta_descricao` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `metas_mensais`
--

INSERT INTO `metas_mensais` (`id`, `vendedor_id`, `unidade_id`, `mes`, `ano`, `meta_valor`, `meta_descricao`, `created_at`, `updated_at`) VALUES
(1, 256, 90, 11, 2025, 120162.37, 'Importado do Excel - Christian BA OUTDOOR', '2025-12-22 11:59:27', '2025-12-22 11:59:27'),
(2, 253, 90, 11, 2025, 0.01, 'Importado do Excel - Rosivaldo BA OUTDOOR', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(3, 254, 90, 11, 2025, 80108.25, 'Importado do Excel - Fernanda BA OUTDOOR', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(4, 232, 91, 11, 2025, 50616.33, 'Importado do Excel - Antonio CARRO DE SOM', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(5, 233, 91, 11, 2025, 50616.33, 'Importado do Excel - Joao e Caio carro de som', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(6, 250, 92, 12, 2025, 70000.00, 'Importado do Excel - Michelle CE e RN', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(7, 220, 92, 11, 2025, 489291.17, 'Importado do Excel - Michael CE', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(8, 220, 92, 12, 2025, 489291.17, 'Importado do Excel - Michael CE', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(9, 257, 93, 11, 2025, 127000.00, 'Importado do Excel - Paulo DF/GO OUTDOOR', '2025-12-22 11:59:28', '2025-12-22 11:59:28'),
(10, 257, 93, 12, 2025, 254000.00, 'Importado do Excel - Paulo DF/GO OUTDOOR', '2025-12-22 11:59:29', '2025-12-22 11:59:29'),
(11, 227, 94, 11, 2025, 31620.32, 'Importado do Excel - Ale ES OUTDOOR', '2025-12-22 11:59:29', '2025-12-22 11:59:29'),
(12, 227, 94, 12, 2025, 50000.00, 'Importado do Excel - Ale ES OUTDOOR', '2025-12-22 11:59:29', '2025-12-22 11:59:29'),
(13, 247, 94, 11, 2025, 50000.00, 'Importado do Excel - Ana ES OUTDOOR', '2025-12-22 11:59:29', '2025-12-22 11:59:29'),
(14, 247, 94, 12, 2025, 80000.00, 'Importado do Excel - Ana ES OUTDOOR', '2025-12-22 11:59:29', '2025-12-22 11:59:29'),
(15, 228, 94, 11, 2025, 150000.00, 'Importado do Excel - Gilmar ES OUTDOOR', '2025-12-22 11:59:29', '2025-12-22 11:59:29'),
(16, 228, 94, 12, 2025, 101620.32, 'Importado do Excel - Gilmar ES OUTDOOR', '2025-12-22 11:59:29', '2025-12-22 11:59:29'),
(17, 328, 96, 12, 2025, 50000.00, 'Importado do Excel - Felipe ESTRUTURAS SP', '2025-12-22 11:59:30', '2025-12-22 11:59:30'),
(18, 263, 96, 11, 2025, 234000.00, 'Importado do Excel - Fernando ESTRUTURAS SP', '2025-12-22 11:59:30', '2025-12-22 11:59:30'),
(19, 263, 96, 12, 2025, 234000.00, 'Importado do Excel - Fernando ESTRUTURAS SP', '2025-12-22 11:59:30', '2025-12-22 11:59:30'),
(20, 224, 97, 11, 2025, 485916.75, 'Importado do Excel - Marcio Grandes Contas', '2025-12-22 11:59:30', '2025-12-22 11:59:30'),
(21, 224, 97, 12, 2025, 485916.75, 'Importado do Excel - Marcio Grandes Contas', '2025-12-22 11:59:30', '2025-12-22 11:59:30'),
(22, 284, 101, 11, 2025, 300000.00, 'Importado do Excel - André MG OUTDOOR', '2025-12-22 11:59:30', '2025-12-22 11:59:30'),
(23, 284, 101, 12, 2025, 178000.00, 'Importado do Excel - André MG OUTDOOR', '2025-12-22 11:59:30', '2025-12-22 11:59:30'),
(24, 282, 101, 11, 2025, 50000.00, 'Importado do Excel - Charles MG OUTDOOR', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(25, 278, 101, 11, 2025, 180000.00, 'Importado do Excel - Silvia MG OUTDOOR', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(26, 278, 101, 12, 2025, 178000.00, 'Importado do Excel - Silvia MG OUTDOOR', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(27, 281, 101, 11, 2025, 180000.00, 'Importado do Excel - Gustavo MG OUTDOOR', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(28, 281, 101, 12, 2025, 178000.00, 'Importado do Excel - Gustavo MG OUTDOOR', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(29, 280, 101, 11, 2025, 180000.00, 'Importado do Excel - Rayan MG OUTDOOR', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(30, 280, 101, 12, 2025, 178000.00, 'Importado do Excel - Rayan MG OUTDOOR', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(31, 236, 102, 11, 2025, 123421.37, 'Importado do Excel - Leonardo MS OUTDOORS', '2025-12-22 11:59:31', '2025-12-22 11:59:31'),
(32, 236, 102, 12, 2025, 302755.00, 'Importado do Excel - Leonardo MS OUTDOORS', '2025-12-22 11:59:32', '2025-12-22 11:59:32'),
(33, 234, 102, 11, 2025, 155170.90, 'Importado do Excel - Raissa MS OUTDOORS', '2025-12-22 11:59:32', '2025-12-22 11:59:32'),
(34, 234, 102, 12, 2025, 355720.00, 'Importado do Excel - Raissa MS OUTDOORS', '2025-12-22 11:59:32', '2025-12-22 11:59:32'),
(35, 287, 103, 11, 2025, 242250.00, 'Importado do Excel - Daniel MT OUTDOORS', '2025-12-22 11:59:32', '2025-12-22 11:59:32'),
(36, 287, 103, 12, 2025, 484500.00, 'Importado do Excel - Daniel MT OUTDOORS', '2025-12-22 11:59:32', '2025-12-22 11:59:32'),
(37, 288, 103, 12, 2025, 0.01, 'Importado do Excel - Carilene DF/GO - MT OUTDOORS', '2025-12-22 11:59:32', '2025-12-22 11:59:32'),
(38, 229, 104, 11, 2025, 0.01, 'Importado do Excel - André NORDESTE', '2025-12-22 11:59:32', '2025-12-22 11:59:32'),
(39, 229, 104, 12, 2025, 0.01, 'Importado do Excel - André NORDESTE', '2025-12-22 11:59:33', '2025-12-22 11:59:33'),
(40, 230, 104, 11, 2025, 119662.54, 'Importado do Excel - João NORDESTE', '2025-12-22 11:59:33', '2025-12-22 11:59:33'),
(41, 230, 104, 12, 2025, 119662.54, 'Importado do Excel - João NORDESTE', '2025-12-22 11:59:33', '2025-12-22 11:59:33'),
(42, 245, 104, 11, 2025, 99000.00, 'Importado do Excel - Vinicius NORDESTE', '2025-12-22 11:59:33', '2025-12-22 11:59:33'),
(43, 245, 104, 12, 2025, 99000.00, 'Importado do Excel - Vinicius NORDESTE', '2025-12-22 11:59:33', '2025-12-22 11:59:33'),
(44, 290, 105, 11, 2025, 218662.54, 'Importado do Excel - Chico NORTE OUTDOOR', '2025-12-22 11:59:33', '2025-12-22 11:59:33'),
(45, 290, 105, 12, 2025, 218663.00, 'Importado do Excel - Chico NORTE OUTDOOR', '2025-12-22 11:59:33', '2025-12-22 11:59:33'),
(46, 292, 105, 12, 2025, 0.01, 'Importado do Excel - Joao PA e PE', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(47, 293, 106, 11, 2025, 489291.17, 'Importado do Excel - Mauro PA OUTDOOR', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(48, 293, 106, 12, 2025, 489291.17, 'Importado do Excel - Mauro PA OUTDOOR', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(49, 292, 106, 12, 2025, 0.01, 'Importado do Excel - Joao PA e PE', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(50, 291, 107, 12, 2025, 0.01, 'Importado do Excel - Gabi PE / GRANDES CONTAS', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(51, 326, 107, 12, 2025, 174930.03, 'Importado do Excel - Rodrigo PE OUTDOOR', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(52, 300, 108, 11, 2025, 215020.00, 'Importado do Excel - Bruno PR OUTDOOR', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(53, 300, 108, 12, 2025, 215500.00, 'Importado do Excel - Bruno PR OUTDOOR', '2025-12-22 11:59:34', '2025-12-22 11:59:34'),
(54, 299, 108, 11, 2025, 71120.00, 'Importado do Excel - Dirlei PR OUTDOOR', '2025-12-22 11:59:35', '2025-12-22 11:59:35'),
(55, 298, 108, 12, 2025, 120200.00, 'Importado do Excel - Kaila PR OUTDOOR', '2025-12-22 11:59:35', '2025-12-22 11:59:35'),
(56, 297, 108, 11, 2025, 350040.00, 'Importado do Excel - Kailaine PR OUTDOOR', '2025-12-22 11:59:35', '2025-12-22 11:59:35'),
(57, 297, 108, 12, 2025, 300000.00, 'Importado do Excel - Kailaine PR OUTDOOR', '2025-12-22 11:59:35', '2025-12-22 11:59:35'),
(58, 296, 108, 11, 2025, 215020.00, 'Importado do Excel - Tatiane PR OUTDOOR', '2025-12-22 11:59:35', '2025-12-22 11:59:35'),
(59, 296, 108, 12, 2025, 215500.00, 'Importado do Excel - Tatiane PR OUTDOOR', '2025-12-22 11:59:35', '2025-12-22 11:59:35'),
(60, 304, 109, 11, 2025, 335282.56, 'Importado do Excel - Francieli RG OUTDOOR', '2025-12-22 11:59:35', '2025-12-22 11:59:35'),
(61, 304, 109, 12, 2025, 360144.00, 'Importado do Excel - Francieli RG OUTDOOR', '2025-12-22 11:59:36', '2025-12-22 11:59:36'),
(62, 303, 109, 11, 2025, 335282.56, 'Importado do Excel - Ricardo RG OUTDOOR', '2025-12-22 11:59:36', '2025-12-22 11:59:36'),
(63, 303, 109, 12, 2025, 360144.00, 'Importado do Excel - Ricardo RG OUTDOOR', '2025-12-22 11:59:36', '2025-12-22 11:59:36'),
(64, 309, 110, 11, 2025, 310000.00, 'Importado do Excel - Eduardo Moto RJ OUTDOOR', '2025-12-22 11:59:36', '2025-12-22 11:59:36'),
(65, 306, 110, 11, 2025, 310000.00, 'Importado do Excel - Walter RJ OUTDOOR', '2025-12-22 11:59:36', '2025-12-22 11:59:36'),
(66, 250, 111, 11, 2025, 50000.00, 'Importado do Excel - Michelle CE e RN', '2025-12-22 11:59:36', '2025-12-22 11:59:36'),
(67, 243, 111, 11, 2025, 186268.09, 'Importado do Excel - Gustavo RN OUTDOOR', '2025-12-22 11:59:36', '2025-12-22 11:59:36'),
(68, 243, 111, 12, 2025, 186268.09, 'Importado do Excel - Gustavo RN OUTDOOR', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(69, 251, 112, 12, 2025, 0.01, 'Importado do Excel - Paulo Silva', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(70, 223, 112, 11, 2025, 310446.81, 'Importado do Excel - Cristiane SC', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(71, 223, 112, 12, 2025, 280000.00, 'Importado do Excel - Cristiane SC', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(72, 221, 112, 11, 2025, 310446.81, 'Importado do Excel - Fernando SC OUTDOOR', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(73, 221, 112, 12, 2025, 280000.00, 'Importado do Excel - Fernando SC OUTDOOR', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(74, 218, 112, 11, 2025, 310446.81, 'Importado do Excel - Luana SC', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(75, 218, 112, 12, 2025, 280000.00, 'Importado do Excel - Luana SC', '2025-12-22 11:59:37', '2025-12-22 11:59:37'),
(76, 317, 113, 11, 2025, 204028.15, 'Importado do Excel - Diogo SP OUTDOOR', '2025-12-22 11:59:38', '2025-12-22 11:59:38'),
(77, 317, 113, 12, 2025, 340592.11, 'Importado do Excel - Diogo SP OUTDOOR', '2025-12-22 11:59:38', '2025-12-22 11:59:38'),
(78, 316, 113, 11, 2025, 356046.99, 'Importado do Excel - Fran SP OUTDOOR', '2025-12-22 11:59:38', '2025-12-22 11:59:38'),
(79, 316, 113, 12, 2025, 513894.73, 'Importado do Excel - Fran SP OUTDOOR', '2025-12-22 11:59:38', '2025-12-22 11:59:38'),
(80, 315, 113, 11, 2025, 180000.00, 'Importado do Excel - Giovanna SP OUTDOOR', '2025-12-22 11:59:38', '2025-12-22 11:59:38'),
(81, 315, 113, 12, 2025, 185000.00, 'Importado do Excel - Giovanna SP OUTDOOR', '2025-12-22 11:59:38', '2025-12-22 11:59:38'),
(82, 312, 113, 11, 2025, 222529.37, 'Importado do Excel - Manoela SP OUTDOOR', '2025-12-22 11:59:38', '2025-12-22 11:59:38'),
(83, 312, 113, 12, 2025, 321184.20, 'Importado do Excel - Manoela SP OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39'),
(84, 310, 113, 11, 2025, 0.01, 'Importado do Excel - Vinicius SP OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39'),
(85, 311, 113, 11, 2025, 1054389.25, 'Importado do Excel - Nadine SP OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39'),
(86, 311, 113, 12, 2025, 1447945.83, 'Importado do Excel - Nadine SP OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39'),
(87, 319, 114, 11, 2025, 255500.00, 'Importado do Excel - Thais TO OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39'),
(88, 319, 114, 12, 2025, 130000.00, 'Importado do Excel - Thais TO OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39'),
(89, 276, 115, 11, 2025, 255500.00, 'Importado do Excel - Lucas MA OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39'),
(90, 276, 115, 12, 2025, 130000.00, 'Importado do Excel - Lucas MA OUTDOOR', '2025-12-22 11:59:39', '2025-12-22 11:59:39');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `metas_mensais`
--
ALTER TABLE `metas_mensais`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_vendedor_unidade_mes_ano` (`vendedor_id`,`unidade_id`,`mes`,`ano`),
  ADD KEY `idx_vendedor_id` (`vendedor_id`),
  ADD KEY `idx_unidade_id` (`unidade_id`),
  ADD KEY `idx_mes_ano` (`mes`,`ano`),
  ADD KEY `idx_vendedor_unidade_mes` (`vendedor_id`,`unidade_id`,`mes`,`ano`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `metas_mensais`
--
ALTER TABLE `metas_mensais`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
