document.addEventListener("DOMContentLoaded", () => {
  // 1. VERIFICAÇÃO DE PERMISSÃO
  const { token, user: loggedInUser } = verificarAutenticacao();
  if (!loggedInUser || loggedInUser.cargo !== "admin") {
    Swal.fire({
      icon: "error",
      title: "Acesso Negado",
      text: "Você não tem permissão para acessar esta página.",
    }).then(() => {
      window.location.href = "dashboard.html";
    });
    playNotificationSound("error");
    return;
  }

  // 2. SELEÇÃO DOS ELEMENTOS DO DOM
  const registerForm = document.getElementById("registerForm");
  const nomeUsuarioInput = document.getElementById("nome_usuario");
  const senhaInput = document.getElementById("senha");
  const confirmSenhaInput = document.getElementById("confirm_senha");
  const cargoSelect = document.getElementById("cargo");
  const registerButton = document.getElementById("registerButton");
  const userListContainer = document.getElementById("userList");
  const showActiveBtn = document.getElementById("showActiveBtn");
  const showInactiveBtn = document.getElementById("showInactiveBtn");

  let currentView = "ativo";

  // 3. LÓGICA DE CADASTRO (com verificação de existência do formulário)
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (registerButton.disabled) return;
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome_usuario: nomeUsuarioInput.value,
            senha: senhaInput.value,
            cargo: cargoSelect.value,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          Toast.fire({ icon: "success", title: data.message });
          playNotificationSound("success");
          registerForm.reset();
          validatePassword();
          loadUsers();
        } else {
          Swal.fire({
            icon: "error",
            title: "Erro no Cadastro",
            text: data.message,
          });
          playNotificationSound("error");
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Erro de Conexão",
          text: "Não foi possível conectar ao servidor.",
        });
        playNotificationSound("error");
      }
    });
  }

  // 4. LÓGICA DOS BOTÕES DE FILTRO (ATIVOS/INATIVOS)
  if (showActiveBtn && showInactiveBtn) {
    showActiveBtn.addEventListener("click", () => {
      currentView = "ativo";
      showActiveBtn.classList.add("active");
      showInactiveBtn.classList.remove("active");
      loadUsers();
    });

    showInactiveBtn.addEventListener("click", () => {
      currentView = "inativo";
      showInactiveBtn.classList.add("active");
      showActiveBtn.classList.remove("active");
      loadUsers();
    });
  }

  // 5. FUNÇÃO PARA CARREGAR E EXIBIR A LISTA DE USUÁRIOS
  async function loadUsers() {
    userListContainer.innerHTML =
      '<p class="loading-message">Carregando usuários...</p>';
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth?status=${currentView}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok)
        throw new Error(`Falha ao carregar usuários: ${response.statusText}`);

      const users = await response.json();
      userListContainer.innerHTML = "";

      if (users.length === 0) {
        userListContainer.innerHTML = `<p class="no-data-message">Nenhum usuário ${currentView} encontrado.</p>`;
        return;
      }

      users.forEach((user) => {
        const userItem = document.createElement("div");
        userItem.className = `user-item ${
          user.status === "inativo" ? "inactive-user" : ""
        }`;

        const isSelf = user.id === loggedInUser.id;
        let actionButtonHtml = '<span class="self-indicator">(Você)</span>';
        if (!isSelf) {
          if (user.status === "ativo") {
            actionButtonHtml = `<button class="action-btn deactivate-btn" data-user-id="${user.id}" data-user-name="${user.nome_usuario}"><i class="fas fa-user-slash"></i> Desativar</button>`;
          } else {
            actionButtonHtml = `<button class="action-btn reactivate-btn" data-user-id="${user.id}" data-user-name="${user.nome_usuario}"><i class="fas fa-user-check"></i> Reativar</button>`;
          }
        }

        userItem.innerHTML = `
          <div class="user-info-col">
              <span class="mobile-label">Usuário:</span>
              <span class="user-name"><i class="fas fa-user"></i> ${user.nome_usuario}</span>
          </div>
          <div class="user-role-col">
              <span class="mobile-label">Cargo:</span>
              <span class="user-role role-${user.cargo}">${user.cargo}</span>
          </div>
          <div class="user-actions-col">
              ${actionButtonHtml}
          </div>`;
        userListContainer.appendChild(userItem);
      });

      addEventListeners();
    } catch (error) {
      userListContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
  }

  // 6. FUNÇÃO PARA ADICIONAR LISTENERS AOS BOTÕES DE AÇÃO
  function addEventListeners() {
    document.querySelectorAll(".deactivate-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const userId = e.currentTarget.dataset.userId;
        const userName = e.currentTarget.dataset.userName;
        showThemedConfirmation({
          title: "Desativar Usuário?",
          text: `Você está prestes a desativar o acesso de <strong>"${userName}"</strong>.`,
          icon: "fa-user-slash",
          confirmButtonText: "Sim, desativar",
        }).then((isConfirmed) => {
          if (isConfirmed) deactivateUser(userId);
        });
        playNotificationSound("notification");
      });
    });

    document.querySelectorAll(".reactivate-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const userId = e.currentTarget.dataset.userId;
        const userName = e.currentTarget.dataset.userName;
        showThemedConfirmation({
          title: "Reativar Usuário?",
          text: `Deseja conceder o acesso novamente para <strong>"${userName}"</strong>?`,
          icon: "fa-user-check",
          confirmButtonText: "Sim, reativar",
        }).then((isConfirmed) => {
          if (isConfirmed) reactivateUser(userId);
        });
        playNotificationSound("notification");
      });
    });
  }

  // 7. FUNÇÕES DE AÇÃO (DESATIVAR E REATIVAR)
  async function deactivateUser(userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/${userId}/deactivate`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      Swal.fire({
        icon: "success",
        title: "Desativado!",
        text: data.message,
        timer: 2000,
        showConfirmButton: false,
      });
      playNotificationSound("success");
      loadUsers();
    } catch (error) {
      Swal.fire("Erro!", error.message, "error");
      playNotificationSound("error");
    }
  }

  async function reactivateUser(userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/${userId}/reactivate`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      Swal.fire({
        icon: "success",
        title: "Reativado!",
        text: data.message,
        timer: 2000,
        showConfirmButton: false,
      });
      playNotificationSound("success");
      loadUsers();
    } catch (error) {
      Swal.fire("Erro!", error.message, "error");
      playNotificationSound("error");
    }
  }

  // 8. VALIDAÇÃO DE SENHA E CARGA INICIAL
  function validatePassword() {
    if (!senhaInput || !confirmSenhaInput || !registerButton) return;
    const senha = senhaInput.value;
    const confirmSenha = confirmSenhaInput.value;
    const requirements = {
      length: senha.length >= 6,
      uppercase: /[A-Z]/.test(senha),
      lowercase: /[a-z]/.test(senha),
      number: /[0-9]/.test(senha),
      special: /[!@#$%^&*]/.test(senha),
    };
    document.getElementById("reqLength").className = requirements.length
      ? "valid"
      : "invalid";
    document.getElementById("reqUppercase").className = requirements.uppercase
      ? "valid"
      : "invalid";
    document.getElementById("reqLowercase").className = requirements.lowercase
      ? "valid"
      : "invalid";
    document.getElementById("reqNumber").className = requirements.number
      ? "valid"
      : "invalid";
    document.getElementById("reqSpecial").className = requirements.special
      ? "valid"
      : "invalid";

    const matchMessage = document.getElementById("matchMessage");
    const passwordsMatch = senha === confirmSenha && senha !== "";
    if (confirmSenha !== "") {
      matchMessage.style.display = "block";
      matchMessage.className = passwordsMatch ? "valid" : "invalid";
      matchMessage.textContent = passwordsMatch
        ? "Senhas coincidem"
        : "Senhas não coincidem";
    } else {
      matchMessage.style.display = "none";
    }

    const allValid =
      Object.values(requirements).every(Boolean) &&
      passwordsMatch &&
      nomeUsuarioInput.value.trim() !== "" &&
      cargoSelect.value !== "";
    registerButton.disabled = !allValid;
  }

  if (senhaInput) {
    [senhaInput, confirmSenhaInput, nomeUsuarioInput, cargoSelect].forEach(
      (input) => {
        if (input) input.addEventListener("input", validatePassword);
      }
    );
  }

  loadUsers();
});
