import * as Popover from '@radix-ui/react-popover';
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useSuggest } from '../../api/hooks';
import type { SuggestField } from '../../api/types';

interface Props {
  field: SuggestField;
  label: string;
  context: { name?: string; niche?: string; description?: string; language?: string; tone?: string };
  onPick: (value: string) => void;
  title: string;
}

/** Botão "IA" que busca sugestões e mostra num popover; clicar numa delas aplica no campo. */
export function AiSuggest({ field, label, context, onPick, title }: Props) {
  const suggest = useSuggest();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);

  const run = () =>
    suggest.mutate(
      { field, ...context },
      {
        onSuccess: (suggestions) => {
          setItems(suggestions);
          setOpen(suggestions.length > 0);
        },
      },
    );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <button type="button" className="btn btn-ai btn-xs" onClick={run} disabled={suggest.isPending}>
          {suggest.isPending ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
          {label}
        </button>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content className="panel popover" align="end" sideOffset={8} onOpenAutoFocus={(event) => event.preventDefault()}>
          <div className="popover-head">
            <span>{title}</span>
            <button type="button" className="btn btn-ghost btn-xs" onClick={run} disabled={suggest.isPending}>
              {suggest.isPending ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Outras
            </button>
          </div>
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className="suggestion"
              onClick={() => {
                onPick(item);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
