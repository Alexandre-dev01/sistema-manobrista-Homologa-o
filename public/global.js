// Arquivo: global.js (VERSÃO FINAL)

function verificarAutenticacao() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    localStorage.clear();
    window.location.href = "index.html"; // ALTERADO DE login.html
    return {};
  }

  const activeEventId = localStorage.getItem("activeEventId");
  const activeEventDetails = JSON.parse(
    localStorage.getItem("activeEventDetails")
  );

  return { token, user, activeEventId, activeEventDetails };
}

document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop();

  if (currentPage !== "index.html" && currentPage !== "cadastro_usuario.html") {
    const user = JSON.parse(localStorage.getItem("user"));
    if (typeof setupHeaderLogic === "function") {
      setupHeaderLogic(user);
    }
  }
});
/**
 * Exibe um pop-up de confirmação do SweetAlert2 com o tema do sistema.
 * @param {object} options - As opções para o alerta.
 * @param {string} options.title - O título do alerta (ex: "Desativar Usuário?").
 * @param {string} options.text - O texto/descrição do alerta.
 * @param {string} options.icon - O nome da classe do ícone do Font Awesome (ex: "fa-key").
 * @param {string} options.confirmButtonText - O texto para o botão de confirmação.
 * @returns {Promise<boolean>} - Retorna uma promessa que resolve para `true` se confirmado, `false` caso contrário.
 */
function showThemedConfirmation(options) {
  return Swal.fire({
    title: options.title,
    html: options.text, // Usamos 'html' para permitir tags como <strong>
    iconHtml: `<i class="fas ${options.icon} swal-icon-custom"></i>`,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText,
    cancelButtonText: "Cancelar",
    customClass: {
      popup: "swal-popup-custom",
      confirmButton: "swal-confirm-custom",
      cancelButton: "swal-cancel-custom",
      icon: "swal-icon-borderless",
    },
  }).then((result) => {
    return result.isConfirmed; // Retorna true se o botão de confirmação foi clicado
  });
}
/**
 * Exibe um pop-up de SUCESSO com o tema do sistema.
 * @param {object} options - As opções para o alerta.
 * @param {string} options.title - O título do alerta.
 * @param {string} options.text - O texto/descrição do alerta.
 */
function showThemedSuccess(options) {
  Swal.fire({
    icon: "success",
    title: options.title,
    text: options.text,
    customClass: {
      popup: "swal-popup-custom",
      confirmButton: "swal-confirm-custom",
    },
    timer: 2500, // Fecha automaticamente após 2.5 segundos
    showConfirmButton: false,
  });
}

/**
 * Exibe um pop-up de ERRO com o tema do sistema.
 * @param {object} options - As opções para o alerta.
 * @param {string} options.title - O título do alerta.
 * @param {string} options.text - O texto/descrição do alerta.
 * @param {string} [options.html] - Permite usar HTML no corpo do alerta.
 */
function showThemedError(options) {
  Swal.fire({
    icon: "error",
    title: options.title,
    text: options.text,
    html: options.html, // Permite passar HTML para listas de erros, etc.
    customClass: {
      popup: "swal-popup-custom",
      confirmButton: "swal-confirm-custom", // Usa o mesmo estilo de botão para consistência
    },
  });
}
/**
 * Toca um arquivo de som com base no tipo de notificação.
 * @param {'success' | 'error' | 'notification'} type
 */
function playNotificationSound(type) {
  // Mapeia o tipo de notificação para o caminho do arquivo de som.
  const soundFiles = {
    success: "sounds/success.mp3",
    error: "sounds/error.mp3",
    notification: "sounds/notification.mp3",
  };

  // Verifica se o tipo de som solicitado existe no nosso mapeamento.
  if (soundFiles[type]) {
    const audio = new Audio(soundFiles[type]);
    audio.play().catch((error) => {
      console.warn(
        "A reprodução de áudio foi bloqueada pelo navegador:",
        error
      );
    });
  }
}
