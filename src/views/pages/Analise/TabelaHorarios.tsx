import type { HorarioAnalise } from '../../../shared/analise';
import BarraProgresso from '../../components/ui/BarraProgresso';
import { formatarFaixa, formatarNumero, formatarPct, formatarSaldo } from '../../lib/formatar';
import { COR_STATUS } from './cores';

interface TabelaHorariosProps {
  horarios: readonly HorarioAnalise[];
}

const cabecalho = 'px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-zinc-500';

export default function TabelaHorarios({ horarios }: TabelaHorariosProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header>
        <h3 className="text-sm font-bold text-zinc-900">Meta horária × realizado, por faixa</h3>
        <p className="text-xs text-zinc-500">
          Comparativo direto de cada faixa de horário em todo o período. As médias consideram só os dias com registro naquela faixa.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th scope="col" className={`${cabecalho} text-left`}>Faixa</th>
              <th scope="col" className={cabecalho}>Dias c/ registro</th>
              <th scope="col" className={cabecalho}>Meta/h média</th>
              <th scope="col" className={cabecalho}>Realizado/h médio</th>
              <th scope="col" className={cabecalho}>Meta total</th>
              <th scope="col" className={cabecalho}>Realizado total</th>
              <th scope="col" className={cabecalho}>Saldo</th>
              <th scope="col" className={`${cabecalho} min-w-40 text-left`}>Eficiência</th>
              <th scope="col" className={cabecalho}>Abaixo da meta</th>
              <th scope="col" className={cabecalho}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((h) => {
              const cores = COR_STATUS[h.status];
              const semDados = h.diasComRegistro === 0;
              return (
                <tr key={h.bloco} className={`border-t border-zinc-100 ${semDados ? 'text-zinc-300' : ''}`}>
                  <th scope="row" className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">{formatarFaixa(h.bloco)}</th>
                  <td className="px-3 py-2 text-right tabular-nums">{semDados ? '—' : h.diasComRegistro}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatarNumero(h.metaMedia, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatarNumero(h.realizadoMedio, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{semDados ? '—' : formatarNumero(h.meta)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{semDados ? '—' : formatarNumero(h.realizado)}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${semDados ? '' : h.saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {semDados ? '—' : formatarSaldo(h.saldo)}
                  </td>
                  <td className="px-3 py-2">
                    {semDados ? '—' : (
                      <div className="flex items-center gap-2">
                        <div className="w-24"><BarraProgresso valor={h.eficiencia} cor={cores.hex} rotulo={`Eficiência ${formatarFaixa(h.bloco)}`} /></div>
                        <span className={`text-xs font-bold tabular-nums ${cores.texto}`}>{formatarPct(h.eficiencia)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {semDados ? '—' : (
                      <>
                        {h.diasAbaixoDaMeta}/{h.diasComRegistro}
                        {h.diasZerados > 0 && <span className="ml-1 text-[11px] text-red-500">({h.diasZerados} zerado{h.diasZerados > 1 ? 's' : ''})</span>}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cores.selo}`}>{cores.rotulo}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
