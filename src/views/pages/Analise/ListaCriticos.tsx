import type { ReactNode } from 'react';
import type { Criticos } from '../../../shared/analise';
import { formatarFaixa, formatarNumero, formatarPct, formatarPontos, formatarSaldo, plural, rotuloDia } from '../../lib/formatar';
import { COR_STATUS } from './cores';

interface ListaCriticosProps {
  criticos: Criticos;
}

export default function ListaCriticos({ criticos }: ListaCriticosProps) {
  const { limite } = criticos;
  const corte = `abaixo de ${limite}% da meta`;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <CartaoLista
        titulo="Dias críticos"
        subtitulo={`Dias com eficiência ${corte}`}
        total={criticos.totalDias}
        exibidos={criticos.dias.length}
        vazio={`Nenhum dia ${corte}.`}
      >
        {criticos.dias.map((d) => (
          <ItemCritico
            key={d.data}
            titulo={rotuloDia(d.data)}
            detalhe={`${formatarNumero(d.realizado)} de ${formatarNumero(d.meta)} peças (saldo ${formatarSaldo(-d.deficit)})`}
            eficiencia={d.eficiencia}
            desvio={d.desvio}
          />
        ))}
      </CartaoLista>

      <CartaoLista
        titulo="Horários críticos"
        subtitulo={`Faixas com eficiência ${corte} no período`}
        total={criticos.horarios.length}
        exibidos={criticos.horarios.length}
        vazio={`Nenhuma faixa de horário ${corte}.`}
      >
        {criticos.horarios.map((h) => (
          <ItemCritico
            key={h.bloco}
            titulo={formatarFaixa(h.bloco)}
            detalhe={`Abaixo da meta em ${h.diasAbaixoDaMeta} de ${plural(h.diasComRegistro, 'dia', 'dias')} · saldo ${formatarSaldo(-h.deficit)} peças`}
            eficiencia={h.eficiencia}
            desvio={h.desvio}
          />
        ))}
      </CartaoLista>

      <CartaoLista
        titulo="Piores ocorrências"
        subtitulo="Faixas de um dia específico com maior déficit"
        total={criticos.totalOcorrencias}
        exibidos={criticos.ocorrencias.length}
        vazio={`Nenhuma faixa de nenhum dia ${corte}.`}
      >
        {criticos.ocorrencias.map((o) => (
          <ItemCritico
            key={`${o.data}-${o.bloco}`}
            titulo={`${rotuloDia(o.data)} · ${formatarFaixa(o.bloco)}`}
            detalhe={`${formatarNumero(o.realizado)} de ${formatarNumero(o.meta)} peças (saldo ${formatarSaldo(-o.deficit)})`}
            eficiencia={o.eficiencia}
            desvio={o.desvio}
          />
        ))}
      </CartaoLista>
    </div>
  );
}

interface CartaoListaProps {
  titulo: string;
  subtitulo: string;
  total: number;
  exibidos: number;
  vazio: string;
  children: ReactNode;
}

function CartaoLista({ titulo, subtitulo, total, exibidos, vazio, children }: CartaoListaProps) {
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-zinc-200 border-t-4 border-t-red-500 bg-white p-4 shadow-sm">
      <header>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900">{titulo}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${total === 0 ? COR_STATUS.meta.selo : COR_STATUS.critico.selo}`}>
            {total}
          </span>
        </div>
        <p className="text-xs text-zinc-500">{subtitulo}</p>
      </header>

      {total === 0 ? (
        <p className="py-3 text-sm text-emerald-700">✓ {vazio}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100">{children}</ul>
      )}

      {total > exibidos && (
        <p className="text-[11px] text-zinc-400">Mostrando os {exibidos} piores de {total}.</p>
      )}
    </section>
  );
}

interface ItemCriticoProps {
  titulo: string;
  detalhe: string;
  eficiencia: number;
  desvio: number;
}

function ItemCritico({ titulo, detalhe, eficiencia, desvio }: ItemCriticoProps) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-800">{titulo}</div>
        <div className="text-xs text-zinc-500">{detalhe}</div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-bold tabular-nums text-red-600">{formatarPct(eficiencia)}</div>
        <div className="text-[11px] tabular-nums text-zinc-400">{formatarPontos(desvio)}</div>
      </div>
    </li>
  );
}
