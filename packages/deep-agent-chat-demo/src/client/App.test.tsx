import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useChatMock } = vi.hoisted(() => ({
  useChatMock: vi.fn(),
}));

vi.mock('./useChat', () => ({
  useChat: useChatMock,
}));

import { App } from './App';

describe('App quick prompt', () => {
  beforeEach(() => {
    useChatMock.mockReset();
  });

  it('renders the quick prompt button as disabled while loading', () => {
    useChatMock.mockReturnValue({
      messages: [],
      input: '',
      setInput: vi.fn(),
      loading: true,
      loadingPhase: 'plan',
      activityLog: [],
      lastTrace: null,
      planSessionId: null,
      planProse: null,
      planOrchestration: null,
      planReviewAcknowledged: false,
      setPlanReviewAcknowledged: vi.fn(),
      activePlanMessageId: null,
      checklistByPlanMessageId: {},
      planActivityByMessageId: {},
      toggleResearchStep: vi.fn(),
      toggleNode: vi.fn(),
      canSubmit: false,
      canApprovePlan: false,
      canDiscardPlan: false,
      sendMessage: vi.fn(),
      approveAndExecutePlan: vi.fn(),
      discardPlan: vi.fn(),
    });

    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('Run trip-planning prompt');
    expect(html).toContain(
      '<button class="ghost" disabled="" type="button">Run trip-planning prompt</button>',
    );
  });
});
