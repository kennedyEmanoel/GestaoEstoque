# Documentação de Funcionalidades — Gestão de Manufatura

> Gerado automaticamente por análise do repositório em 2026-06-14.

---

## 1. Visão Geral do Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | Gestão de Manufatura / Gestão-de-Estoque |
| **Versão** | 1.2.0 |
| **Framework** | Electron + React |
| **Banco de Dados** | SQLite via Drizzle ORM |
| **Linguagem** | TypeScript |
| **Autor** | Kennedy Emanoel |

O aplicativo é um sistema desktop de gestão de estoque e controle de manufatura com suporte a produção hora a hora. Funciona tanto como aplicação desktop nativa (Electron) quanto com um servidor interno Express acessível via rede local (celular, tablet, TV).

---

## 2. Arquitetura Geral

### 2.1 Stack Tecnológico

**Frontend:**
- React 19.2.4 + TypeScript 4.5.4
- Tailwind CSS 4.2.2
- Chart.js 4.5.1 + react-chartjs-2 5.3.1
- Lucide React (ícones)

**Backend / Main Process:**
- Electron 41.1.0
- Express 5.2.1
- Better SQLite3 12.9.0 (driver nativo)
- Drizzle ORM 0.45.2

**Build / Deploy:**
- Electron Forge 7.11.1 (packaging Windows/macOS/Linux)
- Vite 8.0.3
- Squirrel (instalador Windows)
- update-electron-app (auto-update via GitHub Releases)

### 2.2 Diagrama de Camadas

```
┌────────────────────────────────────────────────────────────────┐
│                    RENDERER (React UI)                         │
│   Dashboard · Stock · History · Producao · Settings           │
│   Componentes: NewBox, BatchBox, Header, Sidebar               │
│   Comunicação via preload.ts (IPC Bridge)                      │
└──────────────────────────┬─────────────────────────────────────┘
                           │  IPC Channels (contextBridge)
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│                MAIN PROCESS (Electron + Express)               │
│   Controllers: boxController, dashboardController,             │
│                producaoController                              │
│   Services: boxServices, dashboardService,                     │
│             producaoService, producaoDashboardService          │
│   REST Server interno (Express) na porta 3000+                 │
└──────────────────────────┬─────────────────────────────────────┘
                           │  SQL Queries
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│            DATABASE LAYER (SQLite + Drizzle ORM)               │
│   Tabelas: box, history, box_composition                       │
│   Tabelas de Produção: producao_ficha_diaria,                  │
│     producao_operador_diario, producao_registro_horario        │
│   Arquivo: {userData}/bd_estoque.sqlite                        │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Estrutura de Arquivos

```
src/
├── main.ts                              # Entry point Electron (janela, IPC, firewall)
├── preload.ts                           # Bridge IPC: expõe window.api ao renderer
│
├── main/
│   ├── controllers/
│   │   ├── boxController.ts             # Handlers IPC para operações de caixa
│   │   ├── dashboardController.ts       # Handler IPC para dashboard de estoque
│   │   └── producaoController.ts        # Handlers IPC para produção hora a hora
│   │
│   ├── services/
│   │   ├── boxServices.ts               # Lógica: CRUD, split/merge, insumos
│   │   ├── dashboardService.ts          # Queries e KPIs de estoque
│   │   ├── producaoService.ts           # Gestão de fichas, operadores, registros
│   │   └── producaoDashboardService.ts  # Dashboard por etapas (JSON para web)
│   │
│   ├── models/
│   │   ├── db.ts                        # Inicialização SQLite + Drizzle + índices
│   │   └── schema/
│   │       ├── box.ts                   # Schema da tabela box
│   │       ├── history.ts               # Schema da tabela history (auditoria)
│   │       └── boxComposition.ts        # Schema da tabela box_composition
│   │
│   └── server/
│       └── internalServer.ts            # Express server (REST API + páginas web)
│
├── shared/
│   ├── types.ts                         # Interfaces TypeScript compartilhadas
│   └── workingTime.ts                   # Utilitários de cálculo de blocos de horário
│
└── views/
    ├── renderer.tsx                     # Entry point React
    ├── App.tsx                          # Root component (roteamento por estado)
    │
    ├── components/
    │   ├── Header.tsx                   # Navbar superior
    │   ├── Sidebar.tsx                  # Menu lateral (colapsável)
    │   ├── NewBox.tsx                   # Form de criação de caixa individual
    │   └── BatchBox.tsx                 # Form de criação em lote
    │
    └── pages/
        ├── Dashboard/index.tsx          # KPIs de estoque + funil de etapas
        ├── Stock/index.tsx              # Movimentação / operações de caixas
        ├── History/index.tsx            # Log de operações
        ├── Settings/index.tsx           # Configurações gerais
        └── Producao/
            ├── index.tsx                # Controle de produção (form operadores)
            └── Dashboard.tsx            # Painel fullscreen (TV/projetor)
