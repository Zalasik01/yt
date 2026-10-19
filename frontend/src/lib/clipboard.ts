import { toast } from 'sonner';

export async function copyText(text: string, success = 'Copiado!'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) {
      toast.error('Não foi possível copiar');
      return;
    }
  }
  toast.success(success);
}
