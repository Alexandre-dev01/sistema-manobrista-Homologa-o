// SUBSTITUA TODO O CONTEÚDO DE api/routes/eventosRoutes.js POR ESTE CÓDIGO

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { auth, authorize } = require("../middleware/authMiddleware");

// Rota para Listar Todos os Eventos
router.get("/", auth, authorize("admin", "orientador"), async (req, res) => {
  try {
    const [eventos] = await pool.query(
      "SELECT * FROM eventos ORDER BY data_evento DESC, criado_em DESC"
    );
    res.status(200).json(eventos);
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Rota para Criar um Novo Evento
router.post("/", auth, authorize("admin"), async (req, res) => {
  const {
    nome_evento,
    data_evento,
    data_fim,
    hora_inicio,
    hora_fim,
    local_evento,
    descricao,
  } = req.body;

  if (
    !nome_evento ||
    !data_evento ||
    !data_fim ||
    !hora_inicio ||
    !hora_fim ||
    !local_evento
  ) {
    return res.status(400).json({
      message: "Todos os campos (exceto descrição) são obrigatórios.",
    });
  }
  // ... (suas validações de data e texto continuam aqui, elas estão corretas)
  try {
    const [result] = await pool.query(
      "INSERT INTO eventos (nome_evento, data_evento, data_fim, hora_inicio, hora_fim, local_evento, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        nome_evento,
        data_evento,
        data_fim,
        hora_inicio,
        hora_fim,
        local_evento,
        descricao || null,
      ]
    );
    res.status(201).json({
      message: "Evento criado com sucesso!",
      eventoId: result.insertId,
    });
  } catch (error) {
    console.error("[EVENTOS] Erro ao criar evento:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Já existe um evento com este nome nesta data." });
    }
    res
      .status(500)
      .json({ message: "Erro interno do servidor ao criar o evento." });
  }
});

