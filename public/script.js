document.addEventListener('DOMContentLoaded', () => {
    const testApiButton = document.getElementById('testApiButton');
    const apiResponse = document.getElementById('apiResponse');

    testApiButton.addEventListener('click', async () => {
        try {
            // Faz uma requisição para a rota de teste do seu backend
            const response = await fetch('http://localhost:3000/' );
            const text = await response.text(); // Ou response.json() se a API retornar JSON
            apiResponse.textContent = `Resposta da API: ${text}`;
        } catch (error) {
            apiResponse.textContent = `Erro ao conectar com a API: ${error.message}`;
            console.error('Erro ao conectar com a API:', error);
        }
    });
});
