-- Tabela de Usuários
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_usuario VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    cargo ENUM('admin', 'orientador', 'manobrista') NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Eventos
CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_evento VARCHAR(100) NOT NULL,
    data_evento DATE NOT NULL,
    data_fim DATE,
    hora_inicio TIME,
    hora_fim TIME,
    local_evento VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Veículos
CREATE TABLE veiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    numero_ticket VARCHAR(20) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    cor VARCHAR(50) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    localizacao VARCHAR(100) NOT NULL,
    observacoes VARCHAR(255),
    hora_entrada DATETIME NOT NULL,
    hora_saida DATETIME,
    status ENUM('estacionado', 'saiu') DEFAULT 'estacionado',
    usuario_entrada_id INT NOT NULL,
    usuario_saida_id INT,
    FOREIGN KEY (evento_id) REFERENCES eventos(id),
    FOREIGN KEY (usuario_entrada_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_saida_id) REFERENCES usuarios(id)
);
