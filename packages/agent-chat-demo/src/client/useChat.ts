import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityEvent } from '../shared/activity';
import type { ChatMessage, ChatResponse, OrchestrationPlan } from '../shared/chat';
import { postChatStream } from './api/chatApi';
import type { ManualCheckState } from './chat/orchestrationChecklist';
import { manualFromCheckboxChecked } from './chat/orchestrationChecklist';
import { tryStartLoadingPhase, type LoadingPhase } from './chat/singleFlight';
import {
  executeResponseToAssistantMessage,
  formatBackendCompletionError,
  formatExecuteError,
  planResponseToChatUpdates,
} from './chat/transform';

const starterMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Hi! I am a Claude Agent SDK demo assistant. I run inside the app workspace so I can use the local CLAUDE.md, .claude settings, markdown agents, skills, rules, and the Context7 MCP plugin.\n\nSend a trip request to get an **orchestration** first (SDK orchestration mode, no tools). The **orchestration prose and orchestration graph** appear **in this chat** with a **TODO checklist** (manual checkmarks plus optional SDK-based estimates from live activity). For the latest orchestration, approval controls (checkbox + Approve & run) are embedded inside the orchestration message card. The workspace sidebar shows **live SDK activity**, **orchestration status**, parse warnings, and **runtime trace**. Approval is not done by typing in chat.',
  },
];

const MAX_ACTIVITY_LOG = 100;
const MAX_PLAN_ACTIVITY = 200;

