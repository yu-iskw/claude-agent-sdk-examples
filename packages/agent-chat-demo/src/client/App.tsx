import { useMemo, useState } from 'react';
import { describeActivity } from './activityLabels';
import { ApprovePlanModal } from './ApprovePlanModal';
import { PlanMessageBody } from './PlanMessageBody';
import { useChat } from './useChat';

export function App() {
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const {
    messages,
    input,
    setInput,
    loading,
    loadingPhase,
    activityLog,
    lastTrace,
    planSessionId,
    planProse,
    planOrchestration,
    activePlanMessageId,
    planReviewAcknowledged,
    setPlanReviewAcknowledged,
    checklistByPlanMessageId,
    planActivityByMessageId,
    toggleResearchStep,
    toggleNode,
    canSubmit,
    canApprovePlan,
    canDiscardPlan,
    sendMessage,
    approveAndExecutePlan,
    discardPlan,
  } = useChat();

  const quickPrompt = useMemo(
    () =>
      [
        'Plan a multi-city trip for 2 adults with the following shape (use explicit assumptions where dates are missing):',
        '- Route: NYC → Chicago (3 nights) → San Francisco (4 nights) → return to NYC. Assume a 2-week window in June if no exact dates are given.',
        '- Budget: total trip soft cap USD 4500 for both travelers combined; lodging soft cap USD 220/night average; call out tradeoffs if estimates exceed.',
        '- Lodging: prefer downtown or near-transit in Chicago (Loop/River North) and in San Francisco (SoMa or near BART); need quiet room for one work-call morning per city.',
        '- Transport: for NYC–Chicago, compare train vs flight (time, cost, comfort) and pick a recommendation; Chicago–San Francisco and all returns by air. Avoid redeyes; prefer at most one stop per flight leg.',
        '- Schedule intent: include at least one dedicated work-block day and one sightseeing-heavy day in each of Chicago and San Francisco in the narrative plan (no separate activities agent—just reflect in trip flow).',
        'Do not write any files. Respond in chat only.',
      ].join('\n'),
    [],
  );

  const lastEvent = activityLog[activityLog.length - 1];
  const latestActivityLabel = lastEvent ? describeActivity(lastEvent).label : '';

  const statusMessage = loading
    ? [
        loadingPhase === 'execute'
          ? 'Running approved orchestration with tools enabled.'
          : 'Orchestrating in SDK orchestration mode, no tools running.',
        latestActivityLabel,
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  const isExecuteRunning = loading && loadingPhase === 'execute';

  return (
    <>
      <div className="skip-nav">
        <a className="skip-link" href="#chat">
          Skip to conversation
        </a>
        <a className="skip-link" href="#workspace-sidebar">
          Skip to workspace sidebar
        </a>
      </div>
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {statusMessage}
      </div>
      <ApprovePlanModal
        isOpen={approveModalOpen}
        isRunning={isExecuteRunning}
        onCancel={() => setApproveModalOpen(false)}
        onConfirm={async () => {
          setApproveModalOpen(false);
          await approveAndExecutePlan();
        }}
      />
      <div className="shell">
        <aside
          aria-label="Workspace tools, plan status, live activity, and runtime trace"
          className="sidebar"
          id="workspace-sidebar"
        >
          <header className="sidebar-header">
            <p className="eyebrow">Claude Agent SDK Demo</p>
            <h1>Workspace-aware trip planner</h1>
            <p className="lede">
              A ChatGPT-style demo that constrains Claude to an isolated app workspace with
              project-specific settings, agents, skills, rules, and Context7 documentation access.
            </p>
          </header>

          <div className="panel">
            <h2>Quick prompts</h2>
            <button
              className="ghost"
              disabled={loading}
              onClick={() => void sendMessage(quickPrompt)}
              type="button"
            >
              Run trip-planning prompt
            </button>
          </div>

          <div className="panel plan-panel plan-status-panel">
            <h2>Plan status</h2>
            <p className="plan-hint">
              Each send runs SDK <strong>orchestration</strong> mode first (no tools). The latest
              orchestration and orchestration graph appear <strong>in the chat</strong>. Approve,
              discard, and acknowledge the orchestration using the controls embedded in the active
              orchestration message card (checkbox + Approve &amp; run).
            </p>
            {lastTrace?.parseWarning ? (
              <p className="parse-warning" role="alert">
                {lastTrace.parseWarning}
              </p>
            ) : null}
            {!planSessionId && (planProse || planOrchestration) ? (
              <p className="session-hint muted">Orchestration executed or awaiting new request.</p>
            ) : null}
            {!planSessionId && !planProse && !planOrchestration ? (
              <p className="muted">
                Send a message to generate an orchestration; it will appear in the chat.
              </p>
            ) : null}
          </div>

          <div className="panel activity-panel">
            <h2>Live activity</h2>
            <p className="activity-hint muted">
              Streamed from the Agent SDK (tasks, tools, session init). This is{' '}
              <strong>runtime telemetry</strong>, not the model-authored orchestration graph in
              chat.
            </p>
            {activityLog.length === 0 ? (
              <p className="muted">
                {loading
                  ? 'Waiting for SDK events…'
                  : 'Send a message or approve a plan to see live activity.'}
              </p>
            ) : (
              <ol className="activity-log" reversed>
                {activityLog
                  .map((event, forwardIndex) => ({ event, forwardIndex }))
                  .reverse()
                  .map(({ event, forwardIndex }) => {
                    const { label, detail } = describeActivity(event);
                    const time = new Date(event.ts).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    return (
                      <li
                        className={`activity-item activity-kind-${event.kind}`}
                        key={`${forwardIndex}-${event.kind}-${event.ts}`}
                      >
                        <span className="activity-time">{time}</span>
                        <span className="activity-kind">{event.kind.replace(/_/g, ' ')}</span>
                        <span className="activity-label">{label}</span>
                        {detail ? <span className="activity-detail">{detail}</span> : null}
                      </li>
                    );
                  })}
              </ol>
            )}
          </div>

          <div className="panel trace-panel">
            <h2>Runtime trace</h2>
            {lastTrace ? (
              <ul>
                <li>
                  <strong>Phase:</strong> {lastTrace.phase}
                </li>
                <li>
                  <strong>Workspace:</strong> {lastTrace.workspace}
                </li>
                <li>
                  <strong>Sandboxed:</strong> {String(lastTrace.sandboxed)}
                </li>
                <li>
                  <strong>Config loaded:</strong> {String(lastTrace.loadedProjectConfig)}
                </li>
                <li>
                  <strong>Agent:</strong> {lastTrace.activeAgent}
                </li>
                {lastTrace.sessionModel ? (
                  <li>
                    <strong>Session model:</strong> {lastTrace.sessionModel}
                  </li>
                ) : null}
                {lastTrace.sessionPermissionMode ? (
                  <li>
                    <strong>Session permission mode:</strong> {lastTrace.sessionPermissionMode}
                  </li>
                ) : null}
                {lastTrace.availableAgents?.length ? (
                  <li>
                    <strong>Available agents (SDK init):</strong>{' '}
                    {lastTrace.availableAgents.join(', ')}
                  </li>
                ) : null}
                {lastTrace.availableSkills?.length ? (
                  <li>
                    <strong>Available skills (SDK init):</strong>{' '}
                    {lastTrace.availableSkills.join(', ')}
                  </li>
                ) : null}
                <li>
                  <strong>MCP:</strong> {lastTrace.mcpServers.join(', ')}
                </li>
              </ul>
            ) : (
              <p>Send a message to inspect which workspace resources the backend loaded.</p>
            )}
          </div>
        </aside>

        <section aria-label="Chat" className="chat-panel" id="chat">
          <div aria-busy={loading} className="messages">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <span className="message-label">
                  {message.role === 'assistant' ? 'Claude' : 'You'}
                </span>
                <PlanMessageBody
                  canApprovePlan={canApprovePlan}
                  canDiscardPlan={canDiscardPlan}
                  isActivePlan={message.id === activePlanMessageId}
                  loading={loading}
                  message={message}
                  onApproveClick={() => setApproveModalOpen(true)}
                  onDiscard={discardPlan}
                  onToggleNode={toggleNode}
                  onToggleResearchStep={toggleResearchStep}
                  planActivityForMessage={planActivityByMessageId[message.id] ?? []}
                  planChecklist={checklistByPlanMessageId[message.id]}
                  planReviewAcknowledged={planReviewAcknowledged}
                  planSessionId={planSessionId}
                  setPlanReviewAcknowledged={setPlanReviewAcknowledged}
                />
              </article>
            ))}
            {loading ? (
              <article aria-hidden="true" className="message assistant loading">
                {loadingPhase === 'execute'
                  ? 'Running approved orchestration (tools enabled)…'
                  : 'Orchestration (SDK orchestration mode, no tools)…'}
              </article>
            ) : null}
          </div>

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) {
                void sendMessage(input.trim());
              }
            }}
          >
            <label className="visually-hidden" htmlFor="chat-input">
              Message
            </label>
            <textarea
              id="chat-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for trip planning and workspace-aware behavior…"
              rows={4}
              value={input}
            />
            <button disabled={!canSubmit} type="submit">
              {loading ? 'Running…' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
