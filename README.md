O sistema foi projetado para modernizar completamente a forma como o chão de fábrica pode acompanhar a produção. Entre as principais funcionalidades que desenvolvi, destaco:

### 🎯 Principais Funcionalidades

- 📦 **Gestão de Estoque e Rastreabilidade Total:** Controle ponta a ponta das caixas de manufatura por todas as etapas (como Montagem, Soldagem e Revisão). O sistema gera um histórico detalhado de auditoria de cada operação.

- ⏱️ **Controle de Produção Hora a Hora:** Monitoramento contínuo das metas e do volume processado, com cálculos de saldo atualizados em tempo real a cada bloco de horário.

- 📊 **Dashboards em Tempo Real:** Painéis visuais projetados com o intuito de rodar em TVs na fábrica, exibindo KPIs importantes de estoque e o funil de cada etapa de produção.

- 📱 **Acesso Multiplataforma Local:** Um servidor embutido permite que o sistema desktop também seja acessado por celulares e outras telas conectadas à mesma rede local.

---

### 🛠️ Tecnologias Utilizadas

- 🖥️ **Electron** — aplicação desktop multiplataforma, rodando 100% offline
- ⚛️ **React + TypeScript** 
- 🎨 **Tailwind CSS + Chart.js** — UI moderna com dashboards e gráficos em tempo real
- 🗄️ **SQLite + Drizzle ORM** — persistência local, robusta e com schema tipado
- 🌐 **Express** embutido no próprio app — expõe um servidor na rede local, permitindo que outros dispositivos acessem os painéis de produção direto do navegador, sem instalar nada
- ⚡ **Vite + Electron Forge** — build rápido e geração automática de instaladores, com atualização automática via GitHub Releases
