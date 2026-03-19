import { useEffect, useRef } from 'react';

type Props = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  isRunning?: boolean;
};

export function ApprovePlanModal({ isOpen, onCancel, onConfirm, isRunning }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    confirmRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div aria-hidden={!isOpen} className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        aria-labelledby="approve-plan-title"
        aria-modal="true"
        className="modal-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="modal-title" id="approve-plan-title">
          Run this plan with tools?
        </h2>
        <p className="modal-body">
          This will delegate to flight and hotel researchers and enable tool use in the sandbox. You
          can cancel and adjust your request first if anything looks wrong.
        </p>
        <div className="modal-actions">
          <button
            className="ghost modal-button"
            disabled={isRunning}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className="modal-button modal-button-primary"
            disabled={isRunning}
            onClick={() => void onConfirm()}
            ref={confirmRef}
            type="button"
          >
            {isRunning ? 'Running…' : 'Confirm and run'}
          </button>
        </div>
      </div>
    </div>
  );
}
