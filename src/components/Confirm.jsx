// src/components/Confirm.jsx
// Global confirm modal: await window.confirmModal({ title, message, confirmText, cancelText, variant, requireNote })
// variant: "danger" | "primary" (default: primary)
// return: { ok: boolean, note?: string }

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// brand blue
const BRAND_BLUE = "#2f66ff";

const styles = {
    overlay:
        "fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px] flex items-start justify-center",
    card:
        "w-[min(92vw,560px)] rounded-2xl bg-white shadow-2xl border border-slate-200 mt-24 overflow-hidden",
    header: "px-5 pt-5",
    title: "text-[17px] font-semibold text-slate-900",
    message: "mt-1.5 text-[14px] leading-6 text-slate-700",
    body: "px-5 pb-4",
    footer: "px-5 pb-5 pt-3 flex gap-2 justify-end",
    input:
        "mt-3 w-full rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[color:var(--vs-blue)]/30 focus:border-[color:var(--vs-blue)] px-3 py-2 text-[14px]",
    btn:
        "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-[14px] font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-60",
    btnGhost:
        "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-300",
    btnPrimary:
        "text-white hover:brightness-110 focus:ring-[color:var(--vs-blue)]/40",
    btnDanger:
        "text-white hover:brightness-110 focus:ring-rose-400/40",
};

function ConfirmHost() {
    const [state, setState] = useState({
        open: false,
        title: "",
        message: "",
        confirmText: "Confirm",
        cancelText: "Cancel",
        variant: "primary",
        requireNote: false,
    });
    const resolver = useRef(null);
    const noteRef = useRef("");

    // open API
    useEffect(() => {
        window.confirmModal = (opts = {}) =>
            new Promise((resolve) => {
                resolver.current = resolve;
                setState((s) => ({
                    ...s,
                    open: true,
                    title: opts.title || "Are you sure?",
                    message: opts.message || "",
                    confirmText: opts.confirmText || "Confirm",
                    cancelText: opts.cancelText || "Cancel",
                    variant: opts.variant || "primary",
                    requireNote: !!opts.requireNote,
                    noteLabel: opts.noteLabel || "Reason (optional)",
                    noteRequired: !!opts.noteRequired,
                    placeholder: opts.placeholder || "Add a note…",
                }));
                noteRef.current = "";
            });

        return () => {
            delete window.confirmModal;
        };
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (!state.open) return;
            if (e.key === "Escape") {
                resolver.current?.({ ok: false });
                setState((s) => ({ ...s, open: false }));
            }
            if (e.key === "Enter") {
                // confirm on Enter (trừ khi đang focus nút cancel)
                const el = document.activeElement;
                if (el && el.dataset?.role === "cancel") return;
                doConfirm();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.open]);

    const doCancel = () => {
        resolver.current?.({ ok: false });
        setState((s) => ({ ...s, open: false }));
    };

    const doConfirm = () => {
        if (state.requireNote && state.noteRequired && !noteRef.current.trim()) {
            // nhẹ: lắc card
            const card = document.getElementById("confirm-card");
            if (card) {
                card.animate(
                    [
                        { transform: "translateX(0)" },
                        { transform: "translateX(-6px)" },
                        { transform: "translateX(6px)" },
                        { transform: "translateX(0)" },
                    ],
                    { duration: 150 }
                );
            }
            return;
        }
        resolver.current?.({ ok: true, note: noteRef.current.trim() });
        setState((s) => ({ ...s, open: false }));
    };

    if (!state.open) return null;

    const isDanger = state.variant === "danger";

    return createPortal(
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                // click outside to close
                if (e.target === e.currentTarget) doCancel();
            }}
        >
            <div
                id="confirm-card"
                className={styles.card}
                style={{ ["--vs-blue"]: BRAND_BLUE }}
            >
                <div className={styles.header}>
                    <div className="flex items-start gap-3">
                        <span
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                            style={{
                                background: isDanger ? "#ef4444" : BRAND_BLUE,
                            }}
                        >
                            <i
                                className={`${isDanger ? "bi bi-exclamation-triangle" : "bi bi-question-lg"
                                    } text-white text-[18px]`}
                            />
                        </span>
                        <div className="flex-1">
                            <div className={styles.title}>{state.title}</div>
                            {state.message && (
                                <div className={styles.message}>{state.message}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.body}>
                    {state.requireNote && (
                        <div>
                            <label className="block text-[13px] text-slate-600 mb-1">
                                {state.noteLabel}
                                {state.noteRequired && (
                                    <span className="text-rose-600"> *</span>
                                )}
                            </label>
                            <textarea
                                rows={3}
                                placeholder={state.placeholder}
                                className={styles.input}
                                onChange={(e) => (noteRef.current = e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button
                        data-role="cancel"
                        onClick={doCancel}
                        className={`${styles.btn} ${styles.btnGhost}`}
                    >
                        {state.cancelText}
                    </button>
                    <button
                        onClick={doConfirm}
                        className={`${styles.btn} ${isDanger ? styles.btnDanger : styles.btnPrimary
                            }`}
                        style={{
                            backgroundColor: isDanger ? "#ef4444" : BRAND_BLUE,
                        }}
                    >
                        {state.confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ConfirmHost;
