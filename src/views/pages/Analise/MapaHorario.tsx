import { useState } from 'react';
import { statusDaEficiencia, type CelulaHoraria, type DiaAnalise, type HorarioAnalise } from '../../../shared/analise';
import { formatarFaixa, formatarNumero, formatarPct, formatarSaldo, rotuloDia } from '../../lib/formatar';
import { COR_STATUS } from './cores';

interface MapaHorarioProps {
  dias: readonly DiaAnalise[];
  horarios: readonly HorarioAnalise[];
  diaSelecionado: string | null;
  onSelecionarDia: (data: string) => void;
}

const cabecalho = 'sticky top-0 z-10 bg-zinc-50 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-500';

export default function MapaHorario({ dias, horarios, diaSelecionado, onSelecionarDia }: MapaHorarioProps) {
  const [mostrarSemRegistro, setMostrarSemRegistro] = useState(false);
  const semRegistro = dias.filter((d) => !d.registrado).length;
  const linhas = mostrarSemRegistro ? dias : dias.filter((d) => d.registrado);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">Dia a dia, hora a hora</h3>
          <p className="text-xs text-zinc-500">
            Realizado <span className="text-zinc-400">/ meta</span> de cada faixa. Clique em um dia para vê-lo no gráfico por hora.
          </p>
        </div>
        {semRegistro > 0 && (
          <label className="flex select-none items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              checked={mostrarSemRegistro}
              onChange={(e) => setMostrarSemRegistro(e.target.checked)}
            />
            Mostrar {semRegistro} {semRegistro === 1 ? 'dia útil' : 'dias úteis'} sem registro
          </label>
        )}
      </header>

      <Legenda />

      <div className="max-h-[30rem] overflow-auto rounded-lg border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={`${cabecalho} left-0 z-20 min-w-28 text-left`}>Dia</th>
              {horarios.map((h) => (
                <th key={h.bloco} scope="col" className={`${cabecalho} min-w-16 whitespace-nowrap`}>
                  {formatarFaixa(h.bloco).split(' – ').map((parte, i) => <div key={i}>{parte}</div>)}
                </th>
              ))}
              <th scope="col" className={`${cabecalho} min-w-24`}>Total do dia</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((dia) => {
              const selecionado = dia.data === diaSelecionado;
              return (
                <tr
                  key={dia.data}
                  tabIndex={dia.registrado ? 0 : undefined}
                  aria-current={selecionado ? 'true' : undefined}
                  onClick={() => dia.registrado && onSelecionarDia(dia.data)}
                  onKeyDown={(e) => {
                    if (dia.registrado && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelecionarDia(dia.data);
                    }
                  }}
                  className={`border-t border-zinc-100 ${dia.registrado ? 'cursor-pointer hover:bg-zinc-50' : ''} ${selecionado ? 'bg-blue-50/60' : ''}`}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 px-3 py-1.5 text-left text-xs font-semibold whitespace-nowrap ${
                      selecionado ? 'bg-blue-50 text-blue-700' : dia.registrado ? 'bg-white text-zinc-700' : 'bg-white text-zinc-300'
                    }`}
                  >
                    {rotuloDia(dia.data)}
                    {!dia.registrado && <span className="ml-1 text-[10px] font-normal">sem registro</span>}
                  </th>
                  {dia.horas.map((celula) => <CelulaMapa key={celula.bloco} celula={celula} dia={dia} />)}
                  <TotalDoDia dia={dia} />
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50">
              <th scope="row" className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left text-xs font-bold text-zinc-700">Período</th>
              {horarios.map((h) => (
                <td key={h.bloco} className="px-2 py-2 text-center">
                  {h.diasComRegistro === 0 ? (
                    <span className="text-zinc-300">—</span>
                  ) : (
                    <>
                      <div className={`text-xs font-bold tabular-nums ${COR_STATUS[h.status].texto}`}>{formatarPct(h.eficiencia, 0)}</div>
                      <div className="text-[10px] text-zinc-400">{formatarNumero(h.realizado)} / {formatarNumero(h.meta)}</div>
                    </>
                  )}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CelulaMapa({ celula, dia }: { celula: CelulaHoraria; dia: DiaAnalise }) {
  const faixa = formatarFaixa(celula.bloco);
  if (!celula.registrado) {
    return (
      <td className="px-2 py-1.5 text-center text-zinc-300" title={`${rotuloDia(dia.data)} · ${faixa}: sem registro`}>
        —
      </td>
    );
  }

  const status = statusDaEficiencia(celula.eficiencia);
  const cores = COR_STATUS[status];
  return (
    <td
      className={`px-2 py-1.5 text-center ${cores.fundo}`}
      title={`${rotuloDia(dia.data)} · ${faixa}: ${formatarNumero(celula.realizado)} de ${formatarNumero(celula.meta)} (${formatarPct(celula.eficiencia)}), saldo ${formatarSaldo(celula.saldo)}`}
    >
      <div className={`text-sm font-semibold leading-tight tabular-nums ${cores.texto}`}>{formatarNumero(celula.realizado)}</div>
      <div className="text-[10px] leading-tight text-zinc-400">/ {formatarNumero(celula.meta)}</div>
    </td>
  );
}

function TotalDoDia({ dia }: { dia: DiaAnalise }) {
  if (!dia.registrado) return <td className="px-2 py-1.5 text-center text-zinc-300">—</td>;
  const cores = COR_STATUS[dia.status];
  return (
    <td className="px-2 py-1.5 text-center">
      <div className={`text-sm font-bold tabular-nums ${cores.texto}`}>{formatarPct(dia.eficiencia)}</div>
      <div className="text-[10px] text-zinc-400">{formatarNumero(dia.realizado)} / {formatarNumero(dia.meta)}</div>
    </td>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
      {(['meta', 'proximo', 'critico'] as const).map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COR_STATUS[status].hex }} />
          {COR_STATUS[status].rotulo}
          {status === 'meta' && ' (≥ 100%)'}
          {status === 'proximo' && ' (80–99%)'}
          {status === 'critico' && ' (< 80%)'}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="font-semibold text-zinc-400">—</span> sem registro (não é o mesmo que produção zero)
      </span>
    </div>
  );
}
