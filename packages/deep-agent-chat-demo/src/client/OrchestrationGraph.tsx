import { useMemo } from 'react';
import type { ActivityEvent } from '../shared/activity';
import type { OrchestrationPlan } from '../shared/chat';
import type { ManualCheckState } from './chat/orchestrationChecklist';
import {
  computeSuggestedCompletions,
  isNodeDisplayDone,
  isStepDisplayDone,
  nodeCompletionBadge,
  stepCompletionBadge,
} from './chat/orchestrationChecklist';

type Props = {
  plan: OrchestrationPlan;
  planMessageId: string;
  planActivity: ActivityEvent[];
  stepManual: Record<number, ManualCheckState | undefined>;
  nodeManual: Record<string, ManualCheckState | undefined>;
  checklistInteractive: boolean;
  onToggleResearchStep: (index: number, checked: boolean) => void;
  onToggleNode: (nodeId: string, checked: boolean) => void;
};

export function OrchestrationGraph({
  plan,
  planMessageId,
  planActivity,
  stepManual,
  nodeManual,
  checklistInteractive,
  onToggleResearchStep,
  onToggleNode,
}: Props) {
  const { suggestedSteps, suggestedNodes } = useMemo(
    () => computeSuggestedCompletions(plan, planActivity),
    [plan, planActivity],
  );

  return (
    <div className="orch-graph">
      <p className="orch-intro">
        Parsed from the plan JSON: agents, skills, stages, and how they connect. Checkboxes track
        progress; <strong>SDK estimate</strong> means a best-effort match from streamed Agent SDK
        activity (may not align perfectly with the graph).
      </p>
      {plan.title ? <p className="orch-graph-title">{plan.title}</p> : null}
      {plan.researchSteps.length > 0 ? (
        <div className="orch-section">
          <h3 className="orch-heading">Research steps</h3>
          <ul className="orch-checklist orch-steps">
            {plan.researchSteps.map((step, i) => {
              const done = isStepDisplayDone(i, suggestedSteps, stepManual);
              const badge = stepCompletionBadge(i, done, suggestedSteps, stepManual);
              const stepId = `orch-step-${planMessageId}-${i}`;
              return (
                <li className={`orch-checklist-item ${done ? 'orch-checklist-done' : ''}`} key={i}>
                  <input
                    aria-describedby={badge ? `${stepId}-badge` : undefined}
                    checked={done}
                    className="orch-checklist-input"
                    disabled={!checklistInteractive}
                    id={stepId}
                    onChange={(e) => onToggleResearchStep(i, e.target.checked)}
                    type="checkbox"
                  />
                  <label className="orch-checklist-label" htmlFor={stepId}>
                    <span className="orch-checklist-text">{step}</span>
                    {badge ? (
                      <span
                        className={`orch-completion-badge orch-completion-${badge}`}
                        id={`${stepId}-badge`}
                      >
                        {badge === 'manual' ? 'Manual' : 'SDK estimate'}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <div className="orch-section">
        <h3 className="orch-heading">Nodes</h3>
        <div className="orch-nodes">
          {plan.nodes.map((n) => {
            const done = isNodeDisplayDone(n.id, suggestedNodes, nodeManual);
            const badge = nodeCompletionBadge(n.id, done, suggestedNodes, nodeManual);
            const nodeFieldId = `orch-node-${planMessageId}-${n.id}`;
            return (
              <div
                className={`orch-node orch-node-${n.kind} ${done ? 'orch-checklist-done' : ''}`}
                key={n.id}
              >
                <div className="orch-node-check-row">
                  <input
                    aria-describedby={badge ? `${nodeFieldId}-badge` : undefined}
                    checked={done}
                    className="orch-checklist-input"
                    disabled={!checklistInteractive}
                    id={nodeFieldId}
                    onChange={(e) => onToggleNode(n.id, e.target.checked)}
                    type="checkbox"
                  />
                  <label className="orch-checklist-label orch-node-head" htmlFor={nodeFieldId}>
                    <span className="orch-kind">{n.kind}</span>
                    <strong className="orch-name">{n.name}</strong>
                    <span className="orch-id">{n.id}</span>
                    {badge ? (
                      <span
                        className={`orch-completion-badge orch-completion-${badge}`}
                        id={`${nodeFieldId}-badge`}
                      >
                        {badge === 'manual' ? 'Manual' : 'SDK estimate'}
                      </span>
                    ) : null}
                  </label>
                </div>
                {n.description ? <p className="orch-desc">{n.description}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="orch-section">
        <h3 className="orch-heading">Edges</h3>
        <ul className="orch-edges">
          {plan.edges.map((e, i) => (
            <li key={i}>
              <code>{e.from}</code>
              <span className="orch-arrow"> → </span>
              <code>{e.to}</code>
              {e.label ? <span className="orch-edge-label"> ({e.label})</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
