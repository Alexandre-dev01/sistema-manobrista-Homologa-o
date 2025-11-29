document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome_usuario = usernameInput.value;
    const senha = passwordInput.value;

    if (nome_usuario.length < 3 || nome_usuario.length > 30) {
      Swal.fire({
        icon: "error",
        title: "Erro de Login",
        text: "Nome de usuário deve ter entre 3 e 30 caracteres.",
      });
      playNotificationSound("error");
      return;
    }

    if (senha.length < 6 || senha.length > 60) {
      Swal.fire({
        icon: "error",
        title: "Erro de Login",
        text: "Senha deve ter entre 6 e 60 caracteres.",
      });
      playNotificationSound("error");
    }

    Swal.fire({
      title: "Autenticando...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      // --- ALTERAÇÃO AQUI ---
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome_usuario, senha }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        try {
          // --- ALTERAÇÃO AQUI ---
          const eventoAtivoResponse = await fetch(
            `${API_BASE_URL}/api/eventos/ativo`,
            {
              headers: { Authorization: `Bearer ${data.token}` },
            }
          );
          if (eventoAtivoResponse.ok) {
            const eventoAtivo = await eventoAtivoResponse.json();
            if (eventoAtivo) {
              localStorage.setItem("activeEventId", eventoAtivo.id);
              localStorage.setItem(
                "activeEventDetails",
                JSON.stringify(eventoAtivo)
              );
            } else {
              localStorage.removeItem("activeEventId");
              localStorage.removeItem("activeEventDetails");
            }
          }
        } catch (e) {
          console.error("Não foi possível buscar o evento ativo no login.", e);
        }

        Swal.fire({
          icon: "success",
          title: "Login bem-sucedido!",
          text: `Bem-vindo, ${data.user.nome_usuario}!`,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "dashboard.html";
        });
        playNotificationSound("success");
      } else {
        Swal.fire({
          icon: "error",
          title: "Falha no Login",
          text: data.message || "Usuário ou senha inválidos.",
        });
        playNotificationSound("error");
      }
    } catch (error) {
      console.error("Erro de rede ou servidor:", error);
      Swal.fire({
        icon: "error",
        title: "Erro de Conexão",
        text: "Não foi possível conectar ao servidor. Tente novamente.",
      });
      playNotificationSound("error");
    }
  });
});
