import { useMemo, useState } from 'react';
import type { ChatMessage, ChatResponse } from '../shared/chat';

const starterMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Hi! I am a Claude Agent SDK demo assistant. I run inside the app workspace so I can use the local CLAUDE.md, .claude settings, markdown agents, skills, rules, and the Context7 MCP plugin.',
  },
];

const quickPrompts = {
  builder: 'Design a polished Claude Agent SDK chatbot architecture for this app and explain how the local .claude workspace resources influence runtime behavior.',
  slack: 'Outline how this chatbot should evolve into a Slack bot, including reusable agent skills and what should stay shared between web and Slack surfaces.',
};

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'builder' | 'slack'>('builder');
  const [loading, setLoading] = useState(false);
  const [lastTrace, setLastTrace] = useState<ChatResponse['trace'] | null>(null);
  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage(nextMessage: string) {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: nextMessage,
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: nextMessage,
          history: nextHistory,
          mode,
        }),
      });

      const payload = (await response.json()) as ChatResponse | { error: string };
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Request failed.');
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: payload.reply,
        },
      ]);
      setLastTrace(payload.trace);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `The backend could not complete the request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="sidebar">
        <div>
          <p className="eyebrow">Claude Agent SDK Demo</p>
          <h1>Workspace-aware chatbot</h1>
          <p className="lede">
            A ChatGPT-style demo that constrains Claude to an isolated app workspace with project-specific settings,
            agents, skills, rules, and Context7 documentation access.
          </p>
        </div>

        <div className="panel">
          <h2>Mode</h2>
          <div className="mode-switch">
            <button className={mode === 'builder' ? 'active' : ''} onClick={() => setMode('builder')} type="button">
              App builder
            </button>
            <button className={mode === 'slack' ? 'active' : ''} onClick={() => setMode('slack')} type="button">
              Slack future
            </button>
          </div>
        </div>

        <div className="panel">
          <h2>Quick prompts</h2>
          <button className="ghost" onClick={() => void sendMessage(quickPrompts[mode])} type="button">
            Run {mode === 'builder' ? 'architecture' : 'Slack-readiness'} prompt
          </button>
        </div>

        <div className="panel trace-panel">
          <h2>Runtime trace</h2>
          {lastTrace ? (
            <ul>
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
              <li>
                <strong>MCP:</strong> {lastTrace.mcpServers.join(', ')}
              </li>
            </ul>
          ) : (
            <p>Send a message to inspect which workspace resources the backend loaded.</p>
          )}
        </div>
      </section>

      <section className="chat-panel">
        <div className="messages">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <span>{message.role === 'assistant' ? 'Claude' : 'You'}</span>
              <p>{message.text}</p>
            </article>
          ))}
          {loading ? <article className="message assistant loading">Claude is thinking inside the sandbox…</article> : null}
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
          <textarea
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the app, agent resources, or the future Slack bot…"
            rows={4}
            value={input}
          />
          <button disabled={!canSubmit} type="submit">
            {loading ? 'Running…' : 'Send'}
          </button>
        </form>
      </section>
    </main>
  );
}
