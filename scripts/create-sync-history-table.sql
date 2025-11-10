-- Tabela para armazenar histórico de sincronizações de cron jobs
CREATE TABLE IF NOT EXISTS cron_sync_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  status ENUM('running', 'success', 'error') NOT NULL DEFAULT 'running',
  type ENUM('manual', 'scheduled') NOT NULL DEFAULT 'scheduled',
  records_inserted INT NULL,
  records_updated INT NULL,
  records_errors INT NULL,
  error_message TEXT NULL,
  duration_seconds DECIMAL(10, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_job_name (job_name),
  INDEX idx_started_at (started_at),
  INDEX idx_status (status),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir alguns registros de exemplo (opcional - remover em produção)
-- INSERT INTO cron_sync_history (job_name, started_at, completed_at, status, type, records_updated) 
-- VALUES ('vendedores-sync', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY + INTERVAL 30 SECOND, 'success', 'scheduled', 96);










