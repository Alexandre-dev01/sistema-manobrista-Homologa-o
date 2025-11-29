// backend/middleware/authMiddleware.js (VERSÃO FINAL E COMPLETA)

const jwt = require("jsonwebtoken");

/**
 * Middleware para verificar se o usuário está autenticado via token JWT.
 * Ele valida o token e anexa os dados do usuário (id, cargo) ao objeto `req`.
 */
const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Acesso negado. Token não fornecido ou mal formatado.",
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adiciona { id, cargo } ao request
    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido ou expirado." });
  }
};

/**
 * Middleware para verificar se o usuário autenticado tem um dos cargos permitidos.
 * Deve ser usado SEMPRE DEPOIS do middleware `auth`.
 * @param {...string} allowedRoles - Uma lista de cargos permitidos (ex: 'admin', 'orientador').
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // O objeto req.user foi adicionado pelo middleware 'auth'
    if (!req.user || !allowedRoles.includes(req.user.cargo)) {
      return res.status(403).json({
        message:
          "Acesso proibido. Você não tem permissão para realizar esta ação.",
      });
    }
    next(); // Se o cargo do usuário está na lista, permite o acesso.
  };
};

module.exports = {
  auth,
  authorize,
};
