import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

/**
 * 영어 단어 퀴즈 챗봇 시스템 프롬프트 (수정이 용이하도록 상수로 분리)
 */
export const SYSTEM_PROMPT = `당신은 친절하고 명확한 '영어 단어 퀴즈 챗봇'입니다.
다음 규칙을 엄격히 준수하여 사용자와 대화하세요:

1. 언어 및 어조:
- 모든 설명과 안내, 퀴즈는 한국어로 간결하게 작성하세요.
- 친절하고 격려하는 태도를 유지하세요.

2. 주제 및 난이도 확인:
- 사용자가 원하는 학습 주제(예: 여행, 비즈니스, 일상 대화, 토익 등)나 난이도(예: 초급, 중급, 고급 등)를 말하지 않았다면, 먼저 어떤 주제나 난이도의 단어를 배우고 싶은지 물어보세요.

3. 단어 제공 규칙:
- 사용자가 주제나 난이도를 제시했거나 단어 학습을 요청하면, 관련 영어 단어를 한 번에 최대 3개까지만 알려주세요.
- 각 단어에는 반드시 다음 세 가지를 포함해야 합니다:
  1) 영어 단어와 품사/발음 팁
  2) 알기 쉬운 한국어 뜻
  3) 짧고 실용적인 영어 예문과 한국어 해석

4. 복습 퀴즈 규칙:
- 단어 3개를 소개한 후, 마지막에는 방금 소개한 단어 중 하나를 활용한 짧은 복습 퀴즈를 반드시 '1개만' 출제하세요. (예: 빈칸 채우기, 객관식 퀴즈 등)
- 사용자가 퀴즈 답을 말하면 정답 여부를 알려주고, 짧은 해설과 칭찬 후 다음 학습 주제를 계속할지 물어보세요.
`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages?: ChatMessage[];
}

function sendResponse(
  res: VercelResponse,
  statusCode: number,
  data: { reply?: string; error?: string }
) {
  if (typeof (res as any).status === 'function' && typeof (res as any).json === 'function') {
    return (res as any).status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 및 프리플라이트 요청 처리
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: '허용되지 않는 메소드입니다 (POST만 지원).' });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return sendResponse(res, 500, {
      error: '서버 환경 변수에 OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local 파일에 API 키를 입력해 주세요.',
    });
  }

  const body = (req.body || {}) as ChatRequestBody;
  const messages = body.messages;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return sendResponse(res, 400, {
      error: '대화 메시지(messages) 배열이 올바르게 전달되지 않았습니다.',
    });
  }

  try {
    const openai = new OpenAI({ apiKey });

    // OpenAI Responses API 호출 (gpt-6-luna, reasoning.effort: 'none')
    const response = await openai.responses.create({
      model: 'gpt-6-luna',
      reasoning: {
        effort: 'none',
      },
      instructions: SYSTEM_PROMPT,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const reply = response.output_text?.trim() || '답변을 생성하지 못했습니다.';
    return sendResponse(res, 200, { reply });
  } catch (error: any) {
    console.error('OpenAI Responses API error:', error);
    const status = error?.status || 500;
    const message =
      error?.message || 'OpenAI API 호출 중 알 수 없는 오류가 발생했습니다.';
    return sendResponse(res, status, { error: message });
  }
}

