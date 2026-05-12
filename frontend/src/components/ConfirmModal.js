import { useEffect } from "react";

// Generic confirm dialog — replaces window.confirm() with a styled modal.
// Use cases: "Отменить запрос?", "Покинуть группу?", "Удалить пост?" etc.
//
// Usage:
//   const [open, setOpen] = useState(false);
//   <ConfirmModal
//     open={open}
//     title="Отменить запрос на вступление?"
//     message="Ваш запрос будет отменён, заявку можно отправить снова позже."
//     confirmLabel="Отменить запрос"
//     danger
//     onConfirm={() => { doIt(); setOpen(false); }}
//     onClose={() => setOpen(false)}
//   />
export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "ОК",
    cancelLabel = "Отмена",
    danger = false,
    onConfirm,
    onClose,
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
            if (e.key === "Enter") onConfirm?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose, onConfirm]);

    if (!open) return null;

    return (
        <div className="confirm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="confirm-title">{title}</h3>
                {message && <p className="confirm-message">{message}</p>}
                <div className="confirm-actions">
                    <button type="button" className="confirm-btn confirm-cancel" onClick={onClose}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`confirm-btn confirm-ok ${danger ? "is-danger" : ""}`}
                        onClick={onConfirm}
                        autoFocus
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .confirm-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.45);
                    z-index: 300;
                    display: grid;
                    place-items: center;
                    padding: 16px;
                    animation: fadeIn 0.15s ease-out;
                }
                .confirm-modal {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 380px;
                    padding: 20px 22px 16px;
                    box-shadow: var(--shadow-lg);
                    animation: pop 0.15s ease-out;
                }
                .confirm-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: var(--text-main);
                    margin: 0 0 8px;
                }
                .confirm-message {
                    color: var(--text-secondary);
                    font-size: 14px;
                    line-height: 1.4;
                    margin: 0 0 18px;
                }
                .confirm-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                .confirm-btn {
                    padding: 8px 16px;
                    border-radius: var(--radius);
                    font-family: inherit;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    border: none;
                    transition: background 0.15s, color 0.15s;
                }
                .confirm-cancel {
                    background: var(--bg-hover);
                    color: var(--text-main);
                }
                .confirm-cancel:hover { background: #D8DADF; }
                .confirm-ok {
                    background: var(--primary);
                    color: white;
                }
                .confirm-ok:hover { background: var(--primary-hover); }
                .confirm-ok.is-danger { background: var(--error); }
                .confirm-ok.is-danger:hover { background: #c81f3a; }
                @keyframes pop {
                    from { opacity: 0; transform: scale(0.96); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
