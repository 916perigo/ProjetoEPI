-- ====================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - SISTEMA CONTROLE EPI
-- FASE: MVP (ESTRUTURA SIMPLIFICADA - SENHAS EM TEXTO LIMPO)
-- COM ATUALIZAÇÃO (MATRICULA E CARGO INCLUÍDOS)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS controle_epi;
USE controle_epi;

-- 1. TABELA DE UTILIZADORES
CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    matricula VARCHAR(50),
    cargo VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL -- Armazenamento em texto simples
);

-- 2. TABELA DE EPIS
CREATE TABLE epis (
    id_epi INT PRIMARY KEY AUTO_INCREMENT,
    nome_epi VARCHAR(100) NOT NULL
);

-- 3. TABELA DE LEITURA DE EPI
CREATE TABLE leituras_epi (
    id_leitura INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Aprovado', 'Reprovado') NOT NULL, 
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE solicitacoes (
    id_solicitacao INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL, -- <-- ADICIONADO: Quem está solicitando?
    id_epi INT NOT NULL,     -- <-- Vinculado ao Combobox do HTML
    descricao VARCHAR(1000),
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- <-- ADICIONADO: Útil para controle do admin
    status_solicitacao ENUM('Pendente', 'Entregue', 'Cancelado') DEFAULT 'Pendente', -- <-- SUGESTÃO para o fluxo do MVP
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    FOREIGN KEY (id_epi) REFERENCES epis(id_epi) ON DELETE RESTRICT
);

-- 4. TABELA DE IMAGENS (Integração Bucket Supabase)
CREATE TABLE imagens_leitura (
    id_imagem INT PRIMARY KEY AUTO_INCREMENT,
    id_leitura INT NOT NULL,
    url_supabase VARCHAR(512) NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_leitura) REFERENCES leituras_epi(id_leitura) ON DELETE CASCADE
);

-- ====================================================================
--                    OTIMIZAÇÃO E RELATÓRIOS
-- ====================================================================

-- View Otimizada para a Página de Relatórios do Administrador
CREATE OR REPLACE VIEW vw_relatorio_administrador AS
SELECT 
    l.id_leitura,
    u.nome AS nome_usuario,
    u.email AS email_usuario,
    l.data_hora AS data_leitura,
    l.status AS status_leitura,
    img.url_supabase AS link_foto_supabase
FROM leituras_epi l
INNER JOIN usuarios u ON l.id_usuario = u.id_usuario
LEFT JOIN imagens_leitura img ON l.id_leitura = img.id_leitura;

-- ====================================================================
--            INSERÇÃO DE EXEMPLOS (POPULAR O BANCO)
-- ====================================================================

-- Inserção de EPIs de Exemplo
INSERT INTO epis (nome_epi) VALUES 
('Capacete de Segurança'),
('Óculos de Proteção Incolor'),
('Protetor Auricular Abafador'),
('Máscara Respiratória PFF2'),
('Luvas de Raspa de Couro'),
('Botas de Segurança com Biqueira de Aço'),
('Colete Retrorrefletor de Alta Visibilidade');

-- Inserção de Utilizadores de Exemplo (Senhas em Texto Simples)
INSERT INTO usuarios (nome, matricula, cargo, email, senha) VALUES 
('Carlos Silva', 'MAT1', 'operador', 'carlos.silva@empresa.com', 'carlos123'),
('Ana Rodrigues', 'MAT2', 'operador', 'ana.rodrigues@empresa.com', 'ana@2026'),
('Ricardo Santos', 'MAT3', 'operador', 'ricardo.santos@empresa.com', 'mudar123'),
('Mariana Costa', 'MAT4', 'operador', 'mariana.costa@empresa.com', 'senhaSegura!'),
('Vítor Oliveira', 'MAT5', 'operador', 'vitor.oliveira@empresa.com', 'vitor@portaria');

