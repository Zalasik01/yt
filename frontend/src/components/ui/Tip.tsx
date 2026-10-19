import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/** Tooltip leve; `disabled` desliga sem remover o elemento filho. */
export function Tip({ label, children, side = 'top', disabled = false }: { label: string; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; disabled?: boolean }) {
  if (disabled) return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side={side} sideOffset={8}>
          {label}
          <Tooltip.Arrow className="tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
