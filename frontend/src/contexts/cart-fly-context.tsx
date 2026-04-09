"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export type FlyToCartOptions = {
  imageSrc?: string | null;
  sourceEl?: HTMLElement | null;
};

type FlyState = {
  id: number;
  sx: number;
  sy: number;
  midX: number;
  midY: number;
  ex: number;
  ey: number;
  size: number;
  src: string | null;
  srcCx: number;
  srcCy: number;
  cartCx: number;
  cartCy: number;
};

const CartFlyContext = createContext<{
  registerCartAnchor: (el: HTMLElement | null) => void;
  flyToCart: (opts: FlyToCartOptions) => void;
} | null>(null);

export function useCartFly() {
  const ctx = useContext(CartFlyContext);
  if (!ctx) {
    throw new Error("useCartFly must be used within CartFlyProvider");
  }
  return ctx;
}

function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CartFlyProvider({ children }: { children: React.ReactNode }) {
  const cartAnchorRef = useRef<HTMLElement | null>(null);
  const idRef = useRef(0);
  const [fly, setFly] = useState<FlyState | null>(null);

  const registerCartAnchor = useCallback((el: HTMLElement | null) => {
    cartAnchorRef.current = el;
  }, []);

  const flyToCart = useCallback((opts: FlyToCartOptions) => {
    if (!motionAllowed()) return;

    const anchor = cartAnchorRef.current;
    if (!anchor || typeof document === "undefined") return;

    let cartRect: DOMRect;
    try {
      cartRect = anchor.getBoundingClientRect();
    } catch {
      return;
    }

    const cartCx = cartRect.left + cartRect.width / 2;
    const cartCy = cartRect.top + cartRect.height / 2;

    let srcRect: DOMRect | null = null;
    if (opts.sourceEl) {
      try {
        srcRect = opts.sourceEl.getBoundingClientRect();
      } catch {
        srcRect = null;
      }
    }

    const srcCx =
      srcRect && srcRect.width > 0 && srcRect.height > 0
        ? srcRect.left + srcRect.width / 2
        : window.innerWidth / 2;
    const srcCy =
      srcRect && srcRect.width > 0 && srcRect.height > 0
        ? srcRect.top + srcRect.height / 2
        : window.innerHeight / 2;

    const size =
      srcRect && srcRect.width > 0 && srcRect.height > 0
        ? Math.min(
            76,
            Math.max(
              44,
              Math.min(srcRect.width, srcRect.height) * 0.38,
            ),
          )
        : 56;

    const peakCx = (srcCx + cartCx) / 2;
    const peakCy =
      Math.min(srcCy, cartCy) - Math.abs(cartCx - srcCx) * 0.34 - 56;

    idRef.current += 1;
    setFly({
      id: idRef.current,
      sx: srcCx - size / 2,
      sy: srcCy - size / 2,
      midX: peakCx - size / 2,
      midY: peakCy - size / 2,
      ex: cartCx - size / 2,
      ey: cartCy - size / 2,
      size,
      src: opts.imageSrc ?? null,
      srcCx,
      srcCy,
      cartCx,
      cartCy,
    });
  }, []);

  const portal =
    fly && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-0 z-[200]"
            aria-hidden
          >
            {[0, 1, 2, 3].map((i) => {
              const streakW = 64;
              const peakY = fly.midY + fly.size / 2;
              return (
                <motion.div
                  key={`streak-${fly.id}-${i}`}
                  className="absolute h-[2px] w-16 rounded-full bg-gradient-to-r from-white via-orange-400/70 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.55)]"
                  initial={{
                    left: fly.srcCx - streakW / 2,
                    top: fly.srcCy + i * 6,
                    opacity: 0,
                    scaleX: 0.35,
                    rotate: -10,
                  }}
                  animate={{
                    opacity: [0, 0.65, 0],
                    left: [
                      fly.srcCx - streakW / 2 + i * 5,
                      (fly.srcCx + fly.cartCx) / 2 - streakW / 2 + i * 4,
                      fly.cartCx - streakW / 2,
                    ],
                    top: [
                      fly.srcCy + i * 6,
                      peakY + i * 8,
                      fly.cartCy - 1,
                    ],
                    scaleX: [0.35, 1.25, 0.25],
                    rotate: [-10, 4, -6],
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                    delay: i * 0.04,
                  }}
                />
              );
            })}
            <motion.div
              key={fly.id}
              className="fixed overflow-hidden rounded-xl border-2 border-white bg-[var(--card)] shadow-[0_14px_44px_-10px_rgba(0,0,0,0.4),0_0_28px_-6px_var(--accent-glow)]"
              style={{ width: fly.size, height: fly.size }}
              initial={{
                left: fly.sx,
                top: fly.sy,
                scale: 1,
                rotate: -8,
                opacity: 1,
              }}
              animate={{
                left: [fly.sx, fly.midX, fly.ex],
                top: [fly.sy, fly.midY, fly.ey],
                scale: [1, 1.08, 0.22],
                rotate: [-8, 16, -2],
                opacity: [1, 1, 0.9],
              }}
              transition={{
                duration: 0.76,
                times: [0, 0.45, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => setFly(null)}
            >
              {fly.src ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={fly.src}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/75 text-2xl leading-none">
                  🛍️
                </div>
              )}
            </motion.div>
          </div>,
          document.body,
        )
      : null;

  return (
    <CartFlyContext.Provider value={{ registerCartAnchor, flyToCart }}>
      {children}
      {portal}
    </CartFlyContext.Provider>
  );
}
