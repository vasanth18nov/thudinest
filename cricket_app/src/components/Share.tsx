/** Share a public link: the native share sheet on phones, copy-to-clipboard elsewhere. */
import { Share2 } from 'lucide-react';
import { publicUrl } from '../firebase';
import { useToast } from '../hooks/useUi';
import { Button } from './ui';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareButton({ path, title, label = 'Share', size = 'sm' }: { path: string; title: string; label?: string; size?: 'sm' | 'md' }) {
  const toast = useToast();
  const share = async () => {
    const url = publicUrl(path);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    const copied = await copyText(url);
    toast.show(copied ? 'Link copied' : url, copied ? 'success' : 'info');
  };
  return (
    <Button variant="secondary" size={size} icon={<Share2 size={16} aria-hidden />} onClick={share}>
      {label}
    </Button>
  );
}
