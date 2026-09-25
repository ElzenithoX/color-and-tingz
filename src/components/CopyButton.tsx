import { useEffect, useState } from 'react';
import { Check, Copy, CopyCheck } from 'lucide-react';

interface Props {
  value: string;
  label: string;
  /** Visible text, turning the round icon button into a pill button. */
  text?: string;
}

export default function CopyButton({ value, label, text }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can refuse when the window isn't focused; the user can retry.
    }
  };

  if (text) {
    return (
      <button className={`pill-btn${copied ? ' is-done' : ''}`} onClick={copy} title={`Copy ${label}`}>
        {copied ? <Check size={15} strokeWidth={2.2} /> : <CopyCheck size={15} strokeWidth={1.9} />}
        {copied ? 'Copied' : text}
      </button>
    );
  }

  return (
    <button className={`icon-btn${copied ? ' is-done' : ''}`} onClick={copy} title={`Copy ${label}`} aria-label={`Copy ${label}`}>
      {copied ? <Check size={16} strokeWidth={2.2} /> : <Copy size={16} strokeWidth={1.8} />}
    </button>
  );
}
