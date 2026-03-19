/**
 * app.js — Frontend for the Claude Agent SDK Demo chatbot
 *
 * Features:
 *  - Send messages via POST /api/chat (SSE streaming)
 *  - Display streaming text with a live cursor
 *  - Show tool-use indicators while the agent works
 *  - Session sidebar: list + resume past conversations
 *  - Agent selector: choose from agents loaded via .claude/agents/
 *  - Simple markdown rendering (no external libs)
 */

/* ── State ─────────────────────────────────────────────────────────── */
const state = {
  sessionId: null,   // Current session ID (for resumption)
  streaming: false,  // Whether a request is in-flight
  messages: [],      // Array of { role, text, toolUses }
};

/* ── DOM refs ───────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const messagesEl = $("messages");
const inputEl = $("message-input");
const sendBtn = $("send-btn");
const agentSelect = $("agent-select");
const agentBadge = $("agent-badge");
const sessionsList = $("sessions-list");
const newChatBtn = $("new-chat-btn");

/* ── Minimal markdown renderer ──────────────────────────────────────── */
function renderMarkdown(text) {
  // Escape HTML
  const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  // Fenced code blocks
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${esc(lang)}">${esc(code.trimEnd())}</code></pre>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  // Headers
  text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold + italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Horizontal rules
  text = text.replace(/^---+$/gm, "<hr/>");
  // Unordered lists
  text = text.replace(/^[ \t]*[-*+] (.+)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  // Ordered lists
  text = text.replace(/^[ \t]*\d+\. (.+)$/gm, "<li>$1</li>");
  // Blockquotes
  text = text.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  // Paragraphs (double newline → paragraph break)
  text = text.split(/\n{2,}/).map(para => {
    para = para.trim();
    if (!para) return "";
    if (/^<(h[1-6]|ul|ol|pre|blockquote|hr)/.test(para)) return para;
    return `<p>${para.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return text;
}

/* ── Message rendering ──────────────────────────────────────────────── */
function createMessageEl(role) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "U" : "C";

  const content = document.createElement("div");
  content.className = "message-content";

  wrap.appendChild(avatar);
  wrap.appendChild(content);
  return { wrap, content };
}

function appendMessage(role, html, toolUses = []) {
  const { wrap, content } = createMessageEl(role);

  // Remove empty state on first message
  const emptyState = $("empty-state");
  if (emptyState) emptyState.remove();

  // Tool use indicators
  for (const tu of toolUses) {
    const tuEl = document.createElement("div");
    tuEl.className = "tool-use";
    tuEl.innerHTML = `<span class="tool-use-icon">⚙</span> Used tool: <strong>${tu}</strong>`;
    content.appendChild(tuEl);
  }

  content.innerHTML += html;
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return content;
}

/* ── Streaming handler ──────────────────────────────────────────────── */
async function sendMessage(message) {
  if (state.streaming || !message.trim()) return;

  state.streaming = true;
  sendBtn.disabled = true;
  inputEl.disabled = true;

  const agentName = agentSelect.value || null;

  // Render user message
  appendMessage("user", `<p>${message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>`);

  // Create streaming assistant message
  const { wrap: assistantWrap, content: assistantContent } = createMessageEl("assistant");
  const emptyState = $("empty-state");
  if (emptyState) emptyState.remove();
  assistantContent.classList.add("streaming-cursor");
  messagesEl.appendChild(assistantWrap);

  let buffer = "";
  const toolUses = [];

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        agentName,
        sessionId: state.sessionId,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let eventBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      eventBuffer += decoder.decode(value, { stream: true });

      // Parse SSE lines
      const lines = eventBuffer.split("\n");
      eventBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let event;
        try { event = JSON.parse(line.slice(6)); } catch { continue; }

        if (event.type === "chunk" && event.text) {
          buffer += event.text;
          // Render incrementally — show markdown progressively
          assistantContent.innerHTML = renderMarkdown(buffer);
          assistantContent.classList.add("streaming-cursor");
          messagesEl.scrollTop = messagesEl.scrollHeight;

        } else if (event.type === "tool_use") {
          toolUses.push(event.toolName);
          // Insert tool use indicator above the streaming content
          const tuEl = document.createElement("div");
          tuEl.className = "tool-use";
          tuEl.innerHTML = `<span class="tool-use-icon">⚙</span> Using: <strong>${event.toolName}</strong>`;
          assistantContent.insertBefore(tuEl, assistantContent.firstChild);
          messagesEl.scrollTop = messagesEl.scrollHeight;

        } else if (event.type === "done") {
          state.sessionId = event.sessionId || state.sessionId;
          // Refresh sessions sidebar
          void loadSessions();

        } else if (event.type === "error") {
          buffer = buffer || `Error: ${event.message}`;
          assistantContent.innerHTML = `<p style="color:#ff6b6b">⚠ ${event.message}</p>`;
        }
      }
    }
  } catch (err) {
    assistantContent.innerHTML = `<p style="color:#ff6b6b">⚠ ${err.message}</p>`;
  } finally {
    // Remove streaming cursor, finalize content
    assistantContent.classList.remove("streaming-cursor");
    if (buffer) assistantContent.innerHTML = renderMarkdown(buffer);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    state.streaming = false;
    sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
  }
}

/* ── Session management ─────────────────────────────────────────────── */
async function loadSessions() {
  try {
    const res = await fetch("/api/sessions?limit=20");
    const data = await res.json();
    renderSessions(data.sessions ?? []);
  } catch {
    // Sessions unavailable — not critical
  }
}

function renderSessions(sessions) {
  sessionsList.innerHTML = "";
  if (sessions.length === 0) {
    sessionsList.innerHTML = `<div style="padding:12px;font-size:12px;color:var(--text-muted)">No past conversations</div>`;
    return;
  }
  for (const s of sessions) {
    const item = document.createElement("div");
    item.className = "session-item" + (s.sessionId === state.sessionId ? " active" : "");
    const date = new Date(s.lastModified).toLocaleDateString();
    item.innerHTML = `
      <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.summary || "Conversation"}</div>
      <div class="session-date">${date}</div>
    `;
    item.addEventListener("click", () => resumeSession(s.sessionId, s.summary));
    sessionsList.appendChild(item);
  }
}

function resumeSession(sessionId, summary) {
  state.sessionId = sessionId;
  // Clear current messages
  messagesEl.innerHTML = "";
  const notice = document.createElement("div");
  notice.style.cssText = "text-align:center;color:var(--text-muted);font-size:13px;padding:16px";
  notice.textContent = `Resumed: ${summary || sessionId}`;
  messagesEl.appendChild(notice);
  // Mark active
  document.querySelectorAll(".session-item").forEach(el =>
    el.classList.toggle("active", el.dataset.id === sessionId)
  );
  inputEl.focus();
}

/* ── Agent selector ─────────────────────────────────────────────────── */
async function loadAgents() {
  try {
    const res = await fetch("/api/agents");
    const data = await res.json();
    const agents = data.agents ?? [];

    // Clear and rebuild options
    agentSelect.innerHTML = '<option value="">Default (chat-assistant)</option>';
    for (const agent of agents) {
      const opt = document.createElement("option");
      opt.value = agent.name;
      opt.textContent = agent.name;
      opt.title = agent.description;
      agentSelect.appendChild(opt);
    }

    // Show agent count in footer
    const footer = $("input-footer");
    if (footer) {
      footer.innerHTML = footer.innerHTML.replace(
        "View loaded agents ↗",
        `${agents.length} agents loaded ↗`
      );
    }
  } catch {
    // Not critical
  }
}

agentSelect.addEventListener("change", () => {
  const name = agentSelect.value || "chat-assistant";
  agentBadge.textContent = name;
});

/* ── Send button + textarea ─────────────────────────────────────────── */
inputEl.addEventListener("input", () => {
  sendBtn.disabled = !inputEl.value.trim();
  // Auto-resize textarea
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + "px";
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void doSend();
  }
});

sendBtn.addEventListener("click", () => void doSend());

function doSend() {
  const msg = inputEl.value.trim();
  if (!msg || state.streaming) return;
  inputEl.value = "";
  inputEl.style.height = "auto";
  sendBtn.disabled = true;
  void sendMessage(msg);
}

/* ── Suggestion buttons ─────────────────────────────────────────────── */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".suggestion-btn");
  if (btn?.dataset.prompt) {
    inputEl.value = btn.dataset.prompt;
    sendBtn.disabled = false;
    void doSend();
  }
});

/* ── New chat ───────────────────────────────────────────────────────── */
newChatBtn.addEventListener("click", () => {
  state.sessionId = null;
  state.messages = [];
  messagesEl.innerHTML = "";

  // Restore empty state
  const emptyState = document.createElement("div");
  emptyState.id = "empty-state";
  emptyState.innerHTML = `
    <h1>Claude Agent SDK</h1>
    <p>A ChatGPT-like chatbot powered by <code>@anthropic-ai/claude-agent-sdk</code>,
    loading agents and settings from <code>.claude/</code> directories.</p>
    <div class="suggestions">
      <button class="suggestion-btn" data-prompt="What agents are loaded from the .claude/ directory?">What agents are loaded from .claude/?</button>
      <button class="suggestion-btn" data-prompt="Explain how this app uses settingSources to load CLAUDE.md and settings.json">How does settingSources work here?</button>
      <button class="suggestion-btn" data-prompt="What is the sandbox configuration in this app and why is it useful?">What sandbox restrictions are active?</button>
      <button class="suggestion-btn" data-prompt="How would I extend this chatbot to work as a Slack bot?">How do I extend this to a Slack bot?</button>
    </div>
  `;
  messagesEl.appendChild(emptyState);
  document.querySelectorAll(".session-item").forEach(el => el.classList.remove("active"));
  inputEl.focus();
});

/* ── Boot ───────────────────────────────────────────────────────────── */
void loadAgents();
void loadSessions();
inputEl.focus();
