SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;


CREATE TABLE colunas_funil (
  id int NOT NULL,
  nome_coluna varchar(255) NOT NULL,
  id_funil int NOT NULL,
  total_oportunidades int DEFAULT '0',
  valor_total decimal(15,2) DEFAULT '0.00',
  sequencia int NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE configuracoes (
  id int NOT NULL,
  chave varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  valor text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  descricao varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  tipo enum('string','number','boolean','json') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contatos_whatsapp (
  id_contato varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ID único do contato (ex: sistema CRM) - Chave Primária',
  wpp_filial varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Telefone WhatsApp da filial (formato: 5527981920127)',
  wpp_contato varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Telefone WhatsApp do contato (formato: 5511989882867)',
  vendedor varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nome completo do vendedor',
  vendedor_id int NOT NULL COMMENT 'ID do vendedor na tabela vendedores',
  nome varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nome do contato',
  ativo tinyint(1) DEFAULT '1' COMMENT 'Contato ativo (1) ou inativo (0)',
  observacoes text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Observações sobre o contato',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contatos WhatsApp vinculados a vendedores e filiais';

CREATE TABLE cron_sync_history (
  id int NOT NULL,
  job_name varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  started_at datetime NOT NULL,
  completed_at datetime DEFAULT NULL,
  status enum('running','success','error') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'running',
  type enum('manual','scheduled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  records_inserted int DEFAULT NULL,
  records_updated int DEFAULT NULL,
  records_errors int DEFAULT NULL,
  error_message text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  duration_seconds decimal(10,2) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fila_leads_log (
  id int UNSIGNED NOT NULL,
  unidade_id int UNSIGNED NOT NULL COMMENT 'ID da unidade',
  vendedor_id int UNSIGNED NOT NULL COMMENT 'ID do vendedor que recebeu o lead',
  lead_id int UNSIGNED DEFAULT NULL COMMENT 'ID do lead distribuído',
  posicao_fila tinyint UNSIGNED NOT NULL COMMENT 'Posição do vendedor na fila (normalmente 1)',
  total_fila tinyint UNSIGNED NOT NULL COMMENT 'Total de vendedores na fila no momento',
  owner_anterior int UNSIGNED DEFAULT NULL COMMENT 'ID do owner anterior do lead',
  user_access_anterior text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'userAccess anterior do lead em JSON',
  department_access_anterior text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'departmentAccess anterior do lead em JSON',
  distribuido_em timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora da distribuição'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de distribuição de leads via fila rotativa com histórico antes/depois';

CREATE TABLE funis (
  id int NOT NULL,
  funil_nome varchar(255) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE metas_mensais (
  id int NOT NULL,
  vendedor_id int NOT NULL,
  unidade_id int NOT NULL,
  mes int NOT NULL,
  ano int NOT NULL,
  meta_valor decimal(12,2) NOT NULL DEFAULT '0.00',
  meta_descricao varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE motivos_de_perda (
  id int NOT NULL,
  motivo varchar(255) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notificacao_oportunidades (
  id int NOT NULL,
  oportunidade_id bigint UNSIGNED NOT NULL,
  nome varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  valor decimal(15,2) DEFAULT '0.00',
  status varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  data_criacao datetime NOT NULL,
  vendedor varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  unidade varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  cor varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cor customizada em formato hex (#RRGGBB)',
  consultado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE oportunidades (
  id bigint UNSIGNED NOT NULL,
  title varchar(255) NOT NULL,
  value decimal(15,2) DEFAULT '0.00',
  crm_column varchar(100) DEFAULT NULL,
  lead_id bigint UNSIGNED DEFAULT NULL,
  sequence int DEFAULT NULL,
  status varchar(20) DEFAULT NULL,
  loss_reason varchar(255) DEFAULT NULL,
  gain_reason varchar(255) DEFAULT NULL,
  expectedCloseDate date DEFAULT NULL,
  sale_channel varchar(100) DEFAULT NULL,
  campaign varchar(100) DEFAULT NULL,
  user varchar(100) DEFAULT NULL,
  last_column_change datetime DEFAULT NULL,
  last_status_change datetime DEFAULT NULL,
  gain_date datetime DEFAULT NULL,
  lost_date datetime DEFAULT NULL,
  reopen_date datetime DEFAULT NULL,
  await_column_approved tinyint(1) DEFAULT '0',
  await_column_approved_user varchar(100) DEFAULT NULL,
  reject_appro tinyint(1) DEFAULT '0',
  reject_appro_desc varchar(255) DEFAULT NULL,
  conf_installment json DEFAULT NULL,
  fields json DEFAULT NULL,
  dataLead json DEFAULT NULL,
  createDate datetime DEFAULT NULL,
  updateDate datetime DEFAULT NULL,
  archived tinyint(1) DEFAULT '0',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  coluna_funil_id int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE otp_codes (
  id int UNSIGNED NOT NULL,
  email varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email do vendedor/consultor',
  code varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Código OTP de 6 dígitos',
  vendedor_id int NOT NULL COMMENT 'ID do vendedor associado',
  expires_at datetime NOT NULL COMMENT 'Data/hora de expiração do código',
  verified tinyint(1) DEFAULT '0' COMMENT 'Se o código já foi usado (0 = não, 1 = sim)',
  verified_at datetime DEFAULT NULL COMMENT 'Data/hora da verificação',
  attempts int DEFAULT '0' COMMENT 'Número de tentativas de verificação',
  ip_address varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP de origem da solicitação',
  user_agent text COLLATE utf8mb4_unicode_ci COMMENT 'User agent do navegador',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Códigos OTP para autenticação de consultores';

CREATE TABLE unidades (
  id int NOT NULL,
  nome varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  responsavel varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  grupo_id int DEFAULT NULL,
  department_id int DEFAULT NULL,
  show_sac360 tinyint DEFAULT '0',
  show_crm tinyint DEFAULT '0',
  create_date datetime DEFAULT NULL,
  update_date datetime DEFAULT NULL,
  subs json DEFAULT NULL,
  users json DEFAULT NULL,
  permissions_groups json DEFAULT NULL,
  voip json DEFAULT NULL,
  branches json DEFAULT NULL,
  accs json DEFAULT NULL,
  google_business_messages json DEFAULT NULL,
  dpto_gestao int DEFAULT NULL COMMENT 'ID do sub-departamento de gestão',
  user_gestao json DEFAULT NULL COMMENT 'IDs dos usuários gestores do sub-departamento de gestão (array JSON)',
  ativo tinyint DEFAULT '1',
  synced_at timestamp NULL DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fila_leads json DEFAULT NULL COMMENT 'Sequência de vendedores na fila de leads (array de {vendedor_id, sequencia})'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE unidade_grupos (
  id int NOT NULL,
  nome varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  descricao varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ativo tinyint(1) DEFAULT '1',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios_sistema (
  id int NOT NULL,
  nome varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  email varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  whatsapp varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  senha varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  permissoes json DEFAULT NULL,
  ativo tinyint(1) DEFAULT '1',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reset_token varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  reset_token_expires datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendedores (
  id int NOT NULL,
  name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  lastName varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  email varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  cpf varchar(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  username varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  birthDate date NOT NULL,
  telephone varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  photo text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  admin tinyint DEFAULT '0',
  branch varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  position_company varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  skills text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  state varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  city varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  whatsapp_automation varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  last_login datetime DEFAULT NULL,
  last_action datetime DEFAULT NULL,
  status enum('active','inactive','blocked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  synced_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ativo tinyint(1) DEFAULT '1',
  unidade_id int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendedores_ausencias (
  id int NOT NULL,
  unidade_id int NOT NULL COMMENT 'ID da unidade',
  vendedor_id int NOT NULL COMMENT 'ID do vendedor que está ausente',
  data_inicio datetime NOT NULL COMMENT 'Data e hora de início da ausência (GMT-3 São Paulo)',
  data_fim datetime NOT NULL COMMENT 'Data e hora de fim da ausência (GMT-3 São Paulo)',
  motivo text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Motivo da ausência',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by int DEFAULT NULL COMMENT 'ID do usuário que criou a ausência'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


ALTER TABLE colunas_funil
  ADD PRIMARY KEY (id),
  ADD KEY idx_id_funil (id_funil),
  ADD KEY idx_sequencia (sequencia),
  ADD KEY idx_nome_coluna (nome_coluna),
  ADD KEY idx_funil_sequencia (id_funil,sequencia);

ALTER TABLE configuracoes
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY chave (chave);

ALTER TABLE contatos_whatsapp
  ADD PRIMARY KEY (id_contato),
  ADD KEY idx_vendedor_id (vendedor_id),
  ADD KEY idx_wpp_filial (wpp_filial),
  ADD KEY idx_wpp_contato (wpp_contato),
  ADD KEY idx_nome (nome),
  ADD KEY idx_ativo (ativo),
  ADD KEY idx_created_at (created_at);

ALTER TABLE cron_sync_history
  ADD PRIMARY KEY (id),
  ADD KEY idx_job_name (job_name),
  ADD KEY idx_started_at (started_at),
  ADD KEY idx_status (status),
  ADD KEY idx_type (type);

ALTER TABLE fila_leads_log
  ADD PRIMARY KEY (id),
  ADD KEY idx_unidade_id (unidade_id),
  ADD KEY idx_vendedor_id (vendedor_id),
  ADD KEY idx_lead_id (lead_id),
  ADD KEY idx_owner_anterior (owner_anterior),
  ADD KEY idx_unidade_distribuido (unidade_id,distribuido_em DESC),
  ADD KEY idx_lead_distribuido (lead_id,distribuido_em DESC),
  ADD KEY idx_distribuido_em (distribuido_em DESC);

ALTER TABLE funis
  ADD PRIMARY KEY (id),
  ADD KEY idx_funil_nome (funil_nome);

ALTER TABLE metas_mensais
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY unique_vendedor_unidade_mes_ano (vendedor_id,unidade_id,mes,ano),
  ADD KEY idx_vendedor_id (vendedor_id),
  ADD KEY idx_unidade_id (unidade_id),
  ADD KEY idx_mes_ano (mes,ano),
  ADD KEY idx_vendedor_unidade_mes (vendedor_id,unidade_id,mes,ano);

ALTER TABLE motivos_de_perda
  ADD PRIMARY KEY (id),
  ADD KEY idx_motivo (motivo);

ALTER TABLE notificacao_oportunidades
  ADD PRIMARY KEY (id),
  ADD KEY idx_oportunidade_id (oportunidade_id),
  ADD KEY idx_consultado_em (consultado_em),
  ADD KEY idx_status (status);

ALTER TABLE oportunidades
  ADD PRIMARY KEY (id),
  ADD KEY idx_created_at (created_at),
  ADD KEY idx_coluna_funil_id (coluna_funil_id);

ALTER TABLE otp_codes
  ADD PRIMARY KEY (id),
  ADD KEY idx_email (email),
  ADD KEY idx_code (code),
  ADD KEY idx_vendedor_id (vendedor_id),
  ADD KEY idx_expires_at (expires_at),
  ADD KEY idx_verified (verified),
  ADD KEY idx_email_code_valid (email,code,verified,expires_at);

ALTER TABLE unidades
  ADD PRIMARY KEY (id),
  ADD KEY idx_nome (nome),
  ADD KEY idx_name (name),
  ADD KEY idx_department_id (department_id),
  ADD KEY idx_ativo (ativo),
  ADD KEY idx_synced_at (synced_at),
  ADD KEY idx_dpto_gestao (dpto_gestao),
  ADD KEY idx_grupo_id (grupo_id);

ALTER TABLE unidade_grupos
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY uq_unidade_grupos_nome (nome),
  ADD KEY idx_unidade_grupos_ativo (ativo);

ALTER TABLE usuarios_sistema
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY email (email),
  ADD KEY idx_email (email),
  ADD KEY idx_ativo (ativo),
  ADD KEY idx_reset_token (reset_token);

ALTER TABLE vendedores
  ADD PRIMARY KEY (id),
  ADD UNIQUE KEY email (email),
  ADD UNIQUE KEY username (username),
  ADD KEY idx_email (email),
  ADD KEY idx_username (username),
  ADD KEY idx_status (status),
  ADD KEY idx_synced_at (synced_at),
  ADD KEY idx_ativo (ativo),
  ADD KEY idx_unidade_id (unidade_id);

ALTER TABLE vendedores_ausencias
  ADD PRIMARY KEY (id),
  ADD KEY idx_unidade_id (unidade_id),
  ADD KEY idx_vendedor_id (vendedor_id),
  ADD KEY idx_data_inicio (data_inicio),
  ADD KEY idx_data_fim (data_fim),
  ADD KEY idx_periodo_ausencia (vendedor_id,data_inicio,data_fim);


ALTER TABLE configuracoes
  MODIFY id int NOT NULL AUTO_INCREMENT;

ALTER TABLE cron_sync_history
  MODIFY id int NOT NULL AUTO_INCREMENT;

ALTER TABLE fila_leads_log
  MODIFY id int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE metas_mensais
  MODIFY id int NOT NULL AUTO_INCREMENT;

ALTER TABLE notificacao_oportunidades
  MODIFY id int NOT NULL AUTO_INCREMENT;

ALTER TABLE otp_codes
  MODIFY id int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE unidades
  MODIFY id int NOT NULL AUTO_INCREMENT;

ALTER TABLE unidade_grupos
  MODIFY id int NOT NULL AUTO_INCREMENT;

ALTER TABLE usuarios_sistema
  MODIFY id int NOT NULL AUTO_INCREMENT;

ALTER TABLE vendedores_ausencias
  MODIFY id int NOT NULL AUTO_INCREMENT;


ALTER TABLE colunas_funil
  ADD CONSTRAINT colunas_funil_ibfk_1 FOREIGN KEY (id_funil) REFERENCES funis (id) ON DELETE CASCADE;

ALTER TABLE vendedores_ausencias
  ADD CONSTRAINT fk_ausencias_unidade FOREIGN KEY (unidade_id) REFERENCES unidades (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT fk_ausencias_vendedor FOREIGN KEY (vendedor_id) REFERENCES vendedores (id) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
