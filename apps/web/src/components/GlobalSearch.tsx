import type { SearchResult } from '@rota/db-types';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../data/search.ts';
import { formatRelative } from '../lib/format.ts';
import { MIN_QUERY_LENGTH, isSearchable, sectionLabel } from '../lib/search.ts';
import { StatusPill } from './Pills.tsx';

/**
 * Busca global na topbar. Procura em NUP, especificação e comentários.
 *
 * Digitar dispara depois de uma pausa: sem isso cada tecla viraria uma
 * consulta trigram. 250 ms é o intervalo em que a pessoa ainda percebe
 * como instantâneo mas já parou de digitar.
 *
 * Tanto processo quanto comentário levam ao mesmo lugar — a página do
 * processo. Um comentário não tem tela própria; achá-lo é uma forma de
 * achar o processo onde ele está.
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  // Clique fora fecha. Sem isto o painel ficaria por cima do conteúdo
  // depois de a pessoa já ter desistido da busca.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const { data: results = [], isLoading, isError } = useGlobalSearch(debounced);
  const processes = results.filter((r) => r.kind === 'process');
  const comments = results.filter((r) => r.kind === 'comment');

  function go(r: SearchResult) {
    setOpen(false);
    setTerm('');
    navigate(`/p/${r.process_id}`);
  }

  return (
    <div className="search" ref={boxRef}>
      <input
        className="input search-input"
        type="search"
        placeholder="Buscar NUP, assunto ou comentário…"
        aria-label="Busca global"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      {open && term.trim().length > 0 && (
        <div className="search-panel">
          {!isSearchable(term) ? (
            <div className="search-hint">Digite ao menos {MIN_QUERY_LENGTH} caracteres.</div>
          ) : isLoading ? (
            <div className="search-hint">Buscando…</div>
          ) : isError ? (
            <div className="search-hint">Não deu para buscar agora. Tente de novo.</div>
          ) : results.length === 0 ? (
            <div className="search-hint">Nada encontrado para “{term.trim()}”.</div>
          ) : (
            <>
              {processes.length > 0 && (
                <Section label={sectionLabel('process', processes.length)}>
                  {processes.map((r) => (
                    <button
                      type="button"
                      className="search-hit"
                      key={r.process_id}
                      onClick={() => go(r)}
                    >
                      <span className="search-hit-nup mono">{r.nup}</span>
                      <span className="search-hit-main">
                        {r.specification ?? 'Sem especificação'}
                      </span>
                      <StatusPill status={r.status} />
                    </button>
                  ))}
                </Section>
              )}
              {comments.length > 0 && (
                <Section label={sectionLabel('comment', comments.length)}>
                  {comments.map((r) => (
                    <button
                      type="button"
                      className="search-hit search-hit--stacked"
                      key={r.comment_id}
                      onClick={() => go(r)}
                    >
                      <span className="search-hit-meta">
                        <span className="search-hit-nup mono">{r.nup}</span>
                        <span className="muted text-sm">
                          {r.author_name ?? 'Alguém'} · {formatRelative(r.occurred_at)}
                        </span>
                      </span>
                      {/* O trecho é o motivo de este resultado existir:
                          ganha a linha inteira em vez de disputar espaço
                          com o NUP e a data. */}
                      <span className="search-hit-snippet">{r.snippet}</span>
                    </button>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="search-section">
      <div className="search-section-title">{label}</div>
      {children}
    </div>
  );
}
