// backend/config/db.js
require("dotenv").config();

const mysql = require("mysql2/promise");

// --- LOGS DE DEPURAÇÃO ---
// Vamos imprimir todas as variáveis de ambiente do banco de dados para ver o que a Render está realmente usando.
console.log("--- INICIANDO CONFIGURAÇÃO DO BANCO DE DADOS ---");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PASSWORD está presente:", !!process.env.DB_PASSWORD); // Apenas para confirmar que a senha existe
console.log("-------------------------------------------------");
// --- FIM DOS LOGS DE DEPURAÇÃO ---

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then((connection) => {
    console.log("Conectado ao banco de dados MySQL!");
    connection.release();
  })
  .catch((err) => {
    console.error("Erro ao conectar ao banco de dados:", err.message);
    process.exit(1);
  });

module.exports = pool;
