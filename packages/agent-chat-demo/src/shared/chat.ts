export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export type ChatRequest = {
  message: string;
  history: ChatMessage[];
  mode: 'builder' | 'slack';
};

export type ChatResponse = {
  reply: string;
  sessionId?: string;
  trace: {
    workspace: string;
    sandboxed: boolean;
    loadedProjectConfig: boolean;
    activeAgent: string;
    mcpServers: string[];
  };
};
