type Props = {
  planSessionId: string;
  planReviewAcknowledged: boolean;
  setPlanReviewAcknowledged: (value: boolean) => void;
  canApprovePlan: boolean;
  canDiscardPlan: boolean;
  loading: boolean;
  onApproveClick: () => void;
  onDiscard: () => void;
};

export function PlanApprovalDock({
  planSessionId,
  planReviewAcknowledged,
  setPlanReviewAcknowledged,
  canApprovePlan,
  canDiscardPlan,
  loading,
  onApproveClick,
  onDiscard,
}: Props) {
  return (
    <section
      aria-labelledby="plan-approval-heading"
      className="plan-approval-dock"
      id="plan-approval-dock"
    >
      <h2 className="plan-approval-dock-title" id="plan-approval-heading">
        Plan approval
      </h2>
      <p className="plan-hint plan-approval-dock-hint">
        Review the plan and orchestration <strong>in the chat above</strong>. Confirm you have
        reviewed them, then approve to run tools.
      </p>
      <div className="plan-review-ack plan-review-ack-dock">
        <input
          checked={planReviewAcknowledged}
          className="plan-review-checkbox"
          disabled={loading}
          id="plan-review-ack-dock"
          onChange={(event) => setPlanReviewAcknowledged(event.target.checked)}
          type="checkbox"
        />
        <label className="plan-review-label" htmlFor="plan-review-ack-dock">
          I have reviewed the plan and orchestration in the chat.
        </label>
      </div>
      <div className="plan-actions plan-actions-dock">
        <button
          aria-label={
            canApprovePlan
              ? 'Approve and run flight and hotel research with tools'
              : 'Approve and run (available after planning completes and you confirm review)'
          }
          className="approve-plan"
          disabled={!canApprovePlan}
          onClick={onApproveClick}
          type="button"
        >
          Approve &amp; run with tools
        </button>
        <button
          aria-label="Discard current plan"
          className="ghost discard-plan"
          disabled={!canDiscardPlan}
          onClick={() => onDiscard()}
          type="button"
        >
          Discard plan
        </button>
      </div>
      <p className="session-hint plan-approval-dock-session">
        <strong>Session:</strong> <code>{planSessionId.slice(0, 8)}…</code>
      </p>
    </section>
  );
}
