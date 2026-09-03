import { useState } from 'react';
import { useAddComment } from '../data/timeline.ts';

interface Props {
  processId: string;
}

/**
 * Compositor de comentário. Enter envia; Shift+Enter quebra linha.
 * Vazio não envia. Menções (@username) são detectadas server-side
 * pelo trigger comments_materialize_mentions.
 */
export function CommentComposer({ processId }: Props) {
  const add = useAddComment();
  const [body, setBody] = useState('');

  async function submit() {
    const value = body.trim();
    if (!value) return;
    await add.mutateAsync({ processId, body: value });
    setBody('');
  }

  return (
    <div className="card">
      <textarea
        className="textarea"
        placeholder="Escreva um comentário. Use @username para mencionar."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
      />
      <div className="row row--between" style={{ marginTop: 'var(--space-2)', fontSize: 12 }}>
        <span className="muted">Enter envia. Shift+Enter quebra linha.</span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!body.trim() || add.isPending}
          onClick={submit}
        >
          {add.isPending ? 'Enviando…' : 'Comentar'}
        </button>
      </div>
    </div>
  );
}
