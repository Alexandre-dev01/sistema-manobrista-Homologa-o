const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { auth, authorize } = require("../middleware/authMiddleware");

router.post(
  "/frequencia",
  auth,
  authorize("admin", "orientador"),
  async (req, res) => {
    const { eventoIds } = req.body;

    if (!eventoIds || !Array.isArray(eventoIds) || eventoIds.length < 2) {
      return res.status(400).json({
        message:
          "Pelo menos dois IDs de evento são necessários para a análise.",
      });
    }

    try {
      // Query principal para obter todos os dados necessários de uma vez
      const sql = `
        SELECT 
          v.placa,
          v.modelo,
          v.cor,
          e.nome_evento,
          e.data_evento
        FROM veiculos v
        JOIN eventos e ON v.evento_id = e.id
        WHERE v.evento_id IN (?)
        ORDER BY v.placa, e.data_evento DESC;
      `;
      const [rows] = await pool.query(sql, [eventoIds]);

      // Agrupar os resultados no lado do servidor
      const veiculosAgrupados = rows.reduce((acc, row) => {
        const { placa, modelo, cor, nome_evento, data_evento } = row;

        // Se a placa ainda não está no nosso acumulador, inicializa
        if (!acc[placa]) {
          acc[placa] = {
            placa,
            modelo,
            cor, // Pega o primeiro (mais recente, devido ao ORDER BY)
            frequencia: 0,
            eventos_participados: [],
          };
        }

        // Incrementa a frequência e adiciona o evento à lista
        acc[placa].frequencia++;
        acc[placa].eventos_participados.push({ nome_evento, data_evento });

        return acc;
      }, {});

      // Filtrar apenas os veículos que apareceram mais de uma vez
      const resultadoFinal = Object.values(veiculosAgrupados).filter(
        (v) => v.frequencia > 1
      );

      // Ordenar o resultado final pela frequência
      resultadoFinal.sort((a, b) => b.frequencia - a.frequencia);

      res.json(resultadoFinal);
    } catch (error) {
      console.error("Erro ao analisar frequência de veículos:", error);
      res
        .status(500)
        .json({ message: "Erro interno do servidor ao realizar a análise." });
    }
  }
);

module.exports = router;
