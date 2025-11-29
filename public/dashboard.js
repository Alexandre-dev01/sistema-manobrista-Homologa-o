document.addEventListener("DOMContentLoaded", () => {
  const {
    token,
    user,
    activeEventDetails: initialActiveEventDetails,
  } = verificarAutenticacao();
  if (!user) return;

  let activeEventDetails = initialActiveEventDetails;

  const statsContainer = document.getElementById("statsContainer");
  const changeEventBtn = document.getElementById("changeEventBtn");
  const eventModal = document.getElementById("eventSelectorModal");
  const closeModalBtn = document.querySelector(".close-button");
  const modalEventList = document.getElementById("modalEventList");
  const selectEventButton = document.getElementById("selectEventButton");

  const cards = {
    eventos: document.getElementById("cardEventos"),
    registrarEntrada: document.getElementById("cardRegistrarEntrada"),
    consultaVeiculos: document.getElementById("cardConsultaVeiculos"),
    registroMassa: document.getElementById("cardRegistroMassa"),
    analiseConflitos: document.getElementById("cardAnaliseConflitos"),
    cadastrarUsuario: document.getElementById("cardCadastrarUsuario"),
  };

  let selectedEventInModal = null;

  function setupPermissions() {
    const cargo = user.cargo;
    if (!cargo) return;
    Object.values(cards).forEach((card) => {
      if (card) card.style.display = "none";
    });
    switch (cargo) {
      case "admin":
        Object.values(cards).forEach((card) => {
          if (card) card.style.display = "block";
        });
        break;
      case "orientador":
        if (cards.eventos) cards.eventos.style.display = "block";
        if (cards.registrarEntrada)
          cards.registrarEntrada.style.display = "block";
        if (cards.consultaVeiculos)
          cards.consultaVeiculos.style.display = "block";
        if (cards.registroMassa) cards.registroMassa.style.display = "block";
        if (cards.analiseConflitos)
          cards.analiseConflitos.style.display = "block";

        break;
      case "manobrista":
        if (cards.registrarEntrada)
          cards.registrarEntrada.style.display = "block";
        if (cards.consultaVeiculos)
          cards.consultaVeiculos.style.display = "block";
        break;
    }
  }

  async function loadStats() {
    if (
      (user.cargo !== "admin" && user.cargo !== "orientador") ||
      !statsContainer
    ) {
      if (statsContainer) statsContainer.style.display = "none";
      return;
    }
    if (!activeEventDetails) {
      statsContainer.style.display = "none";
      return;
    }
    statsContainer.innerHTML = "<p>Carregando estatísticas...</p>";
    statsContainer.style.display = "grid";
    try {
      const response = await fetch(`${API_BASE_URL}/api/eventos/ativo/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha na resposta da API");
      }
      const stats = await response.json();
      statsContainer.innerHTML = `
        <div class="metric-card purple"><div class="metric-value">${stats.veiculosEstacionados}</div><div class="metric-label">Veículos Estacionados</div></div>
        <div class="metric-card green"><div class="metric-value">${stats.veiculosSaida}</div><div class="metric-label">Saídas Registradas</div></div>
        <div class="metric-card blue"><div class="metric-value">${stats.totalVeiculos}</div><div class="metric-label">Total de Veículos</div></div>
      `;
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      statsContainer.innerHTML = `<p class="error-text" style="grid-column: 1 / -1; text-align: center;">Não foi possível carregar as estatísticas.</p>`;
    }
  }

  function displayActiveEvent() {
    activeEventDetails = JSON.parse(localStorage.getItem("activeEventDetails"));
    // Chama a função centralizada para renderizar o card
    renderActiveEventCard(activeEventDetails, "activeEventDisplay");

    if (activeEventDetails) {
      loadStats();
    } else {
      if (statsContainer) statsContainer.style.display = "none";
    }
  }

  async function openEventModal() {
    eventModal.style.display = "flex";
    modalEventList.innerHTML = "<p>Carregando eventos...</p>";
    selectEventButton.disabled = true;
    selectedEventInModal = null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/eventos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao buscar eventos.");

      const events = await response.json();
      modalEventList.innerHTML = "";

      if (events.length === 0) {
        modalEventList.innerHTML = "<p>Nenhum evento cadastrado.</p>";
        return;
      }

      events.forEach((event) => {
        const eventItem = document.createElement("div");
        eventItem.className = "modal-event-item";

        eventItem.innerHTML = `
          <div class="event-item-main-info">
            <span class="event-item-name">${event.nome_evento}</span>
            <span class="event-item-location">(${event.local_evento})</span>
          </div>
          <div class="event-item-sub-info">
            <span class="event-item-date">
              📅 ${new Date(event.data_evento).toLocaleDateString("pt-BR")}
              ${
                event.data_fim &&
                new Date(event.data_fim).toLocaleDateString("pt-BR") !==
                  new Date(event.data_evento).toLocaleDateString("pt-BR")
                  ? " a " + new Date(event.data_fim).toLocaleDateString("pt-BR")
                  : ""
              }
            </span>
            <span class="event-item-time">
              🕒 ${event.hora_inicio || "N/A"} - ${event.hora_fim || "N/A"}
            </span>
          </div>
        `;

        eventItem.dataset.eventDetails = JSON.stringify(event);
        if (event.is_active) {
          eventItem.classList.add("selected");
        }

        eventItem.addEventListener("click", () => {
          document
            .querySelectorAll(".modal-event-item")
            .forEach((item) => item.classList.remove("selected"));
          eventItem.classList.add("selected");
          selectedEventInModal = JSON.parse(eventItem.dataset.eventDetails);
          selectEventButton.disabled = false;
        });

        modalEventList.appendChild(eventItem);
      });
    } catch (error) {
      console.error("Erro ao carregar eventos no modal:", error);
      modalEventList.innerHTML =
        "<p>Erro ao carregar eventos. Tente novamente.</p>";
    }
  }

  function closeEventModal() {
    eventModal.style.display = "none";
  }

  async function confirmEventSelection() {
    if (selectedEventInModal) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/eventos/${selectedEventInModal.id}/ativar`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok)
          throw new Error("Falha ao definir o evento como ativo.");
        localStorage.setItem("activeEventId", selectedEventInModal.id);
        localStorage.setItem(
          "activeEventDetails",
          JSON.stringify(selectedEventInModal)
        );
        displayActiveEvent();
        closeEventModal();
        Swal.fire({
          icon: "success",
          title: "Evento Ativado!",
          text: `O evento "${selectedEventInModal.nome_evento}" agora está ativo.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire(
          "Erro",
          "Não foi possível ativar o evento selecionado.",
          "error"
        );
      }
    }
  }

  Object.keys(cards).forEach((key) => {
    if (cards[key]) {
      cards[key].addEventListener("click", () => {
        const pageMap = {
          eventos: "eventos.html",
          registrarEntrada: "entrada_veiculo.html",
          consultaVeiculos: "consulta_veiculos.html",
          registroMassa: "registro_massa_veiculos.html",
          analiseConflitos: "analise.html",
          cadastrarUsuario: "cadastro_usuario.html",
        };
        if (pageMap[key]) window.location.href = pageMap[key];
      });
    }
  });

  if (changeEventBtn) changeEventBtn.addEventListener("click", openEventModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeEventModal);
  if (selectEventButton)
    selectEventButton.addEventListener("click", confirmEventSelection);
  window.addEventListener("click", (event) => {
    if (event.target === eventModal) closeEventModal();
  });

  setupPermissions();
  displayActiveEvent();
});
