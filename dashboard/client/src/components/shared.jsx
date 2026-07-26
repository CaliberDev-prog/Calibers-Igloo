import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyId({ id }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-dark-600 hover:text-dark-400 transition-colors" title="Copy ID">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function roleColorHex(color) {
  if (!color || color === 0) return null;
  return `#${color.toString(16).padStart(6, '0')}`;
}
