document.addEventListener("DOMContentLoaded", () => {
  const { token, user } = verificarAutenticacao();
  if (!user) return;

  const createEventForm = document.getElementById("createEventForm");
  const nomeEventoInput = document.getElementById("nomeEvento");
  const dataEventoInput = document.getElementById("dataEvento");
  const horaInicioEventoInput = document.getElementById("horaInicioEvento");
  const horaFimEventoInput = document.getElementById("horaFimEvento");
  const dataFimEventoInput = document.getElementById("dataFimEvento");
  const localEventoInput = document.getElementById("localEvento");
  const descricaoEventoInput = document.getElementById("descricaoEvento");
  const eventsContainer = document.getElementById("eventsContainer");
  const noEventsMessage = document.getElementById("noEventsMessage");

  async function loadEvents() {
    eventsContainer.innerHTML = "<p>Carregando eventos...</p>";
    noEventsMessage.style.display = "none";

    try {
      const response = await fetch(`${API_BASE_URL}/api/eventos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        eventsContainer.innerHTML = "";
        noEventsMessage.style.display = data.length === 0 ? "block" : "none";

        data.forEach((event) => {
          const eventItem = document.createElement("div");
          eventItem.classList.add("event-item");
          const isActive = event.is_active;

          const actionButtons = isActive
            ? `
              <button class="deactivate-event-btn" data-event-id="${event.id}">Desativar</button>
            <button class="delete-event" data-event-id="${event.id}" data-is-active="true">Excluir</button>
            `
            : `
              <button class="set-active-btn" data-event-id="${
                event.id
              }" data-event-details='${JSON.stringify(
                event
              )}'>Definir como Ativo</button>
              <button class="delete-event" data-event-id="${
                event.id
              }">Excluir</button>
            `;

          eventItem.innerHTML = `
              <h3>${event.nome_evento} ${
            isActive
              ? '<span class="active-event-indicator">(ATIVO)</span>'
              : ""
          }</h3>
            <p>Data: ${new Date(event.data_evento).toLocaleDateString(
              "pt-BR"
            )} ${
            event.data_fim &&
            new Date(event.data_fim).toLocaleDateString("pt-BR") !==
              new Date(event.data_evento).toLocaleDateString("pt-BR")
              ? " - " + new Date(event.data_fim).toLocaleDateString("pt-BR")
              : ""
          }</p>
            <p>Horário: ${event.hora_inicio} - ${event.hora_fim}</p>
              <p>Local: ${event.local_evento}</p>
              <p>Descrição: ${event.descricao || "N/A"}</p>
              <div class="actions">
                  ${actionButtons}
                  <button class="report-btn" data-event-id="${
                    event.id
                  }">Gerar Relatório</button>
              </div>`;
          eventsContainer.appendChild(eventItem);
        });
        addEventListeners();
      } else {
        Swal.fire(
          "Erro!",
          data.message || "Erro ao carregar eventos.",
          "error"
        );
        playNotificationSound("error");
      }
    } catch (error) {
      Swal.fire(
        "Erro de Conexão",
        "Não foi possível conectar ao servidor.",
        "error"
      );
      playNotificationSound("error");
    }
  }

  function addEventListeners() {
    document.querySelectorAll(".set-active-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const eventId = e.target.dataset.eventId;
        
        // Pegamos os detalhes que já estão no botão para facilitar
        // Mas o ideal é pegar a resposta atualizada da API (vamos fazer isso abaixo)
        
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/eventos/${eventId}/ativar`,
            {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          const data = await response.json(); // Lemos a resposta da API

          if (!response.ok) throw new Error(data.message || "Falha ao ativar o evento.");
          
          if (data.event) {
             localStorage.setItem("activeEventId", data.event.id);
             localStorage.setItem("activeEventDetails", JSON.stringify(data.event));
          }
          // ------------------------------------------

          showThemedSuccess({
            title: "Evento Ativado!",
            text: `O evento agora está ativo.`,
          });
          playNotificationSound("success");
          
          loadEvents(); // Recarrega a lista para atualizar os botões
          
        } catch (error) {
          showThemedError({ title: "Erro!", text: error.message });
          playNotificationSound("error");
        }
      });
    });

    document.querySelectorAll(".deactivate-event-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        Swal.fire({
          title: "Desativar Evento?",
          text: "Isso removerá o evento ativo, mas não excluirá nenhum dado.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Sim, desativar!",
          cancelButtonText: "Cancelar",
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/eventos/desativar`,
                {
                  method: "PUT",
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || "Erro ao desativar evento.");
              }

              localStorage.removeItem("activeEventId");
              localStorage.removeItem("activeEventDetails");

              Swal.fire(
                "Desativado!",
                data.message || "O evento foi desativado com sucesso.",
                "success"
              );
              playNotificationSound("success");
              loadEvents();
            } catch (error) {
              Swal.fire("Erro!", error.message, "error");
              playNotificationSound("error");
            }
          }
        });
        playNotificationSound("notification");
      });
    });

    document.querySelectorAll(".delete-event").forEach((button) => {
      button.addEventListener("click", (e) => {
        const eventId = e.target.dataset.eventId;
        const isActive = e.target.dataset.isActive === "true";

        if (isActive) {
          Swal.fire({
            title: "Ação Necessária",
            text: "Este evento está ativo e não pode ser excluído. Você precisa desativá-lo primeiro.",
            icon: "info",
            confirmButtonText: "Entendi",
          });
          playNotificationSound("notification");
        } else {
          Swal.fire({
            title: "Tem certeza?",
            text: "Esta ação é irreversível e excluirá o evento e todos os veículos associados!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sim, excluir!",
            cancelButtonText: "Cancelar",
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/api/eventos/${eventId}`,
                  {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                const data = await response.json();
                if (response.ok) {
                  Swal.fire("Excluído!", data.message, "success");
                  playNotificationSound("success");
                  if (localStorage.getItem("activeEventId") == eventId) {
                    localStorage.removeItem("activeEventId");
                    localStorage.removeItem("activeEventDetails");
                  }
                  loadEvents();
                } else {
                  Swal.fire(
                    "Erro!",
                    data.message || "Erro ao excluir evento.",
                    "error"
                  );
                  playNotificationSound("error");
                }
              } catch (error) {
                Swal.fire(
                  "Erro de Conexão",
                  "Não foi possível conectar ao servidor.",
                  "error"
                );
                playNotificationSound("error");
              }
            }
          });
          playNotificationSound("notification");
        }
      });
    });
    document.querySelectorAll(".report-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const eventId = e.target.dataset.eventId;
        Swal.fire({
          title: "Gerar Relatório?",
          text: "Isso irá criar um PDF com o resumo completo do evento.",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Sim, gerar!",
          cancelButtonText: "Cancelar",
        }).then((result) => {
          if (result.isConfirmed) {
            generateReport(eventId);
          }
        });
        playNotificationSound("notification");
      });
    });
  }

  createEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      nome_evento: nomeEventoInput.value,
      data_evento: dataEventoInput.value,
      hora_inicio: horaInicioEventoInput.value,
      hora_fim: horaFimEventoInput.value,
      data_fim: dataFimEventoInput.value,
      local_evento: localEventoInput.value,
      descricao: descricaoEventoInput.value,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/api/eventos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) {
        showThemedSuccess({ title: "Sucesso!", text: data.message });
        playNotificationSound("success");
        createEventForm.reset();
        loadEvents();
      } else {
        showThemedError({
          title: "Erro!",
          text: data.message || "Erro ao criar evento.",
        });
        playNotificationSound("error");
      }
    } catch (error) {
      showThemedError({
        title: "Erro de Conexão",
        text: "Não foi possível conectar ao servidor.",
      });
      playNotificationSound("error");
    }
  });

  async function generateReport(eventId) {
    Swal.fire({
      title: "Gerando Relatório...",
      text: "Aguarde...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/eventos/${eventId}/relatorio`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok)
        throw new Error(
          (await response.json()).message || "Falha ao buscar dados."
        );

      const { evento, veiculos } = await response.json();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "mm", "a4");

      doc.setFontSize(20);
      doc.text("Relatório Final de Evento", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Evento: ${evento.nome_evento}`, 14, 40);
      doc.text(`Local: ${evento.local_evento}`, 14, 47);
      doc.text(
        `Data: ${new Date(evento.data_evento).toLocaleDateString("pt-BR")}`,
        14,
        54
      );
      doc.text(`Horário: ${evento.hora_inicio} - ${evento.hora_fim}`, 14, 61);
      doc.text(`Descrição: ${evento.descricao || "N/A"}`, 14, 68);

      const tableHeaders = [
        [
          "Ticket",
          "Placa",
          "Modelo",
          "Cor",
          "Localização",
          "Entrada",
          "Saída",
          "Permanência",
          "Entrada por",
          "Saída por",
        ],
      ];
      const tableBody = veiculos.map((v) => {
        const entrada = new Date(v.hora_entrada);
        const saida = v.hora_saida ? new Date(v.hora_saida) : null;
        let permanencia = "N/A";
        if (saida) {
          const diffMs = saida - entrada;
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMins = Math.round((diffMs % 3600000) / 60000);
          permanencia = `${diffHrs}h ${diffMins}min`;
        }
        return [
          v.numero_ticket,
          v.placa,
          v.modelo,
          v.cor,
          v.localizacao,
          entrada.toLocaleTimeString("pt-BR"),
          saida ? saida.toLocaleTimeString("pt-BR") : "Estacionado",
          permanencia,
          v.nome_usuario_entrada || "N/A",
          v.nome_usuario_saida || "N/A",
        ];
      });

      doc.autoTable({
        head: tableHeaders,
        body: tableBody,
        startY: 70,
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: "linebreak",
          valign: "middle",
          halign: "center",
        },
        headStyles: {
          fillColor: [15, 52, 96],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 18 },
          2: { cellWidth: 22 },
          3: { cellWidth: 15 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
          8: { cellWidth: 22 },
          9: { cellWidth: 22 },
        },
      });

      doc.save(`Relatorio_${evento.nome_evento.replace(/\s+/g, "_")}.pdf`);
      Swal.close();
    } catch (error) {
      Swal.fire(
        "Erro!",
        error.message || "Não foi possível gerar o relatório.",
        "error"
      );
      playNotificationSound("error");
    }
  }

  loadEvents();
});