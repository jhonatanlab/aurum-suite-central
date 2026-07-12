import { useEffect, useRef } from "react";

export default function InteractiveGradient() {
  const gradientRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gradient = gradientRef.current;
    const grid = gridRef.current;
    if (!gradient || !grid) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;

    if (reducedMotion || isMobile) {
      gradient.style.setProperty("--x", "50%");
      gradient.style.setProperty("--y", "50%");
      grid.style.setProperty("--x", "50%");
      grid.style.setProperty("--y", "50%");
      return;
    }

    let rafId = 0;
    let nextX = window.innerWidth / 2;
    let nextY = window.innerHeight / 2;

    const onMove = (e: MouseEvent) => {
      nextX = e.clientX;
      nextY = e.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const x = `${nextX}px`;
        const y = `${nextY}px`;
        gradient.style.setProperty("--x", x);
        gradient.style.setProperty("--y", y);
        grid.style.setProperty("--x", x);
        grid.style.setProperty("--y", y);
      });
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        ref={gradientRef}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), hsl(var(--gold) / 0.25), hsl(var(--gold) / 0.08) 30%, transparent 70%)",
        }}
      />
      <div
        ref={gridRef}
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--gold) / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold) / 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          WebkitMaskImage:
            "radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), black, transparent 70%)",
          maskImage:
            "radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), black, transparent 70%)",
        }}
      />
    </div>
  );
}