```

---

## 4. Banco de Dados (SQLite)

### 4.1 Localização e Inicialização

- **Caminho**: `{app.userData}/bd_estoque.sqlite`
  - Windows: `C:\Users\{user}\AppData\Roaming\Gestão de Manufatura\`
- **Arquivo principal**: `src/main/models/db.ts`
- **Foreign keys**: Ativadas via `PRAGMA foreign_keys = ON`

### 4.2 Tabelas

#### `box` — Unidades/Caixas em produção ou estoque

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | Identificador único (ex.: `NB2001`) |
| `model` | TEXT | Produto (NB2, 4G SIMCOM, LORA, etc.) |
| `amount` | INTEGER | Quantidade de unidades (padrão 500) |
| `step` | TEXT | Etapa atual (Montagem, Soldagem…) |
| `volume` | TEXT | Volume/capacidade |
| `origin` | TEXT | `PRODUCTION` ou `TRAY` (bandeja) |
| `location` | TEXT | Local físico (`ARM_A`, `MONT_01`…) |
| `weight` | REAL | Peso em kg |
| `operator` | TEXT | Operador responsável |
| `description` | TEXT | Observações livres |
| `date` | INTEGER | Timestamp de criação |
| `parent_id` | TEXT | ID da caixa de origem (split/merge) |
| `is_insumo` | INTEGER | 1 se for insumo (prefixo `INS`) |

#### `history` — Log/auditoria de todas as operações

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Auto-increment |
| `box_id` | TEXT FK | Referência a `box.id` |
| `start_time` | INTEGER | Timestamp de início |
| `end_time` | INTEGER | Timestamp de fim |
| `time_spent` | INTEGER | Segundos gastos |
| `type_operation` | TEXT | `CRIACAO`, `SCAN_START`, `TRANSFER`, `EXPEDICAO`… |
| `step_status` | TEXT | `OPEN` ou `CLOSED` |
| `step` | TEXT | Etapa durante a operação |
| `location` | TEXT | Local durante a operação |
| `lot` | TEXT | Lote (quando aplicável) |
| `description` | TEXT | Descrição da operação |
| `operator` | TEXT | Operador |
| `modelo` | TEXT | Modelo do produto |

#### `box_composition` — Rastreabilidade de split/merge

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Auto-increment |
| `new_box_id` | TEXT | Caixa destino (criada/modificada) |
| `source_box_id` | TEXT | Caixa de origem |
| `amount_taken` | INTEGER | Quantidade transferida |
| `created_at` | INTEGER | Timestamp da operação |
| `operator` | TEXT | Operador responsável |

#### `producao_ficha_diaria` — Ficha de produção diária

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Auto-increment |
| `data` | TEXT | Data (YYYY-MM-DD) |
| `produto` | TEXT | Produto rastreado |
| `etapa` | TEXT | Etapa de produção |
| `meta_hora_padrao` | INTEGER | Meta padrão por hora (padrão 40) |
| `criado_em` | INTEGER | Timestamp |
| UNIQUE | — | `(data, etapa, produto)` |

#### `producao_operador_diario` — Operadores vinculados a uma ficha

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Auto-increment |
| `ficha_id` | INTEGER FK | Referência a `producao_ficha_diaria` |
| `operador_nome` | TEXT | Nome do operador |
| `ordem` | INTEGER | Ordenação na tabela |

#### `producao_registro_horario` — Meta e realizado por bloco horário

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Auto-increment |
| `operador_diario_id` | INTEGER FK | Referência a `producao_operador_diario` |
| `horario_bloco` | TEXT | Ex.: `"08:00 - 09:00"` |
| `meta` | INTEGER | Unidades planejadas no bloco |
| `realizado` | INTEGER | Unidades produzidas |

### 4.3 Índices Criados

```sql
idx_history_box_id    ON history(box_id)
idx_history_step      ON history(step)
idx_history_status    ON history(step_status)
idx_box_step          ON box(step)
idx_box_location      ON box(location)
idx_box_model         ON box(model)
idx_ficha_data_etapa  ON producao_ficha_diaria(data, etapa)
idx_operador_ficha    ON producao_operador_diario(ficha_id)
idx_registro_op       ON producao_registro_horario(operador_diario_id)
```

---

## 5. Regras de Negócio

### 5.1 Tipos de Caixa (por Prefixo)

| Prefixo | Produto | Origem | Etapa Inicial | Qtd. Padrão |
|---------|---------|--------|---------------|-------------|
| `BDJ` | Custom (Bandeja) | TRAY | Montagem | 500 |
| `NB2` | NB2 | PRODUCTION | Montagem | 500 |
| `4GS` | 4G SIMCOM | PRODUCTION | Montagem | 500 |
| `LOR` | LORA | PRODUCTION | Montagem | 500 |
| `NBL` | NB + LORA | PRODUCTION | Montagem | 500 |
| `INS` | Insumo (Custom) | PRODUCTION | Montagem | 450 |

### 5.2 Máquina de Estados — Transições de Etapa

**Fluxo Padrão** (NB2, LORA, NB+LORA):
```
Montagem → Soldagem → Revisão → Firmware → IMEI → Concluída
```

**Fluxo 4G SIMCOM** (permite inversão Firmware ↔ IMEI):
```
Montagem → Soldagem → Revisão → Firmware ↔ IMEI → Concluída
```

### 5.3 Localizações Físicas

| Zona | Localizações |
|------|-------------|
| Estoque geral | `ESTOQUE`, `ARM_A` … `ARM_O` (15 armários) |
| Montagem | `MONT_01`, `MONT_02` |
| Soldagem | `SOLD_01` … `SOLD_04` |
| Revisão | `REVI_01` … `REVI_04` |
| Gravação/Firmware | `GRAV_01` … `GRAV_06` |

### 5.4 Operações Principais

| Operação | Descrição técnica |
|----------|-------------------|
| **Criar Caixa** | Valida ID (`^(BDJ\|NB2\|4GS\|LOR\|NBL\|INS)\d{3,}$`), insere em `box` e abre registro em `history` |
| **Criar Lote** | Cria N caixas em uma transação atômica |
| **Iniciar Etapa** | Valida transição permitida, insere `history` com `step_status=OPEN`, atualiza `box.step` |
| **Finalizar Etapa** | Fecha `history` aberto (calcula `time_spent`), avança etapa |
| **Split/Merge** | Divide caixa em múltiplos destinos; rastreia linhagem em `box_composition` |
| **Consumir Insumo** | Retira de uma/múltiplas caixas `INS` e distribui para caixa destino |
| **Expedição** | Define `step=Concluida`, registra filial destino, encerra rastreamento |
| **Deletar** | Remove caixa e seu histórico (individual ou em lote por prefixo) |

### 5.5 Controle de Produção Hora a Hora

**Blocos de Horário (turnos):**

| Bloco | Duração |
|-------|---------|
| 07:12 – 08:00 | 48 min |
| 08:00 – 09:00 | 60 min |
| 09:15 – 10:00 | 45 min |
| 10:00 – 11:00 | 60 min |
| 11:00 – 12:00 | 60 min |
| 13:00 – 14:00 | 60 min |
| 14:00 – 15:00 | 60 min |
| 15:00 – 16:00 | 60 min |
| 16:00 – 17:12 | 72 min |

**Fluxo:**
1. Abre ou recupera `producao_ficha_diaria` (combinação `data + etapa + produto`)
2. Adiciona operadores via `addOperador`
3. Por operador × bloco horário: define `meta` e registra `realizado`
4. Saldo calculado em tempo real: `saldo = realizado - meta`

---

## 6. Comunicação Frontend ↔ Backend

### 6.1 IPC Bridge (`preload.ts` → `window.api`)

O Electron `contextBridge` expõe uma API tipada ao renderer. Cada método no renderer invoca um canal IPC correspondente no main process, que retorna `{ success: boolean, data?, error? }`.

**Operações de Caixa:**
```
window.api.createBox(data)
window.api.createBatchBoxes(data)
window.api.getNextBatchIds(prefix, count)
window.api.getBox(id)
window.api.startStep(data)
window.api.finishStep(boxId, operator, stockLocation?)
window.api.getBoxHistory(boxId)
window.api.getRecentHistory(limit?)
window.api.getStockSummary()
window.api.getDashboard(filters)
window.api.expedicao(data)
window.api.deleteBox(id)
window.api.deleteManyBoxes(prefix)
window.api.consumirBdj(bdjId, caixaDestinoId, operator)
window.api.createTrayFromSources(data)
window.api.getBoxLineage(boxId)
window.api.finishInsumoStep(data)
```

**Operações de Produção:**
```
window.api.getOrCreateFicha(data)
window.api.getFichaCompleta(input)
window.api.addOperador(data)
window.api.removeOperador(data)
window.api.upsertRegistro(data)
window.api.updateMetaHoraPadrao(fichaId, meta)
window.api.getDashboardProducao(filtros)
window.api.getDashboardPorEtapas(data, produto?, horarioBloco?)
```

**Gerenciamento de Janelas:**
```
window.api.openProductionWindow()
window.api.closeProductionWindow()
window.api.sendDashboardCommand(payload)
window.api.onDashboardCommand(cb)
window.api.offDashboardCommand()
window.api.getServerUrl()
```

### 6.2 REST API Interna (Express — porta 3000+)

Acessível na rede local (celular, tablet, TV) via `http://{ip-local}:3000`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/status` | Health check |
| `POST` | `/api/producao/ficha` | Criar ou obter ficha |
| `GET` | `/api/producao/ficha` | Buscar ficha (`?data&etapa&produto`) |
| `POST` | `/api/producao/operador` | Adicionar operador |
| `DELETE` | `/api/producao/operador/:id` | Remover operador |
| `POST` | `/api/producao/registro` | Upsert de registro horário |
| `PATCH` | `/api/producao/ficha/:id/meta` | Atualizar meta padrão |
| `POST` | `/api/dashboard/comando` | Enviar comando ao painel TV |
| `GET` | `/api/dashboard/comando` | Polling do último comando |
| `GET` | `/api/dashboard/producao` | Dados JSON do dashboard (`?data&produto&faixa`) |
| `GET` | `/` | Página web do controle de produção |
| `GET` | `/dashboard` | Painel web fullscreen (TV/projetor) |

