# Análise de desempenho

Tela **Análise** (menu lateral). Mostra, para **um operador em uma etapa de um produto**, como o realizado se comportou
contra a meta ao longo de um período, dia a dia e hora a hora.

Tudo vem da tabela `producao_registro_horario` (meta e realizado por operador, dia e faixa de horário). Nada é gravado:
a tela só lê.

## Filtros (todos no topo)

| Filtro | Observação |
|---|---|
| Operador | Só aparecem operadores que têm registro (inclusive inativos, marcados). |
| Produto | Só os produtos em que o operador atuou. |
| Etapa em que atuou | Só as etapas em que ele atuou nesse produto. |
| Variação | Aparece só quando há mais de uma opção. "Todas" soma tudo; "Sem variação" pega os cartões antigos. |
| Período | **Mínimo de 7 dias** (as duas pontas contam) e máximo de 366. |

A regra do período fica em um único lugar (`validarPeriodo`, em `src/shared/analise.ts`) e vale na tela e no serviço:
os campos de data já limitam o que dá para escolher e a análise não roda enquanto o período for inválido. O botão
**Corrigir período** sugere o período válido mais próximo.

## Como cada número é calculado

Chamamos de **eficiência** = realizado ÷ meta × 100.

- **Eficiência global**: soma do realizado ÷ soma das metas de todas as faixas **com registro** no período.
  Ao lado vem a *média simples dos dias* (média das eficiências diárias), que dá o mesmo peso a cada dia.
- **Produzido × metas acumuladas**: as duas somas e o saldo (realizado − meta).
- **Consistência**: coeficiente de variação (desvio padrão ÷ média) das eficiências diárias.
  Até 10% → *alta*; até 20% → *moderada*; acima → *baixa*. Precisa de pelo menos 3 dias com registro.
- **Dia na meta**: eficiência do dia ≥ 100%.
- **Situação** (cor): ≥ 100% *na meta*; de 80% a 99,9% *próximo*; abaixo de 80% *crítico*. São os mesmos cortes das telas de produção.
- **Crítico**: dia, faixa de horário (agregada no período) ou ocorrência (um dia × uma faixa) com eficiência abaixo de 80%.
  As listas mostram os de maior déficit de peças (até 10).
- **Tendência**: reta ajustada (mínimos quadrados) sobre a eficiência diária. Precisa de 5 dias com registro.
  *Subindo/caindo* só quando a variação estimada do primeiro ao último dia é de pelo menos 3 pontos percentuais e a reta
  explica pelo menos 10% da variação (R²); caso contrário é *estável*. A média móvel usa os 3 últimos dias com registro.
- **Semana a semana**: semanas de segunda a domingo, cortadas nas pontas do período.
- **Dia da semana**: eficiência acumulada de cada segunda, terça... no período.

Os limites ficam como constantes no topo de `src/shared/analise.ts`; mudar um deles muda a tela inteira e os testes.

## Dados ausentes

- **Hora sem registro não é produção zero.** Ela fica de fora de todas as contas, aparece como `—` na tabela e como
  barra cinza baixa nos gráficos. Hora **registrada com zero** conta como zero (e aparece vermelha).
- **Dia útil sem registro** (segunda a sexta) aparece cinza no gráfico por dia e fica fora das médias. Não há calendário
  de feriados, então ele só é contado como "dia útil sem registro".
- **Sábado e domingo** só entram quando houve produção.
- Faixas de horário fora do padrão que existam nos dados (por exemplo `07:12 - 08:12` em registros antigos) viram colunas
  próprias; as faixas padrão sem nenhum registro continuam visíveis, vazias.
- Registro com meta 0 (legado) entra no realizado, mas não gera eficiência.

## Onde está cada parte

```
src/shared/analise.ts           tipos, limites e validarPeriodo (usados pela tela e pelo main)
src/shared/datas.ts             datas em texto "AAAA-MM-DD" (sem depender do fuso do computador)
src/main/repositories/analiseRepository.ts   as duas consultas (opções e registros)
src/main/services/analiseCalculos.ts         contas puras, sem banco (é onde os testes se concentram)
src/main/services/analiseService.ts          valida o filtro, busca e monta o resultado
src/views/pages/Analise/                     a tela (filtros, painel geral, gráficos, críticos, mapa e tabela)
src/views/components/ui/                     peças reutilizáveis (barra de filtros, cartão de indicador, segmentado...)
```

Testes: `npm test` (cálculos em `analiseCalculos.test.ts`, regras do serviço em `analise.test.ts`,
opções em cascata em `Analise/opcoes.test.ts`).
