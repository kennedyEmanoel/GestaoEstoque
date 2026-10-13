interface BarraProgressoProps {
  valor: number | null;
  cor: string;
  rotulo: string;
  maximo?: number;
  marcador?: number;
}

export default function BarraProgresso({ valor, cor, rotulo, maximo = 120, marcador = 100 }: BarraProgressoProps) {
  const largura = valor === null ? 0 : Math.min(Math.max(valor, 0), maximo) / maximo * 100;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={valor === null ? undefined : Math.round(valor)}
      className="relative h-2 w-full rounded-full bg-zinc-100"
    >
      <div className="h-full rounded-full transition-[width]" style={{ width: `${largura}%`, backgroundColor: cor }} />
      <div
        className="absolute -top-0.5 h-3 w-0.5 rounded bg-zinc-700"
        style={{ left: `${(marcador / maximo) * 100}%` }}
        title={`Meta (${marcador}%)`}
      />
    </div>
  );
}
