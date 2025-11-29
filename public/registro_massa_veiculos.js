document.addEventListener("DOMContentLoaded", () => {
  const { token, user, activeEventId, activeEventDetails } =
    verificarAutenticacao();

  if (!user || !activeEventId) {
    document.querySelector("main").style.display = "none";
    showThemedError({
      title: "Nenhum Evento Ativo",
      text: "Por favor, selecione um evento no dashboard antes de continuar.",
    }).then(() => {
      window.location.href = "dashboard.html";
    });
    playNotificationSound("error");
    return;
  }
  renderActiveEventCard(activeEventDetails, "activeEventDisplay");

  const addRowsBtn = document.getElementById("addRowsBtn");
  const addRowCountInput = document.getElementById("addRowCount");
  const vehiclesTableBody = document.getElementById("vehiclesTableBody");
  const massRegisterForm = document.getElementById("massRegisterForm");
  const generatePdfBtn = document.getElementById("generatePdfBtn");
  const searchInput = document.getElementById("searchInput");
  const clearEmptyRowsBtn = document.getElementById("clearEmptyRowsBtn");

  // --- Configurações Reutilizáveis ---
  const placaMaskOptions = {
    mask: "AAA-0*00",
    definitions: { A: /[A-Z]/, 0: /[0-9]/, "*": /[A-Z0-9]/ },
    prepare: (str) => str.toUpperCase(),
  };

  const createRow = (vehicle = {}) => {
    const newRow = document.createElement("tr");
    const isSaved = !!vehicle.id;
    newRow.dataset.id = vehicle.id || "";
    newRow.dataset.ticket = vehicle.numero_ticket || "";
    if (isSaved) newRow.classList.add("saved-row");

    newRow.innerHTML = `
      <td class="prisma-cell">${vehicle.numero_ticket || ""}</td>
      <td><input type="text" class="ticket-input table-input" value="${
        vehicle.numero_ticket || ""
      }" ${isSaved ? "disabled" : ""} placeholder="Ticket"></td>
      <td><input type="text" class="modelo-input table-input" value="${
        vehicle.modelo || ""
      }" ${isSaved ? "disabled" : ""} placeholder="Modelo"></td>
      <td><input type="text" class="cor-input table-input" value="${
        vehicle.cor || ""
      }" ${isSaved ? "disabled" : ""} placeholder="Cor"></td>
      <td><input type="text" class="placa-input table-input" value="${
        vehicle.placa || ""
      }" ${isSaved ? "disabled" : ""} placeholder="Placa"></td>
      <td><input type="text" class="localizacao-input table-input" value="${
        vehicle.localizacao || ""
      }" ${isSaved ? "disabled" : ""} placeholder="Localização"></td>
      <td><input type="text" class="observacoes-input table-input" value="${
        vehicle.observacoes || ""
      }" ${isSaved ? "disabled" : ""} placeholder="Observações"></td>
      <td>
        ${
          !isSaved
            ? `<button type="button" class="remove-row-btn btn-secondary">Remover</button>`
            : ""
        }
      </td>
    `;

    const placaInput = newRow.querySelector(".placa-input");
    if (!isSaved) {
      IMask(placaInput, placaMaskOptions);
      newRow
        .querySelector(".remove-row-btn")
        .addEventListener("click", () => newRow.remove());
    } else {
      // Lógica para permitir edição de linhas salvas
      newRow.addEventListener("click", (e) => {
        if (
          e.target.tagName === "INPUT" &&
          e.target.disabled &&
          !newRow.classList.contains("editing-row")
        ) {
          Swal.fire({
            title: "Editar Veículo Registrado?",
            text: "Deseja habilitar a edição para este veículo? A alteração será salva ao submeter.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim, editar",
            cancelButtonText: "Cancelar",
          }).then((result) => {
            if (result.isConfirmed) {
              newRow
                .querySelectorAll("input")
                .forEach((input) => (input.disabled = false));
              newRow.classList.add("editing-row");
              newRow.classList.remove("saved-row");
              IMask(placaInput, placaMaskOptions); // Reaplicar máscara no campo de placa
            }
          });
          playNotificationSound("notification");
        }
      });
    }
    return newRow;
  };
  const loadVehiclesAndGenerateTable = async () => {
    vehiclesTableBody.innerHTML =
      '<tr><td colspan="8">Carregando veículos...</td></tr>';
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/veiculos/evento/${activeEventId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Falha ao carregar veículos.");

      const vehicles = await response.json();
      vehiclesTableBody.innerHTML = "";

      const existingTicketNumbers = new Set(
        vehicles.map((v) => parseInt(v.numero_ticket, 10))
      );
      const maxDbTicket =
        vehicles.length > 0 ? Math.max(...existingTicketNumbers) : 0;

      // Adiciona os veículos já registrados
      vehicles.forEach((v) => vehiclesTableBody.appendChild(createRow(v)));

      // Preenche os "buracos" na sequência de tickets
      for (let i = 1; i <= maxDbTicket; i++) {
        if (!existingTicketNumbers.has(i)) {
          vehiclesTableBody.appendChild(
            createRow({ numero_ticket: i.toString().padStart(2, "0") })
          );
        }
      }

      // Adiciona a quantidade inicial de linhas novas no final da sequência
      const initialRowsToAdd = parseInt(addRowCountInput.value, 10);
      for (let i = 1; i <= initialRowsToAdd; i++) {
        const newTicketNum = (maxDbTicket + i).toString().padStart(2, "0");
        vehiclesTableBody.appendChild(
          createRow({ numero_ticket: newTicketNum })
        );
      }

      sortVehiclesTable();
    } catch (error) {
      Swal.fire(
        "Erro!",
        "Não foi possível carregar os dados do evento.",
        "error"
      );
      playNotificationSound("error");
      vehiclesTableBody.innerHTML =
        '<tr><td colspan="8">Erro ao carregar.</td></tr>';
    }
  };

  /**
   * Ordena as linhas da tabela pelo número do ticket.
   */
  const sortVehiclesTable = () => {
    const rows = Array.from(vehiclesTableBody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      const ticketA = parseInt(a.querySelector(".ticket-input").value, 10) || 0;
      const ticketB = parseInt(b.querySelector(".ticket-input").value, 10) || 0;
      return ticketA - ticketB;
    });
    rows.forEach((row) => vehiclesTableBody.appendChild(row));
  };

  const addMoreRows = (countToAdd = null) => {
    const count =
      countToAdd !== null ? countToAdd : parseInt(addRowCountInput.value, 10);
    const currentTicketNumbers = new Set();
    vehiclesTableBody.querySelectorAll(".ticket-input").forEach((input) => {
      const num = parseInt(input.value, 10);
      if (!isNaN(num)) {
        currentTicketNumbers.add(num);
      }
    });

    let ticketsAdded = 0;
    let nextTicketCandidate = 1;

    // Loop para preencher buracos e depois adicionar no final
    while (ticketsAdded < count) {
      if (!currentTicketNumbers.has(nextTicketCandidate)) {
        // Encontrou um buraco, vamos preenchê-lo
        vehiclesTableBody.appendChild(
          createRow({
            numero_ticket: nextTicketCandidate.toString().padStart(2, "0"),
          })
        );
        currentTicketNumbers.add(nextTicketCandidate); // Adiciona ao Set para não usar de novo
        ticketsAdded++;
      }
      nextTicketCandidate++;

      const maxCurrentTicket =
        currentTicketNumbers.size > 0 ? Math.max(...currentTicketNumbers) : 0;
      if (nextTicketCandidate > maxCurrentTicket + 1) {
        nextTicketCandidate = maxCurrentTicket + 1;
      }
    }
    sortVehiclesTable();
  };

  /**
   * Processa o envio do formulário, coletando dados das linhas para inserir e atualizar.
   */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const inserts = [];
    const updates = [];

    // Coleta os dados das linhas da tabela
    for (const row of vehiclesTableBody.querySelectorAll("tr")) {
      if (
        row.classList.contains("saved-row") &&
        !row.classList.contains("editing-row")
      ) {
        continue;
      }
      const id = row.dataset.id;
      const ticketInput = row.querySelector(".ticket-input");
      const modeloInput = row.querySelector(".modelo-input");
      const placaInput = row.querySelector(".placa-input");
      if (!modeloInput.value.trim() && !placaInput.value.trim()) {
        continue;
      }
      const vehicleData = {
        evento_id: activeEventId,
        numero_ticket: ticketInput.value.trim(),
        modelo: modeloInput.value.trim(),
        cor: row.querySelector(".cor-input").value.trim(),
        placa: placaInput._imask
          ? placaInput._imask.unmaskedValue.toUpperCase()
          : placaInput.value.toUpperCase(),
        localizacao: row.querySelector(".localizacao-input").value.trim(),
        observacoes: row.querySelector(".observacoes-input").value.trim(),
      };
      if (id && row.classList.contains("editing-row")) {
        updates.push({ id, ...vehicleData });
      } else if (!id) {
        inserts.push(vehicleData);
      }
    }

    if (inserts.length === 0 && updates.length === 0) {
      showThemedError({
        title: "Nenhum veículo para salvar",
        text: "Preencha os dados de pelo menos um veículo novo ou edite um existente.",
      });
      playNotificationSound("error");
      return;
    }

    Swal.fire({
      title: "Registrando...",
      text: "Aguarde...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/veiculos/massa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inserts, updates }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro no servidor.");
      }

      const { created, updated, errors } = data.results;

      if (errors && errors.length > 0) {
        const successCount = created.length + updated.length;
        const errorCount = errors.length;
        const errorHtml = errors
          .map(
            (err) =>
              `<p><strong>Ticket ${err.ticket}:</strong> ${err.message}</p>`
          )
          .join("");

        showThemedError({
          title: `Operação Finalizada`,
          html: `
                    <p><strong>${successCount}</strong> veículos salvos com sucesso.</p>
                    <p><strong>${errorCount}</strong> veículos falharam:</p>
                    <div class="swal-error-list">${errorHtml}</div>
                `,
        });
        playNotificationSound("error");
      } else {
        showThemedSuccess({
          title: "Sucesso!",
          text: "Todos os veículos foram registrados e atualizados!",
        });
        playNotificationSound("success");
      }

      loadVehiclesAndGenerateTable();
    } catch (error) {
      showThemedError({ title: "Erro Crítico!", text: error.message });
      playNotificationSound("error");
    }
  };
  const filterTable = () => {
    const filterText = searchInput.value.toLowerCase();
    vehiclesTableBody.querySelectorAll("tr").forEach((row) => {
      const rowText = Array.from(row.querySelectorAll("input"))
        .map((i) => i.value.toLowerCase())
        .join(" ");
      row.style.display = rowText.includes(filterText) ? "" : "none";
    });
  };

  async function generateVehicleMapPdf() {
    Swal.fire({
      title: "Gerar Mapa de Veículos?",
      text: "Isso irá criar um PDF com os veículos preenchidos na tabela.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Sim, gerar!",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: "Gerando PDF...",
        text: "Aguarde...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "mm", "a4");

        doc.setFontSize(18);
        doc.text(
          `Mapa de Veículos - Evento: ${activeEventDetails.nome_evento}`,
          14,
          20
        );
        doc.setFontSize(10);
        doc.text(
          `Local: ${activeEventDetails.local_evento} | Data: ${new Date(
            activeEventDetails.data_evento
          ).toLocaleDateString("pt-BR")}`,
          14,
          28
        );

        const tableHeaders = [
          [
            "Prisma",
            "Ticket",
            "Modelo",
            "Cor",
            "Placa",
            "Localização",
            "Observações",
          ],
        ];
        const tableBody = [];
        let totalVehicles = 0;

        vehiclesTableBody.querySelectorAll("tr").forEach((row) => {
          if (row.style.display !== "none") {
            const modelo = row.querySelector(".modelo-input").value.trim();
            if (modelo) {
              tableBody.push([
                row.querySelector(".prisma-cell").textContent.trim(),
                row.querySelector(".ticket-input").value.trim(),
                modelo,
                row.querySelector(".cor-input").value.trim(),
                row.querySelector(".placa-input").value.trim(),
                row.querySelector(".localizacao-input").value.trim(),
                row.querySelector(".observacoes-input").value.trim(),
              ]);
              totalVehicles++;
            }
          }
        });

        doc.autoTable({
          head: tableHeaders,
          body: tableBody,
          startY: 40,
          theme: "grid",
          headStyles: {
            fillColor: [15, 52, 96],
            textColor: 255,
            fontStyle: "bold",
          },
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.text(
              `Página ${data.pageNumber} de ${doc.internal.getNumberOfPages()}`,
              data.settings.margin.left,
              doc.internal.pageSize.height - 10
            );
            doc.text(
              `Total de Veículos no Mapa: ${totalVehicles}`,
              doc.internal.pageSize.width - data.settings.margin.right,
              doc.internal.pageSize.height - 10,
              { align: "right" }
            );
          },
        });

        doc.save(
          `Mapa_Veiculos_${activeEventDetails.nome_evento.replace(
            /\s+/g,
            "_"
          )}.pdf`
        );
        Swal.close();
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        Swal.fire("Erro!", "Não foi possível gerar o PDF.", "error");
        playNotificationSound("error");
      }
    });
    playNotificationSound("notification");
  }

  const clearEmptyRows = () => {
    vehiclesTableBody.querySelectorAll("tr").forEach((row) => {
      if (!row.classList.contains("saved-row")) {
        const isRowEmpty =
          !row.querySelector(".modelo-input").value.trim() &&
          !row.querySelector(".cor-input").value.trim() &&
          !row.querySelector(".placa-input").value.trim();
        if (isRowEmpty) row.remove();
      }
    });
  };

  // --- Adiciona os Event Listeners ---
  addRowsBtn.addEventListener("click", () => addMoreRows());
  massRegisterForm.addEventListener("submit", handleFormSubmit);
  searchInput.addEventListener("keyup", filterTable);
  generatePdfBtn.addEventListener("click", generateVehicleMapPdf);
  clearEmptyRowsBtn.addEventListener("click", clearEmptyRows);

  // --- Carga Inicial ---
  loadVehiclesAndGenerateTable();
});
