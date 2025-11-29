const express = require("express");
const pool = require("../config/db");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");

// Rota para Registrar a Entrada de um ÚNICO Veículo (mantida para outras telas)
router.post(
  "/entrada",
  auth,
  authorize("admin", "orientador", "manobrista"),
  async (req, res) => {
    const {
      evento_id,
      numero_ticket,
      modelo,
      cor,
      placa,
      localizacao,
      observacoes,
    } = req.body;
    const usuario_entrada_id = req.user.id;

    const cleanedPlaca = String(placa)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    if (
      !evento_id ||
      !numero_ticket.trim() ||
      !modelo.trim() ||
      !cor.trim() ||
      !cleanedPlaca.trim() ||
      !localizacao.trim()
    ) {
      return res.status(400).json({
        message: "Todos os campos (exceto observações) são obrigatórios.",
      });
    }
    if (cleanedPlaca.length !== 7) {
      return res
        .status(400)
        .json({ message: "Placa deve ter exatamente 7 caracteres." });
    }

    try {
      // 1. Validação de ticket duplicado
      const [existingTicket] = await pool.query(
        "SELECT id FROM veiculos WHERE evento_id = ? AND numero_ticket = ?",
        [evento_id, numero_ticket]
      );
      if (existingTicket.length > 0) {
        return res
          .status(409)
          .json({ message: "Número de ticket já utilizado para este evento." });
      }

      // 2. NOVA VALIDAÇÃO: Placa duplicada e estacionada
      const [existingPlate] = await pool.query(
        "SELECT id FROM veiculos WHERE evento_id = ? AND placa = ? AND status = 'estacionado'",
        [evento_id, cleanedPlaca]
      );
      if (existingPlate.length > 0) {
        return res.status(409).json({
          message: `A placa ${cleanedPlaca} já está registrada e estacionada neste evento.`,
        });
      }

      // 3. Inserção no banco de dados
      const hora_entrada = new Date();
      const [result] = await pool.query(
        "INSERT INTO veiculos (evento_id, numero_ticket, modelo, cor, placa, localizacao, hora_entrada, usuario_entrada_id, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          evento_id,
          numero_ticket,
          modelo,
          cor,
          cleanedPlaca,
          localizacao,
          hora_entrada,
          usuario_entrada_id,
          observacoes || null,
        ]
      );
      res.status(201).json({
        message: "Veículo registrado com sucesso!",
        veiculoId: result.insertId,
      });
    } catch (error) {
      console.error("[VEICULOS] Erro ao registrar entrada de veículo:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// --- ROTA PARA REGISTRO E ATUALIZAÇÃO EM MASSA (CORRIGIDA) ---
router.post(
  "/massa",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { inserts, updates } = req.body;
    const usuario_id = req.user.id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const results = { created: [], updated: [], errors: [] };

      if (inserts && inserts.length > 0) {
        for (const veiculo of inserts) {
          const cleanedPlaca = String(veiculo.placa || "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase();

          if (
            !veiculo.evento_id ||
            !veiculo.numero_ticket ||
            !veiculo.modelo ||
            !veiculo.cor ||
            !cleanedPlaca ||
            !veiculo.localizacao
          ) {
            results.errors.push({
              ticket: veiculo.numero_ticket || "N/A",
              message: "Campos obrigatórios ausentes.",
            });
            continue;
          }
          if (cleanedPlaca.length !== 7) {
            results.errors.push({
              ticket: veiculo.numero_ticket,
              message: "Placa deve ter 7 caracteres.",
            });
            continue;
          }

          // Validação de ticket duplicado
          const [existingTicket] = await connection.query(
            "SELECT id FROM veiculos WHERE evento_id = ? AND numero_ticket = ?",
            [veiculo.evento_id, veiculo.numero_ticket]
          );
          if (existingTicket.length > 0) {
            results.errors.push({
              ticket: veiculo.numero_ticket,
              message: "Ticket já utilizado.",
            });
            continue;
          }

          // NOVA VALIDAÇÃO: Placa duplicada e estacionada
          const [existingPlate] = await connection.query(
            "SELECT id FROM veiculos WHERE evento_id = ? AND placa = ? AND status = 'estacionado'",
            [veiculo.evento_id, cleanedPlaca]
          );
          if (existingPlate.length > 0) {
            results.errors.push({
              ticket: veiculo.numero_ticket,
              message: `Placa ${cleanedPlaca} já estacionada.`,
            });
            continue;
          }

          try {
            const [result] = await connection.query(
              "INSERT INTO veiculos (evento_id, numero_ticket, modelo, cor, placa, localizacao, observacoes, hora_entrada, usuario_entrada_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                veiculo.evento_id,
                veiculo.numero_ticket,
                veiculo.modelo,
                veiculo.cor,
                cleanedPlaca,
                veiculo.localizacao,
                veiculo.observacoes || null,
                new Date(),
                usuario_id,
              ]
            );
            results.created.push({
              id: result.insertId,
              numero_ticket: veiculo.numero_ticket,
            });
          } catch (dbError) {
            results.errors.push({
              ticket: veiculo.numero_ticket,
              message: `Erro no DB: ${dbError.message}`,
            });
          }
        }
      }

      // Processa as atualizações
      if (updates && updates.length > 0) {
        for (const veiculo of updates) {
          const cleanedPlaca = String(veiculo.placa || "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase();

          // Validações para cada veículo a ser atualizado
          if (
            !veiculo.id || // ID do veículo é obrigatório para atualização
            !veiculo.evento_id ||
            !veiculo.numero_ticket ||
            !veiculo.modelo ||
            !veiculo.cor ||
            !cleanedPlaca ||
            !veiculo.localizacao
          ) {
            results.errors.push({
              ticket: veiculo.numero_ticket || "N/A",
              message: "Campos obrigatórios ausentes para atualização.",
            });
            continue; // Pula para o próximo veículo
          }
          if (cleanedPlaca.length !== 7) {
            results.errors.push({
              ticket: veiculo.numero_ticket,
              message:
                "Placa deve ter exatamente 7 caracteres para atualização.",
            });
            continue; // Pula para o próximo veículo
          }

          try {
            await connection.query(
              "UPDATE veiculos SET modelo = ?, cor = ?, placa = ?, localizacao = ?, observacoes = ? WHERE id = ? AND evento_id = ?",
              [
                veiculo.modelo,
                veiculo.cor,
                cleanedPlaca,
                veiculo.localizacao,
                veiculo.observacoes || null, // Observações podem ser nulas
                veiculo.id,
                veiculo.evento_id,
              ]
            );
            results.updated.push({
              id: veiculo.id,
              numero_ticket: veiculo.numero_ticket,
            });
          } catch (dbError) {
            console.error(
              `[VEICULOS MASSA] Erro ao atualizar veículo ${veiculo.numero_ticket}:`,
              dbError
            );
            results.errors.push({
              ticket: veiculo.numero_ticket,
              message: `Erro ao atualizar: ${dbError.message}`,
            });
          }
        }
      }

      await connection.commit();
      res
        .status(200)
        .json({ message: "Operação em massa concluída.", results });
    } catch (error) {
      await connection.rollback();
      console.error("[VEICULOS] Erro na operação em massa:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
      connection.release();
    }
  }
);

// Rota para Listar Veículos de um Evento Específico
router.get(
  "/evento/:idEvento",
  auth,
  authorize("admin", "orientador", "manobrista"),
  async (req, res) => {
    const { idEvento } = req.params;
    const { status, search } = req.query;
    let query = `
        SELECT v.*, u_entrada.nome_usuario AS nome_usuario_entrada, u_saida.nome_usuario AS nome_usuario_saida 
        FROM veiculos v 
        JOIN usuarios u_entrada ON v.usuario_entrada_id = u_entrada.id 
        LEFT JOIN usuarios u_saida ON v.usuario_saida_id = u_saida.id 
        WHERE v.evento_id = ?`;
    let params = [idEvento];
    if (status) {
      query += " AND v.status = ?";
      params.push(status);
    }
    if (search) {
      query +=
        " AND (v.placa LIKE ? OR v.numero_ticket LIKE ? OR v.modelo LIKE ? OR v.cor LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    query += " ORDER BY v.hora_entrada ASC";
    try {
      const [veiculos] = await pool.query(query, params);
      res.status(200).json(veiculos);
    } catch (error) {
      console.error("Erro ao listar veículos:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// Rota para Registrar a Saída de um Veículo
router.put(
  "/saida/:id",
  auth,
  authorize("admin", "orientador", "manobrista"),
  async (req, res) => {
    const { id } = req.params;
    const usuario_saida_id = req.user.id;

    try {
      const [veiculos] = await pool.query(
        "SELECT status FROM veiculos WHERE id = ?",
        [id]
      );
      if (veiculos.length === 0) {
        return res.status(404).json({ message: "Veículo não encontrado." });
      }
      if (veiculos[0].status === "saiu") {
        return res
          .status(400)
          .json({ message: "Este veículo já teve sua saída registrada." });
      }

      const hora_saida = new Date();
      await pool.query(
        "UPDATE veiculos SET status = 'saiu', hora_saida = ?, usuario_saida_id = ? WHERE id = ?",
        [hora_saida, usuario_saida_id, id]
      );
      res
        .status(200)
        .json({ message: "Saída de veículo registrada com sucesso!" });
    } catch (error) {
      console.error("Erro ao registrar saída de veículo:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// Rota para Listar Veículos de um Evento Específico
router.get(
  "/evento/:idEvento",
  auth,
  authorize("admin", "orientador", "manobrista"),
  async (req, res) => {
    const { idEvento } = req.params;
    const { status, search } = req.query;

    let query = `
    SELECT v.*, u_entrada.nome_usuario AS nome_usuario_entrada, u_saida.nome_usuario AS nome_usuario_saida 
    FROM veiculos v 
    JOIN usuarios u_entrada ON v.usuario_entrada_id = u_entrada.id 
    LEFT JOIN usuarios u_saida ON v.usuario_saida_id = u_saida.id 
    WHERE v.evento_id = ?`;
    let params = [idEvento];

    if (status) {
      query += " AND v.status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (v.placa LIKE ? OR v.numero_ticket LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY CAST(v.numero_ticket AS UNSIGNED) ASC";

    try {
      const [veiculos] = await pool.query(query, params);
      res.status(200).json(veiculos);
    } catch (error) {
      console.error("Erro ao listar veículos:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

module.exports = router;
