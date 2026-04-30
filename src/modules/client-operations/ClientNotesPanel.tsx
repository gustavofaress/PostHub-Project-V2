import * as React from 'react';
import { StickyNote } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { EmptyState } from '../../shared/components/EmptyState';
import type { ClientProfileNote } from '../../services/client-operations.service';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const ClientNotesPanel = ({
  notes,
  draft,
  onDraftChange,
  onSubmit,
  isSaving,
  errorMessage,
}: {
  notes: ClientProfileNote[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  isSaving: boolean;
  errorMessage?: string | null;
}) => {
  return (
    <Card>
      <div className="mb-5">
        <CardTitle>Notas Internas</CardTitle>
        <CardDescription className="mt-1">
          Observações operacionais que ajudam o time a lembrar o contexto deste cliente.
        </CardDescription>
      </div>

      <div className="space-y-3">
        <textarea
          aria-label="Adicionar nota interna do cliente"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ex.: Cliente aprova tudo com a Mariana. Evitar linguagem muito informal."
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={onSubmit} isLoading={isSaving}>
            Salvar nota
          </Button>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        {notes.length === 0 ? (
          <EmptyState
            title="Nenhuma nota registrada"
            description="As primeiras observações internas deste cliente vão aparecer aqui."
            icon={StickyNote}
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3"
              >
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  {formatDateTime(note.createdAt)}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