export type PlanChecklistEntry = {
  stepManual: Partial<Record<number, ManualCheckState>>;
  nodeManual: Partial<Record<string, ManualCheckState>>;
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [input, setInput] = useState('');
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('idle');
  const [lastTrace, setLastTrace] = useState<ChatResponse['trace'] | null>(null);

  const [planSessionId, setPlanSessionId] = useState<string | null>(null);
  const [planProse, setPlanProse] = useState<string | null>(null);
  const [planOrchestration, setPlanOrchestration] = useState<OrchestrationPlan | null>(null);
  const [planReviewAcknowledged, setPlanReviewAcknowledged] = useState(false);
  const [activePlanMessageId, setActivePlanMessageId] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);

  const [checklistByPlanMessageId, setChecklistByPlanMessageId] = useState<
    Record<string, PlanChecklistEntry>
  >({});
  const [planActivityByMessageId, setPlanActivityByMessageId] = useState<
    Record<string, ActivityEvent[]>
  >({});

  const loadingPhaseRef = useRef<LoadingPhase>('idle');
  const activePlanMessageIdRef = useRef<string | null>(null);
  const pendingPlanMessageIdRef = useRef<string | null>(null);
  const executingPlanMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadingPhaseRef.current = loadingPhase;
  }, [loadingPhase]);
  useEffect(() => {
    activePlanMessageIdRef.current = activePlanMessageId;
  }, [activePlanMessageId]);

  const appendPlanActivity = useCallback((planMsgId: string, event: ActivityEvent) => {
    setPlanActivityByMessageId((prev) => {
      const cur = prev[planMsgId] ?? [];
      const next = [...cur, event];
      const trimmed = next.length > MAX_PLAN_ACTIVITY ? next.slice(-MAX_PLAN_ACTIVITY) : next;
      return { ...prev, [planMsgId]: trimmed };
    });
  }, []);

  const loading = loadingPhase !== 'idle';
  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);
  const canApprovePlan = Boolean(planSessionId) && !loading && planReviewAcknowledged;
  const canDiscardPlan = Boolean(planSessionId || planProse || planOrchestration) && !loading;

  const discardPlan = useCallback(() => {
    const planMsgId = activePlanMessageIdRef.current;
    setPlanSessionId(null);
    setPlanProse(null);
    setPlanOrchestration(null);
    setPlanReviewAcknowledged(false);
    setActivePlanMessageId(null);
    setActivityLog([]);
    pendingPlanMessageIdRef.current = null;
    executingPlanMessageIdRef.current = null;
    if (planMsgId) {
      setChecklistByPlanMessageId((prev) => {
        const next = { ...prev };
        delete next[planMsgId];
        return next;
      });
      setPlanActivityByMessageId((prev) => {
        const next = { ...prev };
        delete next[planMsgId];
        return next;
      });
    }
  }, []);

  const toggleResearchStep = useCallback((planMsgId: string, index: number, checked: boolean) => {
    const m = manualFromCheckboxChecked(checked);
    setChecklistByPlanMessageId((prev) => {
      const entry = prev[planMsgId] ?? { stepManual: {}, nodeManual: {} };
      return {
        ...prev,
        [planMsgId]: {
          ...entry,
          stepManual: { ...entry.stepManual, [index]: m },
        },
      };
    });
  }, []);

  const toggleNode = useCallback((planMsgId: string, nodeId: string, checked: boolean) => {
    const m = manualFromCheckboxChecked(checked);
    setChecklistByPlanMessageId((prev) => {
      const entry = prev[planMsgId] ?? { stepManual: {}, nodeManual: {} };
      return {
        ...prev,
        [planMsgId]: {
          ...entry,
          nodeManual: { ...entry.nodeManual, [nodeId]: m },
        },
      };
    });
  }, []);

  const handleActivityEvent = useCallback(
    (event: ActivityEvent) => {
      setActivityLog((prev) => {
        const next = [...prev, event];
        return next.length > MAX_ACTIVITY_LOG ? next.slice(-MAX_ACTIVITY_LOG) : next;
      });
      const phase = loadingPhaseRef.current;
      const planMsgId =
        phase === 'plan'
          ? pendingPlanMessageIdRef.current
          : phase === 'execute'
            ? executingPlanMessageIdRef.current
            : null;
      if (planMsgId) {
        appendPlanActivity(planMsgId, event);
      }
    },
    [appendPlanActivity],
  );

  async function sendMessage(nextMessage: string) {
    if (!tryStartLoadingPhase(loadingPhaseRef, 'plan')) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: nextMessage,
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput('');
    setPlanSessionId(null);
    setPlanProse(null);
    setPlanOrchestration(null);
    setPlanReviewAcknowledged(false);
    setActivePlanMessageId(null);
    setActivityLog([]);
    setLoadingPhase('plan');

    const assistantPlanMessageId = crypto.randomUUID();
    pendingPlanMessageIdRef.current = assistantPlanMessageId;

    try {
      const payload = await postChatStream(
        {
          phase: 'plan',
          message: nextMessage,
          history: nextHistory,
        },
        {
          onActivity: handleActivityEvent,
        },
      );

      const { assistantMessage, planSessionId, planProse, planOrchestration } =
        planResponseToChatUpdates({
          response: payload,
          assistantMessageId: assistantPlanMessageId,
        });

      setMessages((current) => [...current, assistantMessage]);
      setLastTrace(payload.trace);
      setPlanSessionId(planSessionId);
      setPlanProse(planProse);
      setPlanOrchestration(planOrchestration);
      setPlanReviewAcknowledged(false);
      setActivePlanMessageId(assistantPlanMessageId);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: formatBackendCompletionError(error),
        },
      ]);
      setChecklistByPlanMessageId((prev) => {
        const next = { ...prev };
        delete next[assistantPlanMessageId];
        return next;
      });
      setPlanActivityByMessageId((prev) => {
        const next = { ...prev };
        delete next[assistantPlanMessageId];
        return next;
      });
    } finally {
      pendingPlanMessageIdRef.current = null;
      setLoadingPhase('idle');
    }
  }

  async function approveAndExecutePlan() {
    const sessionId = planSessionId;
    const planMsgId = activePlanMessageIdRef.current;
    if (!sessionId || !planMsgId || !tryStartLoadingPhase(loadingPhaseRef, 'execute')) {
      return;
    }

    executingPlanMessageIdRef.current = planMsgId;
    setLoadingPhase('execute');
    setActivityLog([]);

    try {
      const payload = await postChatStream(
        {
          phase: 'execute',
          sessionId,
          message: '',
          history: messagesRef.current,
        },
        {
          onActivity: handleActivityEvent,
        },
      );

      const assistantMessageId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        executeResponseToAssistantMessage({
          response: payload,
          assistantMessageId,
        }),
      ]);
      setLastTrace(payload.trace);
      setPlanSessionId(null);
      setPlanReviewAcknowledged(false);
      setActivePlanMessageId(null);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: formatExecuteError(error),
        },
      ]);
    } finally {
      loadingPhaseRef.current = 'idle';
      executingPlanMessageIdRef.current = null;
      setLoadingPhase('idle');
    }
  }

  return {
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
    planReviewAcknowledged,
    setPlanReviewAcknowledged,
    activePlanMessageId,
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
  };
}
