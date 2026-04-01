/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
/*
import '../index.css';

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);*/


// 1. Pegamos os botões
const btnDashboard = document.getElementById('btn-dashboard') as HTMLButtonElement;
const btnEstoque = document.getElementById('btn-estoque') as HTMLButtonElement;
const btnConfig = document.getElementById('btn-config') as HTMLButtonElement;

// 2. Pegamos as "páginas"
const pageDashboard = document.getElementById('page-dashboard') as HTMLElement;
const pageEstoque = document.getElementById('page-estoque') as HTMLElement;
const pageConfig = document.getElementById('page-config') as HTMLElement;

// Nova Função: Agora ela recebe a página E o botão que foi clicado
function mudarTela(paginaParaMostrar: HTMLElement, botaoClicado: HTMLButtonElement) {
    
    // PASSO A: Esconde todas as páginas
    pageDashboard.classList.remove('active');
    pageEstoque.classList.remove('active');
    pageConfig.classList.remove('active');

    // PASSO B: Tira a cor de destaque de todos os botões
    btnDashboard.classList.remove('btn-ativo');
    btnEstoque.classList.remove('btn-ativo');
    btnConfig.classList.remove('btn-ativo');

    // PASSO C: Mostra a página certa e acende o botão certo!
    paginaParaMostrar.classList.add('active');
    botaoClicado.classList.add('btn-ativo');
}

// 3. Os Eventos de Clique (passando a página e o botão)
if (btnDashboard) {
    btnDashboard.addEventListener('click', () => mudarTela(pageDashboard, btnDashboard));
}

if (btnEstoque) {
    btnEstoque.addEventListener('click', () => mudarTela(pageEstoque, btnEstoque));
}

if (btnConfig) {
    btnConfig.addEventListener('click', () => mudarTela(pageConfig, btnConfig));
}

// Dica Extra: Força o Dashboard a ser a tela inicial já com o botão aceso
mudarTela(pageDashboard, btnDashboard);