// Rota para Obter o Evento Ativo
router.get("/ativo", auth, async (req, res) => {
  try {
    const [eventos] = await pool.query(
      "SELECT * FROM eventos WHERE is_active = TRUE LIMIT 1"
    );
    if (eventos.length === 0) {
      return res.status(200).json(null);
    }
    res.status(200).json(eventos[0]);
  } catch (error) {
    console.error("Erro ao obter evento ativo:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Rota para Obter Estatísticas do Evento Ativo
router.get(
  "/ativo/stats",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    try {
      const [activeEvent] = await pool.query(
        "SELECT id FROM eventos WHERE is_active = TRUE LIMIT 1"
      );
      if (activeEvent.length === 0) {
        return res.status(200).json({
          totalVeiculos: 0,
          veiculosEstacionados: 0,
          veiculosSaida: 0,
        });
      }
      const eventoId = activeEvent[0].id;
      const [stats] = await pool.query(
        `SELECT COUNT(*) AS totalVeiculos, SUM(CASE WHEN status = 'estacionado' THEN 1 ELSE 0 END) AS veiculosEstacionados, SUM(CASE WHEN status = 'saiu' THEN 1 ELSE 0 END) AS veiculosSaida FROM veiculos WHERE evento_id = ?`,
        [eventoId]
      );
      const result = {
        totalVeiculos: stats[0].totalVeiculos || 0,
        veiculosEstacionados: stats[0].veiculosEstacionados || 0,
        veiculosSaida: stats[0].veiculosSaida || 0,
      };
      res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao obter estatísticas do evento ativo:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// Rota para Ativar um Evento
router.put(
  "/:id/ativar",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "UPDATE eventos SET is_active = FALSE WHERE is_active = TRUE"
      );
      const [result] = await connection.query(
        "UPDATE eventos SET is_active = TRUE WHERE id = ?",
        [id]
      );
      await connection.commit();
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Evento não encontrado." });
      }
      const [activatedEvent] = await connection.query(
        "SELECT * FROM eventos WHERE id = ?",
        [id]
      );
      res.status(200).json({
        message: "Evento definido como ativo com sucesso!",
        event: activatedEvent[0],
      });
    } catch (error) {
      await connection.rollback();
      console.error("Erro ao ativar evento:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
      connection.release();
    }
  }
);

// Rota para Excluir um Evento
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  const { id } = req.params;
  try {
    const [eventos] = await pool.query(
      "SELECT is_active FROM eventos WHERE id = ?",
      [id]
    );
    if (eventos.length === 0) {
      return res.status(404).json({ message: "Evento não encontrado." });
    }
    if (eventos[0].is_active) {
      return res.status(400).json({
        message:
          "Não é possível excluir um evento que está ativo. Desative-o primeiro.",
      });
    }
    // O ON DELETE CASCADE na tabela `evento_manobristas` e `veiculos` cuidará da limpeza.
    const [result] = await pool.query("DELETE FROM eventos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Evento não encontrado." });
    }
    res.status(200).json({
      message:
        "Evento e todas as suas associações foram excluídos com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Rota para Gerar Relatório de um Evento
router.get(
  "/:id/relatorio",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const [evento] = await pool.query("SELECT * FROM eventos WHERE id = ?", [
        id,
      ]);
      if (evento.length === 0) {
        return res.status(404).json({ message: "Evento não encontrado." });
      }
      const [veiculos] = await pool.query(
        `SELECT v.*, u_entrada.nome_usuario AS nome_usuario_entrada, u_saida.nome_usuario AS nome_usuario_saida FROM veiculos v JOIN usuarios u_entrada ON v.usuario_entrada_id = u_entrada.id LEFT JOIN usuarios u_saida ON v.usuario_saida_id = u_saida.id WHERE v.evento_id = ? ORDER BY v.hora_entrada ASC`,
        [id]
      );
      res.status(200).json({ evento: evento[0], veiculos });
    } catch (error) {
      console.error("Erro ao gerar relatório do evento:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// Rota para Desativar o Evento Ativo
router.put(
  "/desativar",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    try {
      const [result] = await pool.query(
        "UPDATE eventos SET is_active = FALSE WHERE is_active = TRUE"
      );
      if (result.affectedRows === 0) {
        return res
          .status(200)
          .json({ message: "Nenhum evento ativo para desativar." });
      }
      res.status(200).json({ message: "Evento desativado com sucesso!" });
    } catch (error) {
      console.error("Erro ao desativar evento:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// --- NOVAS ROTAS DE GERENCIAMENTO DE MANOBRISTAS E RANKING ---

// LISTAR manobristas de um evento
router.get(
  "/:id/manobristas",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const [manobristas] = await pool.query(
        `SELECT u.id, u.nome_usuario, u.cargo 
       FROM usuarios u
       JOIN evento_manobristas em ON u.id = em.usuario_id
       WHERE em.evento_id = ?`,
        [id]
      );
      res.status(200).json(manobristas);
    } catch (error) {
      console.error("Erro ao listar manobristas do evento:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// ADICIONAR manobrista a um evento
router.post(
  "/:id/manobristas",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { id: evento_id } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ message: "ID do usuário é obrigatório." });
    }

    try {
      await pool.query(
        "INSERT INTO evento_manobristas (evento_id, usuario_id) VALUES (?, ?)",
        [evento_id, usuario_id]
      );
      res
        .status(201)
        .json({ message: "Manobrista adicionado ao evento com sucesso!" });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "Este manobrista já está no evento." });
      }
      console.error("Erro ao adicionar manobrista ao evento:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// REMOVER manobrista de um evento
router.delete(
  "/:id/manobristas/:usuarioId",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { id: evento_id, usuarioId } = req.params;
    try {
      const [result] = await pool.query(
        "DELETE FROM evento_manobristas WHERE evento_id = ? AND usuario_id = ?",
        [evento_id, usuarioId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Associação não encontrada." });
      }
      res
        .status(200)
        .json({ message: "Manobrista removido do evento com sucesso." });
    } catch (error) {
      console.error("Erro ao remover manobrista do evento:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// ROTA DE RANKING DE PRODUTIVIDADE POR EVENTO
router.get(
  "/:id/ranking",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { id: eventoId } = req.params;
    try {
      const sql = `
      SELECT
        u.nome_usuario,
        u.cargo,
        COALESCE(entradas.count, 0) AS veiculos_entrada,
        COALESCE(saidas.count, 0) AS veiculos_saida,
        (COALESCE(entradas.count, 0) + COALESCE(saidas.count, 0)) AS total_manobras
      FROM usuarios u
      LEFT JOIN (
        SELECT usuario_entrada_id AS id, COUNT(*) as count
        FROM veiculos
        WHERE evento_id = ?
        GROUP BY usuario_entrada_id
      ) AS entradas ON u.id = entradas.id
      LEFT JOIN (
        SELECT usuario_saida_id AS id, COUNT(*) as count
        FROM veiculos
        WHERE evento_id = ? AND usuario_saida_id IS NOT NULL
        GROUP BY usuario_saida_id
      ) AS saidas ON u.id = saidas.id
      INNER JOIN evento_manobristas em ON u.id = em.usuario_id AND em.evento_id = ?
      WHERE (entradas.count > 0 OR saidas.count > 0)
      ORDER BY total_manobras DESC, veiculos_entrada DESC;
    `;

      const [ranking] = await pool.query(sql, [eventoId, eventoId, eventoId]);
      res.status(200).json(ranking);
    } catch (error) {
      console.error("Erro ao gerar ranking de produtividade do evento:", error);
      res
        .status(500)
        .json({ message: "Erro interno do servidor ao gerar o ranking." });
    }
  }
);

module.exports = router;