### 6.3 Padrão de Resposta

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 7. Páginas e Componentes

### 7.1 Páginas Principais

| Página | Rota (estado) | Descrição |
|--------|---------------|-----------|
| Dashboard | `/dashboard` | KPIs de estoque: total de caixas, por produto, funil de etapas |
| Movimentação | `/movimentacoes` | Criar, mover, avançar etapa e deletar caixas |
| Histórico | `/historico` | Log completo de operações (tabela de auditoria) |
| Produção | `/producao` | Ficha hora a hora: operadores × blocos horários |
| Painel Produção | `/producao-dashboard` | Dashboard fullscreen para TV/projetor |
| Configurações | `/configuracoes` | Ajustes gerais do sistema |

### 7.2 Componentes Reutilizáveis

| Componente | Descrição |
|------------|-----------|
| `Header.tsx` | Navbar com título, status do servidor web e botões de ação |
| `Sidebar.tsx` | Menu lateral colapsável com navegação entre módulos |
| `NewBox.tsx` | Modal/form para criação de caixa individual |
| `BatchBox.tsx` | Modal/form para criação de múltiplas caixas em lote |

---

## 8. Fluxo de Dados — Exemplos

### Exemplo 1: Criar Caixa e Avançar Etapa

```
UI (Stock)
  → createBox({ id: 'NB2001', weight: 1.5, operator: 'João' })
  → IPC 'create-box'
  → boxController → boxServices.createBox()
  → INSERT box (step='Montagem', location='ESTOQUE')
  → INSERT history (type='CRIACAO', step_status='CLOSED')
  → Return { success: true, data: { id: 'NB2001', ... } }

UI (Stock)
  → startStep({ boxId: 'NB2001', step: 'Soldagem' })
  → boxServices.startStep()
  → Valida transição (Montagem → Soldagem ✓)
  → UPDATE box SET step='Soldagem'
  → INSERT history (type='SCAN_START', step_status='OPEN')
  → Return { success: true }
```

