const API_BASE_URL = window.location.hostname.includes("onrender.com")
  ? "https://sistema-manobrista-api-v2.onrender.com"
  : "http://localhost:3000";

console.log("API rodando em:", API_BASE_URL);
console.log("VERSÃO NOVA DO DEPLOY 2.0");