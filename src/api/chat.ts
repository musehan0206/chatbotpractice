export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
}

export interface ChatResponse {
  reply?: string;
  error?: string;
}

/**
 * 서버리스 엔드포인트(/api/chat)로 대화 내역을 전송하고 AI 응답을 받아옵니다.
 */
export async function sendChatMessage(messages: Message[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const data: ChatResponse = await response.json().catch(() => ({
    error: '서버 응답을 해석할 수 없습니다.',
  }));

  if (!response.ok) {
    throw new Error(data.error || `서버 오류가 발생했습니다 (${response.status})`);
  }

  if (!data.reply) {
    throw new Error('응답 내용이 비어 있습니다.');
  }

  return data.reply;
}

