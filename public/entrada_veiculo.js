document.addEventListener("DOMContentLoaded", () => {
  const { token, user, activeEventId, activeEventDetails } =
    verificarAutenticacao();
  if (!user) return;

  const entradaVeiculoForm = document.getElementById("entradaVeiculoForm");
  if (!entradaVeiculoForm) return;

  if (!activeEventId || !activeEventDetails) {
    showThemedError({
      title: "Nenhum Evento Ativo",
      text: "Por favor, selecione um evento antes de registrar um veículo.",
    }).then(() => {
      window.location.href = "dashboard.html";
    });
    playNotificationSound("error");
    return;
  }

  renderActiveEventCard(activeEventDetails, "eventInfoDisplay");

  const numeroTicketInput = document.getElementById("numeroTicket");
  const modeloCarroInput = document.getElementById("modeloCarro");
  const corCarroInput = document.getElementById("corCarro");
  const placaCarroInput = document.getElementById("placaCarro");
  const localizacaoCarroInput = document.getElementById("localizacaoCarro");
  const observacoesCarroInput = document.getElementById("observacoesCarro");

  const placaMask = IMask(placaCarroInput, {
    mask: "AAA-0*00",
    definitions: { A: /[A-Z]/, 0: /[0-9]/, "*": /[A-Z0-9]/ },
    prepare: (str) => str.toUpperCase(),
  });

  numeroTicketInput.focus();
  placaCarroInput.addEventListener("keyup", () => {
    if (placaMask.unmaskedValue.length === 7) {
      localizacaoCarroInput.focus();
    }
  });

  entradaVeiculoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const veiculo = {
      evento_id: activeEventId,
      numero_ticket: numeroTicketInput.value,
      modelo: modeloCarroInput.value,
      cor: corCarroInput.value,
      placa: placaMask.unmaskedValue,
      localizacao: localizacaoCarroInput.value,
      observacoes: observacoesCarroInput.value,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/veiculos/entrada`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(veiculo),
      });
      const data = await response.json();

      if (response.ok) {
        showThemedSuccess({ title: "Veículo Registrado!", text: data.message });
        playNotificationSound("success");
        entradaVeiculoForm.reset();
        // ...
      } else {
        showThemedError({ title: "Erro ao Registrar", text: data.message });
        playNotificationSound("error");
      }
    } catch (error) {
      showThemedError({
        title: "Erro de Conexão",
        text: "Não foi possível conectar ao servidor.",
      });
      playNotificationSound("error");
    } finally {
      submitButton.disabled = false;
    }
  });

  corCarroInput.addEventListener("input", (event) => {
    const originalValue = event.target.value;
    const cleanedValue = originalValue.replace(/[^a-zA-Z\s]/g, "");
    if (originalValue !== cleanedValue) {
      event.target.value = cleanedValue;
    }
  });
});
