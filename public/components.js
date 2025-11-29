/**
 * Configura a lógica do cabeçalho, como o botão de logout e as informações do usuário.
 * Esta é a versão mais completa, que normaliza o cargo para criar uma classe CSS segura.
 * @param {object} user - O objeto do usuário logado.
 */
function setupHeaderLogic(user) {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      // Limpa todos os dados da sessão do navegador
      localStorage.clear();
      // Redireciona para 'index.html' (a página de login)
      window.location.href = "index.html";
    });
  }

  const userInfoText = document.getElementById("userInfoText");
  if (user && userInfoText) {
    // Cria um elemento <span> para o cargo para permitir estilização via CSS.
    const userSpan = document.createElement("span");

    // Cria uma classe CSS a partir do cargo (ex: "Gerente de Eventos" vira "cargo-gerente-de-eventos").
    userSpan.className = `cargo-${user.cargo
      .toLowerCase()
      .replace(/\s/g, "-")}`; // Converte para minúsculas e substitui espaços por hífens.

    userSpan.textContent = `(${user.cargo})`;

    // Monta a mensagem de boas-vindas com o nome em negrito e anexa o span do cargo.
    userInfoText.innerHTML = `Bem-vindo, <strong>${user.nome_usuario}</strong> `;
    userInfoText.appendChild(userSpan);
  }
}

/**
 * Renderiza o card de evento ativo em um container específico com um design padronizado.
 * Esta é a versão mais completa, com validações e tratamento para dados ausentes.
 * @param {object} eventDetails - Os detalhes do evento vindos do localStorage.
 * @param {string} containerId - O ID do elemento HTML onde o card será renderizado.
 */
function renderActiveEventCard(eventDetails, containerId) {
  const container = document.getElementById(containerId);

  // Se o container não for encontrado, exibe um erro no console e interrompe a execução.
  if (!container) {
    console.error(
      `Container com ID '${containerId}' não foi encontrado na página.`
    );
    return;
  }

  // Se não houver detalhes do evento, esconde o container para não mostrar um card vazio.
  if (!eventDetails) {
    container.style.display = "none";
    return;
  }

  // Formata a data de término apenas se for uma data válida e diferente da de início.
  const dataTermino =
    eventDetails.data_fim && eventDetails.data_fim !== eventDetails.data_evento
      ? new Date(eventDetails.data_fim).toLocaleDateString("pt-BR")
      : null;

  // Monta a string de horário, tratando casos onde o horário pode não estar completo.
  const horario =
    eventDetails.hora_inicio && eventDetails.hora_fim
      ? `${eventDetails.hora_inicio} - ${eventDetails.hora_fim}`
      : eventDetails.hora_inicio || "N/A"; // Se tiver só o início, mostra só o início. Senão, 'N/A'.

  // Monta o HTML do card com ícones e classes para estilização.
  // Usa o operador '|| "N/A"' para evitar campos vazios caso a informação não venha da API.
  container.innerHTML = `
    <h2><i class="fas fa-calendar-check icon-title"></i> Evento Ativo</h2>
    <div class="event-details-grid">
      <p><strong><i class="fas fa-signature"></i> Nome:</strong> <span>${
        eventDetails.nome_evento || "N/A"
      }</span></p>
      <p><strong><i class="fas fa-map-marker-alt"></i> Local:</strong> <span>${
        eventDetails.local_evento || "N/A"
      }</span></p>
      <p><strong><i class="fas fa-calendar-day"></i> Data:</strong> <span>${new Date(
        eventDetails.data_evento
      ).toLocaleDateString("pt-BR")}</span></p>
      ${
        dataTermino
          ? `<p><strong><i class="fas fa-calendar-times"></i> Término:</strong> <span>${dataTermino}</span></p>`
          : ""
      }
      <p><strong><i class="fas fa-clock"></i> Horário:</strong> <span>${horario}</span></p>
    </div>
  `;

  // Garante que o container esteja visível após ser preenchido.
  container.style.display = "block";
}
