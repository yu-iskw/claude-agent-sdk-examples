import type { ActivityEvent } from '../shared/activity';
import type { ChatMessage } from '../shared/chat';
import type { PlanChecklistEntry } from './useChat';
import { MessageMarkdown } from './MessageMarkdown';
import { OrchestrationGraph } from './OrchestrationGraph';

type Props = {
  message: ChatMessage;
  isActivePlan: boolean;
  planSessionId: string | null;
  planReviewAcknowledged: boolean;
  setPlanReviewAcknowledged: (value: boolean) => void;
  canApprovePlan: boolean;
  canDiscardPlan: boolean;
  loading: boolean;
  onApproveClick: () => void;
  onDiscard: () => void;
  planActivityForMessage: ActivityEvent[];
  planChecklist: PlanChecklistEntry | undefined;
  onToggleResearchStep: (planMessageId: string, index: number, checked: boolean) => void;
  onToggleNode: (planMessageId: string, nodeId: string, checked: boolean) => void;
};

export function PlanMessageBody({
  message,
  isActivePlan,
  planSessionId,
  planReviewAcknowledged,
  setPlanReviewAcknowledged,
  canApprovePlan,
  canDiscardPlan,
  loading,
  onApproveClick,
  onDiscard,
  planActivityForMessage,
  planChecklist,
  onToggleResearchStep,
  onToggleNode,
}: Props) {
  const plan = message.role === 'assistant' ? message.plan : undefined;
  const ackId = `plan-review-ack-inline-${message.id}`;

  return (
    <>
      <MessageMarkdown text={message.text} />
      {plan ? (
        <div className="message-plan-card">
          <p className="message-plan-status">
            {isActivePlan ? (
              <>Pending approval — check the box below, then approve to run tools.</>
            ) : (
              <>Pending approval — this plan is no longer active.</>
            )}
          </p>

          <h3 className="message-plan-card-title">Orchestration</h3>

          {plan.orchestration ? (
            <div className="message-plan-graph">
              <OrchestrationGraph
                checklistInteractive={isActivePlan}
                nodeManual={planChecklist?.nodeManual ?? {}}
                onToggleNode={(nodeId, checked) => onToggleNode(message.id, nodeId, checked)}
                onToggleResearchStep={(index, checked) =>
                  onToggleResearchStep(message.id, index, checked)
                }
                plan={plan.orchestration}
                planActivity={planActivityForMessage}
                planMessageId={message.id}
                stepManual={planChecklist?.stepManual ?? {}}
              />
            </div>
          ) : plan.parseWarning ? (
            <p className="message-plan-parse-hint" role="status">
              {plan.parseWarning}
            </p>
          ) : (
            <p className="message-plan-parse-hint" role="status">
              No orchestration graph was parsed for this plan.
            </p>
          )}

          {isActivePlan ? (
            <div className="message-plan-actions-inline">
              <div className="plan-review-ack message-plan-review-ack-inline">
                <input
                  checked={planReviewAcknowledged}
                  className="plan-review-checkbox"
                  disabled={loading || !planSessionId}
                  id={ackId}
                  onChange={(event) => setPlanReviewAcknowledged(event.target.checked)}
                  type="checkbox"
                />
                <label className="plan-review-label" htmlFor={ackId}>
                  I have reviewed the plan and orchestration in this chat.
                </label>
              </div>

              <div className="plan-actions message-plan-actions-inline-buttons">
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
                  onClick={onDiscard}
                  type="button"
                >
                  Discard plan
                </button>
              </div>

              {planSessionId ? (
                <p className="session-hint muted message-plan-session-hint">
                  <strong>Session:</strong> <code>{planSessionId.slice(0, 8)}…</code>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