### Exemplo 2: Registrar Produção Hora a Hora

```
UI (Produção)
  → getOrCreateFicha({ data: '2026-06-14', etapa: 'Soldagem',
      produto: '4G SIMCOM', metaHoraPadrao: 40 })
  → INSERT producao_ficha_diaria (...) ON CONFLICT DO NOTHING
  → Return { id: 1, operadores: [] }

UI
  → addOperador({ fichaId: 1, operadorNome: 'Maria' })
  → INSERT producao_operador_diario (ficha_id=1, operador_nome='Maria')
  → Return { id: 5, ... }

UI
  → upsertRegistro({ operadorDiarioId: 5,
      horarioBloco: '08:00 - 09:00', meta: 40, realizado: 38 })
  → INSERT OR REPLACE producao_registro_horario (...)
  → Return { realizado: 38, meta: 40, saldo: -2 }
```

---

## 9. Infraestrutura e Deploy

| Aspecto | Detalhe |
|---------|---------|
| **Packaging** | Electron Forge — gera `.exe` via Squirrel (Windows), `.zip` (macOS), `.deb/.rpm` (Linux) |
| **Dev** | `npm start` → electron-forge start |
| **Build** | `npm make` → gera instalador nativo |
| **Auto-update** | `update-electron-app` via GitHub Releases (`kennedyEmanoel/GestaoEstoque`) |
| **Banco de dados** | Arquivo único `bd_estoque.sqlite` em `app.userData`; backup manual pelo usuário |
| **Firewall (Windows)** | Main process tenta criar regra `netsh` automaticamente para liberar porta do servidor web |

