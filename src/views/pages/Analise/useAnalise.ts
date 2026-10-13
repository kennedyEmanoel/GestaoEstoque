import { useEffect, useState } from 'react';
import type { AnaliseDesempenho, FiltroAnalise } from '../../../shared/analise';
import { chamar, mensagemDeErro } from '../../lib/api';

interface EstadoAnalise {
  dados: AnaliseDesempenho | null;
  carregando: boolean;
  erro: string | null;
}

// Mantém o resultado anterior na tela enquanto a nova consulta roda
export function useAnalise(filtro: FiltroAnalise | null): EstadoAnalise {
  const [estado, setEstado] = useState<EstadoAnalise>({ dados: null, carregando: false, erro: null });
  const chave = filtro ? JSON.stringify(filtro) : null;

  useEffect(() => {
    if (!filtro) {
      setEstado({ dados: null, carregando: false, erro: null });
      return;
    }

    let atual = true;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    chamar(window.api.analise.desempenho(filtro))
      .then((dados) => { if (atual) setEstado({ dados, carregando: false, erro: null }); })
      .catch((e) => { if (atual) setEstado({ dados: null, carregando: false, erro: mensagemDeErro(e) }); });

    return () => { atual = false; };
  }, [chave]);

  return estado;
}
