document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const eventChecklist = document.getElementById("eventChecklist");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const analysisResult = document.getElementById("analysisResult");
  const selectAllBtn = document.getElementById("selectAllBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  async function populateEventChecklist() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/eventos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error("Não foi possível carregar os eventos.");

      const eventos = await response.json();
      eventChecklist.innerHTML = "";

      if (eventos.length < 2) {
        eventChecklist.innerHTML =
          "<p>São necessários pelo menos 2 eventos cadastrados para fazer uma análise.</p>";
        analyzeBtn.disabled = true;
        if (selectAllBtn) selectAllBtn.style.display = "none";
        if (clearAllBtn) clearAllBtn.style.display = "none";
        return;
      }

      eventos.forEach((evento) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "event-checklist-item";
        const checkboxId = `evento-${evento.id}`;
        const dataFormatada = new Date(evento.data_evento).toLocaleDateString(
          "pt-BR"
        );

        itemDiv.innerHTML = `
          <input type="checkbox" id="${checkboxId}" value="${evento.id}">
          <label for="${checkboxId}">${evento.nome_evento} <span class="event-date-label">(${dataFormatada})</span></label>
        `;
        eventChecklist.appendChild(itemDiv);
      });

      eventChecklist.addEventListener("change", updateAnalyzeButtonState);
      updateAnalyzeButtonState();
    } catch (error) {
      analysisResult.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
  }

  function updateAnalyzeButtonState() {
    const selectedCount = eventChecklist.querySelectorAll(
      'input[type="checkbox"]:checked'
    ).length;
    analyzeBtn.disabled = selectedCount < 2;
  }

  async function performAnalysis() {
    const selectedCheckboxes = eventChecklist.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    const eventoIds = Array.from(selectedCheckboxes).map((cb) => cb.value);

    if (eventoIds.length < 2) {
      Swal.fire(
        "Atenção!",
        "Por favor, selecione pelo menos dois eventos para analisar.",
        "warning"
      );
      playNotificationSound("notification");
      return;
    }

    analysisResult.innerHTML = `<p class="loading-message">Analisando... <i class="fas fa-spinner fa-spin"></i></p>`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/analise/frequencia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventoIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro na API");
      }

      const veiculosFrequentes = await response.json();
      analysisResult.innerHTML = "";

      if (veiculosFrequentes.length === 0) {
        analysisResult.innerHTML =
          '<div class="results-placeholder"><i class="fas fa-info-circle icon"></i><p>Nenhum veículo recorrente encontrado entre os eventos selecionados.</p></div>';
        return;
      }

      veiculosFrequentes.forEach((veiculo) => {
        const card = document.createElement("div");
        card.className = "frequency-card";

        const eventosHtml = (veiculo.eventos_participados || [])
          .map(
            (evt) =>
              `<li>${
                evt.nome_evento
              } <span class="event-date-label">(${new Date(
                evt.data_evento
              ).toLocaleDateString("pt-BR")})</span></li>`
          )
          .join("");

        card.innerHTML = `
          <div class="frequency-count">
            ${veiculo.frequencia}x
            <span>visitas</span>
          </div>
          <div class="frequency-details">
            <h3>Placa: ${veiculo.placa}</h3>
            <p><strong>Modelo:</strong> ${
              veiculo.modelo || "Não informado"
            } | <strong>Cor:</strong> ${veiculo.cor || "Não informada"}</p>
            <div class="event-participation">
                <strong>Participou em:</strong>
                <ul>${eventosHtml}</ul>
            </div>
          </div>
        `;
        analysisResult.appendChild(card);
      });
    } catch (error) {
      analysisResult.innerHTML = `<p class="error-message">Erro ao realizar a análise: ${error.message}</p>`;
    }
  }

  selectAllBtn.addEventListener("click", () => {
    eventChecklist
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = true));
    updateAnalyzeButtonState();
  });

  clearAllBtn.addEventListener("click", () => {
    eventChecklist
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
    updateAnalyzeButtonState();
  });

  analyzeBtn.addEventListener("click", performAnalysis);
  populateEventChecklist();
});
