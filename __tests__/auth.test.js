// __tests__/auth.test.js

const request = require("supertest");
const app = require("../server"); // Importa o app do server.js
const pool = require("../config/db"); // --- ALTERAÇÃO: Importa o pool do banco de dados

// Hook do Jest que é executado uma vez, depois de todos os testes neste arquivo
afterAll(async () => {
  await pool.end(); // --- ALTERAÇÃO: Fecha todas as conexões do pool
});

describe("Testes das Rotas de Autenticação", () => {
  it("deve retornar 200 e um token para um login com credenciais válidas", async () => {
    const response = await request(app).post("/api/auth/login").send({
      nome_usuario: "Edmilson",
      senha: "@Qwertyui123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  it("deve retornar 401 para um login com senha inválida", async () => {
    const response = await request(app).post("/api/auth/login").send({
      nome_usuario: "Edmilson", // Usuário válido
      senha: "senha-totalmente-errada", // Senha inválida
    });

    expect(response.statusCode).toBe(401);
  });
});
