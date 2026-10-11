import { useState } from 'react';
import type {
  Etapa, EtapaInput, Operador, OperadorInput, Produto, ProdutoInput,
} from '../../../shared/types';
import StatusBadge from '../../components/ui/StatusBadge';
import CadastroCrud from './CadastroCrud';
import VariacoesDaEtapa from './VariacoesDaEtapa';

const api = window.api;

const ABAS = [
  { id: 'operadores', rotulo: 'Operadores', descricao: 'Pessoas que podem ser escaladas nos cartões de produção.' },
  { id: 'produtos',   rotulo: 'Produtos',   descricao: 'Produtos fabricados, com descrição e versão.' },
  { id: 'etapas',     rotulo: 'Etapas',     descricao: 'Etapas do processo e suas variações (ex.: Soldagem → Cabos, Retrabalho).' },
] as const;

type AbaId = typeof ABAS[number]['id'];

const textoCinza = (texto: string | null) =>
  texto ? <span className="text-zinc-600">{texto}</span> : <span className="text-zinc-300">—</span>;

function Operadores() {
  return (
    <CadastroCrud<Operador, { nome: string }, OperadorInput>
      nome={{ singular: 'operador', plural: 'operadores' }}
      api={api.operadores}
      colunas={[
        { titulo: 'Nome', render: (o) => <span className="font-medium">{o.nome}</span> },
        { titulo: 'Status', render: (o) => <StatusBadge ativo={o.ativo} /> },
      ]}
      campos={[{ chave: 'nome', rotulo: 'Nome', obrigatorio: true, maxLength: 60, dica: 'Salvo em maiúsculas, como aparece nos cartões.' }]}
      formDoItem={(o) => ({ nome: o?.nome ?? '' })}
      paraEnvio={(f) => ({ nome: f.nome })}
      rotuloItem={(o) => o.nome}
      textoBusca={(o) => o.nome}
    />
  );
}

function Produtos() {
  return (
    <CadastroCrud<Produto, { nome: string; versao: string; descricao: string }, ProdutoInput>
      nome={{ singular: 'produto', plural: 'produtos' }}
      api={api.produtos}
      colunas={[
        { titulo: 'Nome', render: (p) => <span className="font-medium">{p.nome}</span> },
        { titulo: 'Versão', render: (p) => textoCinza(p.versao || null) },
        { titulo: 'Descrição', className: 'max-w-sm truncate', render: (p) => textoCinza(p.descricao) },
        { titulo: 'Status', render: (p) => <StatusBadge ativo={p.ativo} /> },
      ]}
      campos={[
        { chave: 'nome', rotulo: 'Nome', obrigatorio: true, maxLength: 80 },
        { chave: 'versao', rotulo: 'Versão', maxLength: 20, dica: 'Opcional. Ex.: 1.0, v2.' },
        { chave: 'descricao', rotulo: 'Descrição', tipo: 'area', maxLength: 300 },
      ]}
      formDoItem={(p) => ({ nome: p?.nome ?? '', versao: p?.versao ?? '', descricao: p?.descricao ?? '' })}
      paraEnvio={(f) => ({ nome: f.nome, versao: f.versao, descricao: f.descricao })}
      rotuloItem={(p) => (p.versao ? `${p.nome} ${p.versao}` : p.nome)}
      textoBusca={(p) => `${p.nome} ${p.versao} ${p.descricao ?? ''}`}
    />
  );
}

function Etapas() {
  return (
    <CadastroCrud<Etapa, { nome: string; descricao: string }, EtapaInput>
      nome={{ singular: 'etapa', plural: 'etapas', feminino: true }}
      api={api.etapas}
      colunas={[
        { titulo: 'Nome', render: (e) => <span className="font-medium">{e.nome}</span> },
        { titulo: 'Descrição', className: 'max-w-sm truncate', render: (e) => textoCinza(e.descricao) },
        {
          titulo: 'Variações',
          render: (e) => e.variacoes.length === 0
            ? <span className="text-zinc-300">—</span>
            : <span className="text-zinc-600">{e.variacoes.map((v) => v.nome).join(', ')}</span>,
        },
        { titulo: 'Status', render: (e) => <StatusBadge ativo={e.ativo} /> },
      ]}
      campos={[
        { chave: 'nome', rotulo: 'Nome', obrigatorio: true, maxLength: 40 },
        { chave: 'descricao', rotulo: 'Descrição', tipo: 'area', maxLength: 300 },
      ]}
      formDoItem={(e) => ({ nome: e?.nome ?? '', descricao: e?.descricao ?? '' })}
      paraEnvio={(f) => ({ nome: f.nome, descricao: f.descricao })}
      rotuloItem={(e) => e.nome}
      textoBusca={(e) => `${e.nome} ${e.descricao ?? ''} ${e.variacoes.map((v) => v.nome).join(' ')}`}
      expandido={(etapa, recarregar) => <VariacoesDaEtapa etapa={etapa} aoAlterar={recarregar} />}
    />
  );
}

export default function Cadastros() {
  const [aba, setAba] = useState<AbaId>('operadores');
  const atual = ABAS.find((a) => a.id === aba)!;

  return (
    <div className="h-full overflow-y-auto bg-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">

        <p className="text-sm text-zinc-500">{atual.descricao}</p>

        <div className="flex gap-1 border-b border-zinc-200 -mt-2" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                aba === a.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {aba === 'operadores' && <Operadores />}
        {aba === 'produtos' && <Produtos />}
        {aba === 'etapas' && <Etapas />}
      </div>
    </div>
  );
}