---

## 10. Arquivos Críticos — Referência Rápida

| Arquivo | Responsabilidade |
|---------|-----------------|
| [src/main.ts](src/main.ts) | Inicialização Electron, criação de janelas, setup IPC e firewall |
| [src/preload.ts](src/preload.ts) | Bridge seguro IPC, expõe `window.api` |
| [src/main/models/db.ts](src/main/models/db.ts) | Inicialização SQLite, migrations, criação de índices |
| [src/main/controllers/boxController.ts](src/main/controllers/boxController.ts) | Handlers IPC para todas as operações de caixa |
| [src/main/controllers/producaoController.ts](src/main/controllers/producaoController.ts) | Handlers IPC para produção hora a hora |
| [src/main/services/boxServices.ts](src/main/services/boxServices.ts) | Lógica de negócio: CRUD, split/merge, insumos, expedição |
| [src/main/services/producaoService.ts](src/main/services/producaoService.ts) | Lógica de fichas, operadores e registros horários |
| [src/main/server/internalServer.ts](src/main/server/internalServer.ts) | Express app com REST API e páginas web acessíveis em rede |
| [src/views/App.tsx](src/views/App.tsx) | Root React, roteamento por estado |
| [src/views/pages/Stock/index.tsx](src/views/pages/Stock/index.tsx) | Interface de movimentação de caixas |
| [src/views/pages/Producao/index.tsx](src/views/pages/Producao/index.tsx) | Interface do controle de produção (form operadores) |
| [src/views/pages/Producao/Dashboard.tsx](src/views/pages/Producao/Dashboard.tsx) | Painel fullscreen com gráficos para TV |
| [src/shared/types.ts](src/shared/types.ts) | Todas as interfaces TypeScript compartilhadas |

---

## 11. Resumo Executivo

**O que o sistema faz:**

1. **Gestão de Estoque** — Rastreia caixas de manufatura através de etapas definidas (Montagem → Soldagem → Revisão → Firmware → IMEI → Concluída), com auditoria completa de cada movimentação.

2. **Produção Hora a Hora** — Monitora meta × realizado de cada operador em blocos horários do turno, com saldo calculado em tempo real.

3. **Rastreabilidade Total** — Cada operação gera registro em `history`; operações de split/merge têm linhagem completa em `box_composition`.

4. **Dashboard em Tempo Real** — KPIs de estoque, funil de etapas e dashboard de produção com gráficos por etapa/operador, com auto-refresh de 60s.

5. **Acesso em Rede** — Servidor Express interno permite controlar e visualizar o sistema de qualquer dispositivo na rede local (celular, tablet, TV/projetor).

**Como as partes se comunicam:**

- **Renderer → Main**: via `window.api` (IPC channels, contextBridge seguro)
- **Main → Banco**: via Drizzle ORM sobre SQLite nativo (Better SQLite3)
- **Dispositivos externos → Sistema**: via REST API do servidor Express interno (porta 3000+)
- **Main → TV/Dashboard**: via polling de comandos no endpoint `/api/dashboard/comando`
