"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, MessageCircle, Twitter, Linkedin } from "lucide-react";

interface UniversalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export function UniversalShareModal({ isOpen, onClose, url, title }: UniversalShareModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const shareLinks = [
    { name: "WhatsApp", icon: <MessageCircle className="w-5 h-5" />, href: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}`, color: "bg-green-500 hover:bg-green-600", text: "text-white" },
    { name: "Twitter", icon: <Twitter className="w-5 h-5" />, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, color: "bg-black hover:bg-gray-800", text: "text-white" },
    { name: "LinkedIn", icon: <Linkedin className="w-5 h-5" />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, color: "bg-blue-700 hover:bg-blue-800", text: "text-white" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md bg-paper-card border border-paper-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-border/50">
          <h3 className="text-lg font-semibold text-ink">Share this poll</h3>
          <button onClick={onClose} className="p-1.5 rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {shareLinks.map((link) => (
              <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all active:scale-95 ${link.color} ${link.text}`}>
                {link.icon}
                <span className="text-xs font-semibold">{link.name}</span>
              </a>
            ))}
          </div>

          <div className="relative mt-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-paper-border/50"></div></div>
            <div className="relative flex justify-center"><span className="px-2 text-xs text-ink-muted bg-paper-card uppercase tracking-wider font-semibold">Or copy link</span></div>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-paper-bg border border-paper-border/60 rounded-xl">
            <div className="flex-1 px-3 py-1.5 text-sm text-ink-muted truncate select-all">{url}</div>
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-4 py-2 bg-ink text-paper-bg rounded-lg text-sm font-semibold hover:bg-ink/90 active:scale-95 transition-all">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}