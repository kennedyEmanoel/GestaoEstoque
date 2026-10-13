interface OpcaoSegmentada<V extends string> {
  valor: V;
  rotulo: string;
  desabilitada?: boolean;
}

interface SegmentadoProps<V extends string> {
  valor: V;
  opcoes: readonly OpcaoSegmentada<V>[];
  onChange: (valor: V) => void;
  rotuloAria: string;
}

export default function Segmentado<V extends string>({ valor, opcoes, onChange, rotuloAria }: SegmentadoProps<V>) {
  return (
    <div role="group" aria-label={rotuloAria} className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativa}
            disabled={opcao.desabilitada}
            onClick={() => onChange(opcao.valor)}
            className={`rounded-md px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              ativa
                ? 'bg-white font-semibold text-blue-700 shadow-sm'
                : 'font-medium text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
