require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const path = require("path"); // <--- [NOVO] Importante para achar a pasta do site

// Importação das rotas
const authRoutes = require("./routes/authRoutes");
const eventosRoutes = require("./routes/eventosRoutes");
const veiculosRoutes = require("./routes/veiculosRoutes");
const analiseRoutes = require("./routes/analiseRoutes");

const app = express();

// --- CONFIGURAÇÃO DE CORS
// Mantive sua configuração, ela ajuda se você acessar de outros lugares.
// Mas agora que o site estará "dentro" do servidor, o CORS deixa de ser um problema.
const allowedOrigins = [
  "https://jade-puppy-cbd850.netlify.app",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000" // Adicionei o próprio servidor na lista
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Acesso não permitido pela política de CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// **ROTAS DA API**
app.use("/api/auth", authRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/veiculos", veiculosRoutes);
app.use("/api/analise", analiseRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// **INICIA O SERVIDOR**
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});