// users-admin.js
document.addEventListener("DOMContentLoaded", () => {
  let token = null;
  let loggedInUser = null;
  try {
    const auth = typeof verificarAutenticacao === "function" ? verificarAutenticacao() : {};
    token = auth.token;
    loggedInUser = auth.user;
  } catch (err) {
    console.error("Erro ao verificar autenticação:", err);
  }

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

  if (registerButton) registerButton.disabled = true;

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!registerButton || registerButton.disabled) return;

      registerButton.disabled = true;
      const originalText = registerButton.textContent;
      registerButton.textContent = "Cadastrando...";

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
            nome_usuario: nomeUsuarioInput ? nomeUsuarioInput.value : "",
            senha: senhaInput ? senhaInput.value : "",
            cargo: cargoSelect ? cargoSelect.value : "",
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          Toast.fire({ icon: "success", title: data.message || "Cadastrado com sucesso" });
          playNotificationSound("success");
          registerForm.reset();
          validatePassword();
          loadUsers();
        } else {
          Swal.fire({
            icon: "error",
            title: "Erro no Cadastro",
            text: data.message || "Erro ao cadastrar usuário.",
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
      } finally {
        registerButton.disabled = false;
        registerButton.textContent = originalText;
      }
    });
  }
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
  async function loadUsers() {
    if (!userListContainer) return;
    userListContainer.innerHTML = '<p class="loading-message">Carregando usuários...</p>';
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth?status=${currentView}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Falha ao carregar usuários: ${response.status} ${response.statusText}`);
      }

      const users = await response.json().catch(() => []);
      userListContainer.innerHTML = "";

      if (!Array.isArray(users) || users.length === 0) {
        userListContainer.innerHTML = `<p class="no-data-message">Nenhum usuário ${currentView} encontrado.</p>`;
        return;
      }

      users.forEach((user) => {
        const userItem = document.createElement("div");
        userItem.className = `user-item ${user.status === "inativo" ? "inactive-user" : ""}`;

        const isSelf = user.id === loggedInUser.id;

        // Coluna de info do usuário
        const userInfoCol = document.createElement("div");
        userInfoCol.className = "user-info-col";
        const mobileLabel = document.createElement("span");
        mobileLabel.className = "mobile-label";
        mobileLabel.textContent = "Usuário:";
        const userNameSpan = document.createElement("span");
        userNameSpan.className = "user-name";
        userNameSpan.innerHTML = '<i class="fas fa-user"></i> ';
        userNameSpan.appendChild(document.createTextNode(user.nome_usuario));
        userInfoCol.appendChild(mobileLabel);
        userInfoCol.appendChild(userNameSpan);

        // Coluna de cargo
        const userRoleCol = document.createElement("div");
        userRoleCol.className = "user-role-col";
        const roleLabel = document.createElement("span");
        roleLabel.className = "mobile-label";
        roleLabel.textContent = "Cargo:";
        const roleSpan = document.createElement("span");
        roleSpan.className = `user-role role-${user.cargo}`;
        roleSpan.textContent = user.cargo;
        userRoleCol.appendChild(roleLabel);
        userRoleCol.appendChild(roleSpan);

        // Coluna de ações
        const userActionsCol = document.createElement("div");
        userActionsCol.className = "user-actions-col";
        if (isSelf) {
          const selfSpan = document.createElement("span");
          selfSpan.className = "self-indicator";
          selfSpan.textContent = "(Você)";
          userActionsCol.appendChild(selfSpan);
        } else {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `action-btn ${user.status === "ativo" ? "deactivate-btn" : "reactivate-btn"}`;
          btn.dataset.userId = user.id;
          btn.dataset.userName = user.nome_usuario;
          btn.innerHTML = user.status === "ativo"
            ? '<i class="fas fa-user-slash"></i> Desativar'
            : '<i class="fas fa-user-check"></i> Reativar';
          userActionsCol.appendChild(btn);
        }

        userItem.appendChild(userInfoCol);
        userItem.appendChild(userRoleCol);
        userItem.appendChild(userActionsCol);
        userListContainer.appendChild(userItem);
      });
      if (!userListContainer.__hasDelegation) {
        userListContainer.addEventListener("click", (e) => {
          const btn = e.target.closest(".action-btn");
          if (!btn) return;
          const userId = btn.dataset.userId;
          const userName = btn.dataset.userName;
          if (btn.classList.contains("deactivate-btn")) {
            showThemedConfirmation({
              title: "Desativar Usuário?",
              text: `Você está prestes a desativar o acesso de <strong>"${userName}"</strong>.`,
              icon: "fa-user-slash",
              confirmButtonText: "Sim, desativar",
            }).then((isConfirmed) => {
              if (isConfirmed) deactivateUser(userId);
            });
            playNotificationSound("notification");
          } else if (btn.classList.contains("reactivate-btn")) {
            showThemedConfirmation({
              title: "Reativar Usuário?",
              text: `Deseja conceder o acesso novamente para <strong>"${userName}"</strong>?`,
              icon: "fa-user-check",
              confirmButtonText: "Sim, reativar",
            }).then((isConfirmed) => {
              if (isConfirmed) reactivateUser(userId);
            });
            playNotificationSound("notification");
          }
        });
        userListContainer.__hasDelegation = true;
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      userListContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
  }
  async function deactivateUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${userId}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Erro ao desativar usuário");
      Swal.fire({
        icon: "success",
        title: "Desativado!",
        text: data.message || "Usuário desativado com sucesso",
        timer: 2000,
        showConfirmButton: false,
      });
      playNotificationSound("success");
      loadUsers();
    } catch (error) {
      Swal.fire("Erro!", error.message || "Erro ao desativar usuário", "error");
      playNotificationSound("error");
    }
  }

  async function reactivateUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${userId}/reactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Erro ao reativar usuário");
      Swal.fire({
        icon: "success",
        title: "Reativado!",
        text: data.message || "Usuário reativado com sucesso",
        timer: 2000,
        showConfirmButton: false,
      });
      playNotificationSound("success");
      loadUsers();
    } catch (error) {
      Swal.fire("Erro!", error.message || "Erro ao reativar usuário", "error");
      playNotificationSound("error");
    }
  }
  function validatePassword() {
    if (!senhaInput || !confirmSenhaInput || !registerButton || !nomeUsuarioInput || !cargoSelect) return;
    const senha = senhaInput.value;
    const confirmSenha = confirmSenhaInput.value;
    const requirements = {
      length: senha.length >= 6,
      uppercase: /[A-Z]/.test(senha),
      lowercase: /[a-z]/.test(senha),
      number: /[0-9]/.test(senha),
      special: /[!@#$%^&*]/.test(senha),
    };

    const setClass = (id, ok) => {
      const el = document.getElementById(id);
      if (el) el.className = ok ? "valid" : "invalid";
    };

    setClass("reqLength", requirements.length);
    setClass("reqUppercase", requirements.uppercase);
    setClass("reqLowercase", requirements.lowercase);
    setClass("reqNumber", requirements.number);
    setClass("reqSpecial", requirements.special);

    const matchMessage = document.getElementById("matchMessage");
    const passwordsMatch = senha === confirmSenha && senha !== "";
    if (matchMessage) {
      if (confirmSenha !== "") {
        matchMessage.style.display = "block";
        matchMessage.className = passwordsMatch ? "valid" : "invalid";
        matchMessage.textContent = passwordsMatch ? "Senhas coincidem" : "Senhas não coincidem";
      } else {
        matchMessage.style.display = "none";
      }
    }

    const allValid =
      Object.values(requirements).every(Boolean) &&
      passwordsMatch &&
      nomeUsuarioInput.value.trim() !== "" &&
      cargoSelect.value !== "";

    if (registerButton) registerButton.disabled = !allValid;
  }

  if (senhaInput) {
    [senhaInput, confirmSenhaInput, nomeUsuarioInput, cargoSelect].forEach((input) => {
      if (input) input.addEventListener("input", validatePassword);
    });
  }
  (function initRegisterToggles() {
    const createToggleFor = (inputEl) => {
      if (!inputEl) return;
      // evita duplicar
      if (inputEl.parentElement.querySelector(".toggle-password")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toggle-password";
      btn.setAttribute("aria-label", "Mostrar senha");
      btn.dataset.target = inputEl.id;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
      const wrapper = inputEl.parentElement;
      wrapper.appendChild(btn);

      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        const isPassword = target.type === "password";
        target.type = isPassword ? "text" : "password";
        if (isPassword) {
          btn.classList.add("visible");
          btn.setAttribute("aria-pressed", "true");
          btn.setAttribute("aria-label", "Ocultar senha");
        } else {
          btn.classList.remove("visible");
          btn.setAttribute("aria-pressed", "false");
          btn.setAttribute("aria-label", "Mostrar senha");
        }
      });
    };

    createToggleFor(senhaInput);
    createToggleFor(confirmSenhaInput);
  })();
  loadUsers();
});