import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}

/** Substitui window.confirm: diálogo acessível, com foco preso e animação. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  busy = false,
  onConfirm,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="panel dialog-content dialog-small">
          <AlertDialog.Title className="dialog-title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="dialog-desc">{description}</AlertDialog.Description>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
            <AlertDialog.Cancel asChild>
              <button className="btn btn-ghost" disabled={busy}>{cancelLabel}</button>
            </AlertDialog.Cancel>
            <button
              className={`btn ${destructive ? 'btn-danger-solid' : 'btn-primary'}`}
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
