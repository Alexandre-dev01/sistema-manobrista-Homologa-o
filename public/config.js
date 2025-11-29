const API_BASE_URL = window.location.hostname.includes("onrender.com")
  ? "https://sistema-manobrista-homologa-o.onrender.com" // <--- ATENÇÃO: CONFIRA SE É ESSE O SEU LINK
  : "http://localhost:3000";

console.log("API rodando em:", API_BASE_URL); // Só para ajudar a ver no console
// ... código anterior ...

console.log("API rodando em:", API_BASE_URL);
console.log("VERSÃO NOVA DO DEPLOY 2.0"); // <--- Adicione esta linha