-- ============================================================
-- CRIAR USUÁRIO ADMINISTRATIVO NO SISTEMA
-- ============================================================
-- Email: cezarfreitas2011@gmail.com
-- Senha: Designer@13
-- Data: 10 de dezembro de 2025
-- ============================================================

-- Inserir usuário na tabela usuarios_sistema
INSERT INTO usuarios_sistema (
  nome,
  email,
  whatsapp,
  senha,
  permissoes,
  ativo,
  created_at,
  updated_at
) VALUES (
  'Cezar Freitas',
  'cezarfreitas2011@gmail.com',
  NULL,
  '$2b$12$DHQs35ZdsWLlWLJHzkYTbOkdxQvByPC/r4A.kfQK23EWWR0dlaXQK',
  '["admin", "usuarios", "vendedores", "oportunidades", "relatorios", "configuracoes"]',
  1,
  NOW(),
  NOW()
);

-- ============================================================
-- VERIFICAR SE O USUÁRIO FOI CRIADO
-- ============================================================
SELECT 
  id,
  nome,
  email,
  ativo,
  permissoes,
  created_at
FROM usuarios_sistema
WHERE email = 'cezarfreitas2011@gmail.com';

-- ============================================================
-- INFORMAÇÕES PARA LOGIN
-- ============================================================
-- URL: https://seu-dominio.com/sistema/login
-- Email: cezarfreitas2011@gmail.com
-- Senha: Designer@13
-- Permissões: ADMIN TOTAL (todas as funcionalidades)
-- ============================================================



