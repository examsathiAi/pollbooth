"use client";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HintTipProps {
  text: string;
  children: ReactNode;
  side?: "top" | "bottom";
  open?: boolean;
  tapShow?: boolean;
  className?: string;
}
interface Pos { left: number; top: number; arrow: number; place: "top" | "bottom"; }

export default function HintTip({ text, children, side = "top", open = false, tapShow = false, className = "inline-flex" }: HintTipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hover, setHover] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const visible = hover || tapped || open;

  const measure = useCallback(() => {
    const a = anchorRef.current;
    const t = tipRef.current;
    if (!a || !t) return;
    const r = a.getBoundingClientRect();
    const w = t.offsetWidth;
    const h = t.offsetHeight;
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(cx, w / 2 + 8), window.innerWidth - w / 2 - 8);
    let place: "top" | "bottom" = side;
    if (side === "top" && r.top - h - 12 < 8) place = "bottom";
    if (side === "bottom" && r.bottom + h + 12 > window.innerHeight - 8) place = "top";
    const arrow = Math.min(Math.max(cx - (left - w / 2), 14), w - 14);
    setPos({ left, top: place === "top" ? r.top - 10 : r.bottom + 10, arrow, place });
  }, [side]);

  useEffect(() => {
    if (!visible) { setPos(null); return; }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [visible, measure, text]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const onTap = () => {
    if (!tapShow) return;
    setTapped(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTapped(false), 3000);
  };

  const place = pos ? pos.place : side;
  const tipCls = "pointer-events-none fixed z-[110] w-max max-w-[240px] rounded-lg border border-paper-border "
    + "bg-paper-bg px-3 py-2 text-xs font-medium leading-snug text-ink "
    + "shadow-[0_8px_30px_rgba(0,0,0,0.14)] animate-in fade-in duration-150";
  const arrowCls = "absolute h-2 w-2 -translate-x-1/2 rotate-45 border-paper-border bg-paper-bg "
    + (place === "top" ? "border-b border-r" : "border-t border-l");

  return (
    <span
      ref={anchorRef}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={onTap}
    >
      {children}
      {visible && typeof document !== "undefined" && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          style={{
            left: pos ? pos.left : 0,
            top: pos ? pos.top : 0,
            transform: "translate(-50%, " + (place === "top" ? "-100%" : "0") + ")",
            visibility: pos ? "visible" : "hidden",
          }}
          className={tipCls}
        >
          {text}
          <span style={{ left: pos ? pos.arrow : 0, [place === "top" ? "bottom" : "top"]: -5 }} className={arrowCls} />
        </div>,
        document.body
      )}
    </span>
  );
}
