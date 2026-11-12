import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, type Message } from '../api/chat';
import './Chatbot.css';

const INITIAL_GREETING: Message = {
  role: 'assistant',
  content: `안녕하세요! 📚 영어 단어 퀴즈 챗봇입니다.

공부하고 싶은 **주제**(예: 여행, 비즈니스, 일상 대화, 토익)나 **난이도**(예: 초급, 중급, 고급)를 알려주세요.
주제에 맞는 핵심 영어 단어 3개와 짧은 복습 퀴즈를 준비해 드릴게요!`,
};

const QUICK_TOPICS = [
  '초급 여행 영어',
  '중급 비즈니스 회화',
  '고급 토익 빈출 단어',
  '초급 일상 대화',
  '중급 시사/뉴스 어휘',
];

export const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      // 프런트엔드에서는 src/api/chat.ts 의 sendChatMessage(/api/chat 호출)만 실행
      const botReply = await sendChatMessage(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: botReply }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg =
        err?.message || '답변을 불러오는 중 오류가 발생했습니다.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    if (window.confirm('대화 내용을 초기화하시겠습니까?')) {
      setMessages([INITIAL_GREETING]);
      setError(null);
      setInput('');
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-card">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-icon" aria-hidden="true">
              📖
            </div>
            <div>
              <h1 className="chat-header-title">영어 단어 퀴즈 챗봇</h1>
              <p className="chat-header-subtitle">OpenAI gpt-6-luna 기반 영어 학습 파트너</p>
            </div>
          </div>
          <button
            type="button"
            className="chat-reset-btn"
            onClick={handleReset}
            title="대화 초기화"
          >
            새로 시작
          </button>
        </header>

        {/* Quick Topics */}
        <div className="quick-topics">
          <span className="quick-topics-label">추천 주제:</span>
          {QUICK_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              className="topic-chip"
              disabled={isLoading}
              onClick={() => handleSend(topic)}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner" role="alert">
            <span>⚠️ {error}</span>
            <button
              type="button"
              className="error-close-btn"
              onClick={() => setError(null)}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message-row ${msg.role}`}>
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}

          {isLoading && (
            <div className="message-row assistant">
              <div className="message-bubble">
                <div className="loading-indicator">
                  <div className="dot-flashing" />
                  <span>단어와 퀴즈를 생성하고 있습니다...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          className="chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="주제(예: 여행, 비즈니스)나 난이도(초급/중급/고급) 또는 퀴즈 답을 입력하세요..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={isLoading || !input.trim()}
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;

