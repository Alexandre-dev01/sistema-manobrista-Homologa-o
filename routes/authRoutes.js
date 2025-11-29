const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");

// REGISTRO DE USUÁRIO (apenas admin)
router.post("/register", auth, authorize("admin"), async (req, res) => {
  const { nome_usuario, senha, cargo } = req.body;
  console.log(
    `[AUTH] Admin (ID: ${req.user.id}) tentando registrar: ${nome_usuario}, Cargo: ${cargo}`
  );

  // Validação básica
  if (!nome_usuario || !senha || !cargo) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  if (nome_usuario.length < 3 || nome_usuario.length > 30) {
    return res
      .status(400)
      .json({ message: "Nome de usuário deve ter entre 3 e 30 caracteres." });
  }

  if (!/^[a-zA-Z0-9_.]+$/.test(nome_usuario)) {
    return res.status(400).json({
      message:
        "Nome de usuário contém caracteres inválidos. Use apenas letras (maiúsculas ou minúsculas), números, _ ou .",
    });
  }

  const allowedRoles = ["manobrista", "orientador", "admin"];
  if (!allowedRoles.includes(cargo)) {
    return res.status(400).json({
      message:
        "Cargo inválido. Cargos permitidos: manobrista, orientador, admin.",
    });
  }

  if (
    senha.length < 6 ||
    senha.length > 60 ||
    !/[A-Z]/.test(senha) ||
    !/[a-z]/.test(senha) ||
    !/[0-9]/.test(senha) ||
    !/[!@#$%^&*]/.test(senha)
  ) {
    return res.status(400).json({
      message:
        "A senha não atende aos requisitos de segurança (mín. 6, máx. 60 caracteres, maiúscula, minúscula, número, especial).",
    });
  }

  try {
    const [existingUser] = await pool.query(
      "SELECT id FROM usuarios WHERE nome_usuario = ?",
      [nome_usuario]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Nome de usuário já existe." });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    await pool.query(
      "INSERT INTO usuarios (nome_usuario, senha, cargo, status) VALUES (?, ?, ?, 'ativo')",
      [nome_usuario, hashedPassword, cargo]
    );

    res.status(201).json({ message: "Usuário registrado com sucesso!" });
  } catch (error) {
    console.error("[AUTH] Erro interno ao registrar usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { nome_usuario, senha } = req.body;
  if (!nome_usuario || !senha) {
    return res
      .status(400)
      .json({ message: "Nome de usuário e senha são obrigatórios." });
  }

  try {
    const [users] = await pool.query(
      "SELECT * FROM usuarios WHERE nome_usuario = ?",
      [nome_usuario]
    );
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    if (user.status === "inativo") {
      return res.status(403).json({
        message: "Este usuário está desativado. Contate o administrador.",
      });
    }

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const token = jwt.sign(
      { id: user.id, cargo: user.cargo },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      message: "Login bem-sucedido!",
      token,
      user: { id: user.id, nome_usuario: user.nome_usuario, cargo: user.cargo },
    });
  } catch (error) {
    console.error("[AUTH] Erro ao fazer login:", error);
    res
      .status(500)
      .json({ message: "Erro interno do servidor ao fazer login." });
  }
});

// LISTAR USUÁRIOS (com filtro de status)
router.get("/", auth, authorize("admin"), async (req, res) => {
  const { status } = req.query;
  const statusFilter = ["ativo", "inativo"].includes(status) ? status : "ativo";

  try {
    const [users] = await pool.query(
      "SELECT id, nome_usuario, cargo, status FROM usuarios WHERE status = ? ORDER BY nome_usuario ASC",
      [statusFilter]
    );
    res.json(users);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// DESATIVAR USUÁRIO
router.put("/:id/deactivate", auth, authorize("admin"), async (req, res) => {
  const { id } = req.params;

  if (id == req.user.id) {
    return res
      .status(400)
      .json({ message: "Você não pode desativar a si mesmo." });
  }

  try {
    const [result] = await pool.query(
      "UPDATE usuarios SET status = 'inativo' WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.status(200).json({ message: "Usuário desativado com sucesso." });
  } catch (error) {
    console.error("Erro ao desativar usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// REATIVAR USUÁRIO
router.put("/:id/reactivate", auth, authorize("admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      "UPDATE usuarios SET status = 'ativo' WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.status(200).json({ message: "Usuário reativado com sucesso." });
  } catch (error) {
    console.error("Erro ao reativar usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

module.exports = router;
