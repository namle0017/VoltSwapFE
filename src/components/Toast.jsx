// src/components/Toast.jsx
// Branding: White card + VoltSwap Blue (#2f66ff)
// Global: window.toast.info/success/error/warning(payload, { duration })

import { useEffect, useRef, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 3600;
const BRAND_BLUE = "#2f66ff";

function normalize(payload) {
    if (typeof payload === "string") return { title: "", message: payload };
    const obj = payload || {};
    return { title: obj.title || "", message: obj.message || obj.text || "" };
}

export default function ToastHost() {
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const close = (id) => {
        const h = timers.current.get(id);
        if (h) clearTimeout(h);
        timers.current.delete(id);
        setToasts((list) => list.filter((t) => t.id !== id));
    };

    useEffect(() => {
        const push = (payload, type = "info", opts = {}) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const { title, message } = normalize(payload);
            const duration = Number(opts.duration ?? DEFAULT_DURATION);

            setToasts((list) => {
                const next = [...list, { id, type, title, message, duration }];
                while (next.length > MAX_TOASTS) {
                    const removed = next.shift();
                    const h = timers.current.get(removed.id);
                    if (h) clearTimeout(h);
                    timers.current.delete(removed.id);
                }
                return next;
            });

            if (duration > 0) {
                const h = setTimeout(() => close(id), duration + 80);
                timers.current.set(id, h);
            }
            return id;
        };

        const api = {
            show: (p, type = "info", o) => push(p, type, o),
            info: (p, o) => push(p, "info", o),
            success: (p, o) => push(p, "success", o),
            error: (p, o) => push(p, "error", o),
            warning: (p, o) => push(p, "warning", o),
            remove: close,
            clear: () => {
                for (const h of timers.current.values()) clearTimeout(h);
                timers.current.clear();
                setToasts([]);
            },
        };

        window.toast = api;
        window.__toast = (m, type = "info") => api.show(m, type);

        const onKey = (e) => {
            if (e.key === "Escape" && toasts.length) close(toasts[toasts.length - 1].id);
        };
        window.addEventListener("keydown", onKey);

        return () => {
            for (const h of timers.current.values()) clearTimeout(h);
            timers.current.clear();
            delete window.toast;
            delete window.__toast;
            window.removeEventListener("keydown", onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            className="
        fixed left-1/2 -translate-x-1/2
        top-[calc(env(safe-area-inset-top,0px)+16px)]
        z-[9999] pointer-events-none flex flex-col items-center gap-2.5 px-3
      "
            aria-live="polite"
        >
            <AnimatePresence initial={false}>
                {toasts.map((t) => (
                    <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="pointer-events-auto"
                    >
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.1}
                            onDragEnd={(_, info) => {
                                if (Math.abs(info.offset.x) > 90) close(t.id);
                            }}
                            className={[
                                "relative overflow-hidden rounded-xl ring-1 shadow-xl",
                                "bg-white", // card trắng
                                "border border-slate-200", // viền nhẹ
                                "w-[min(92vw,560px)]",
                                // ring xanh nhạt
                                "ring-[color:var(--vs-blue)/0.35]"
                            ].join(" ")}
                            style={{ ["--vs-blue"]: BRAND_BLUE }}
                            role="status"
                        >
                            {/* viền trái xanh brand */}
                            <div className="absolute left-0 top-0 h-full w-1 bg-[color:var(--vs-blue)]" style={{ ["--vs-blue"]: BRAND_BLUE }} />

                            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                                <div className="flex items-start gap-3.5">
                                    {/* icon nền xanh, icon trắng */}
                                    <div className="mt-0.5 shrink-0">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--vs-blue)]" style={{ ["--vs-blue"]: BRAND_BLUE }}>
                                            <i className="bi bi-info-circle text-white text-[17px]" />
                                        </span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        {t.title ? (
                                            <>
                                                <div className="text-[15px] font-semibold leading-5 text-slate-900">
                                                    {t.title}
                                                </div>
                                                {t.message ? (
                                                    <div className="mt-0.5 text-[13px] leading-5 text-slate-600">
                                                        {t.message}
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : (
                                            <div className="text-[14px] leading-6 text-slate-800">
                                                {t.message}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => close(t.id)}
                                        className="opacity-70 hover:opacity-100 transition focus:outline-none focus:ring-2 focus:ring-[color:var(--vs-blue)]/30 rounded-md"
                                        aria-label="Close"
                                        title="Close"
                                        style={{ ["--vs-blue"]: BRAND_BLUE }}
                                    >
                                        <i className="bi bi-x-lg text-[15px] text-[color:var(--vs-blue)]" style={{ ["--vs-blue"]: BRAND_BLUE }} />
                                    </button>
                                </div>
                            </div>

                            {/* progress bar xanh nhạt */}
                            {t.duration > 0 && (
                                <div className="h-[2px] w-full bg-slate-200">
                                    <motion.div
                                        initial={{ scaleX: 1 }}
                                        animate={{ scaleX: 0 }}
                                        transition={{ duration: t.duration / 1000, ease: "linear" }}
                                        style={{ transformOrigin: "left" }}
                                        className="h-full bg-[color:var(--vs-blue)]"
                                    />
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
