require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const path = require("path");

// Importação das rotas
const authRoutes = require("./routes/authRoutes");
const eventosRoutes = require("./routes/eventosRoutes");
const veiculosRoutes = require("./routes/veiculosRoutes");
const analiseRoutes = require("./routes/analiseRoutes");

const app = express();

// --- CONFIGURAÇÃO DE CORS
// Lista de endereços (origens) que têm permissão para acessar esta API.
const allowedOrigins = [
  "https://jade-puppy-cbd850.netlify.app",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "https://sistema-manobrista-homologa-o.onrender.com" // <--- [NOVO] O link do seu site no Render
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origem (como apps mobile ou Postman) ou se estiver na lista
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

// Configuração para servir o frontend (pasta public)
app.use(express.static(path.join(__dirname, 'public')));

// **ROTAS DA API**
app.use("/api/auth", authRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/veiculos", veiculosRoutes);
app.use("/api/analise", analiseRoutes);

// Rota Coringa: Se não for API, manda pro site (frontend)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// **INICIA O SERVIDOR**
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});