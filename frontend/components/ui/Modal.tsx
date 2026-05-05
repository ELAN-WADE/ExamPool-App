import type { ReactNode } from "react";
import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, children, className = "" }: Props) {
  if (!open) return null;
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={[styles.modal, className].filter(Boolean).join(" ")} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Close modal" type="button">
          x
        </button>
        {children}
      </div>
    </div>
  );
}
