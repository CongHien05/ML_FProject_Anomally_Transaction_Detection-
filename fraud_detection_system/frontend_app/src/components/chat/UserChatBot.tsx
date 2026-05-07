import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, Send, User, X } from 'lucide-react';
import { chatWithAssistant } from '../../services/api';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const suggestedQuestions = [
  'Cho toi xem day du lich su giao dich cua toi',
  'Toi da chuyen tien khi nao va cho ai?',
  'So du va thong tin tai khoan hien tai cua toi la gi?',
  'Co giao dich nao dang pending hoac bi chan khong?',
];

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Chao! Minh la AI tra cuu noi bo. Minh chi tra loi du lieu tai khoan, so du, lich su giao dich va canh bao cua chinh ban.',
  },
];

export const UserChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      inputRef.current?.focus();
    }, 50);
  }, [isOpen, messages]);

  const openChat = () => {
    setIsOpen(true);
  };

  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    const messageHistory = messages.map(({ role, content }) => ({ role, content }));
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput('');
    setIsSending(true);

    try {
      const answer = await chatWithAssistant({
        message: text,
        messageHistory,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'Khong the ket noi bot chat luc nay. Vui long thu lai sau.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <section className="flex h-[600px] w-[min(392px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[24px] border-2 border-slate-900 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
          <header className="flex items-center justify-between border-b-2 border-slate-900 bg-[#ff6a00] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white/15">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">AI Tra cuu noi bo</h2>
                <p className="text-xs text-white/90">Chi hoi thong tin cua chinh ban</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 text-white transition hover:bg-white/15"
              aria-label="Dong chat"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fffef8_0%,#f8fbff_100%)] px-3 py-3"
          >
            <div className="rounded-[18px] border-2 border-slate-900 bg-white px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm">
              <p className="font-semibold text-slate-900">Ban co the hoi:</p>
              <p>So du, lich su giao dich, giao dich gan nhat, pending, blocked, risk, nguoi nhan, so tien.</p>
            </div>

            {messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <div key={message.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-[#ffedd5] text-slate-900">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-[20px] px-4 py-3 text-sm leading-6 ${
                      isUser
                        ? 'border-2 border-slate-900 bg-slate-900 text-white'
                        : 'border-2 border-slate-900 bg-white text-slate-800'
                    }`}
                  >
                    {message.content}
                  </div>

                  {isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-200 text-slate-900">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dang tra cuu du lieu giao dich cua ban...
              </div>
            )}
          </div>

          <div className="border-t-2 border-slate-900 bg-white px-3 py-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  disabled={isSending}
                  className="shrink-0 rounded-full border-2 border-slate-900 bg-[#fff7ed] px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-[#ffedd5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {question}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Nhap cau hoi ve giao dich cua ban..."
                className="min-w-0 flex-1 rounded-[16px] border-2 border-slate-900 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#ff6a00]"
              />

              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-slate-900 bg-[#ff9f66] text-white transition hover:bg-[#ff6a00] disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Gui tin nhan"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={openChat}
        className="flex min-h-[58px] items-center gap-2 rounded-[18px] border-2 border-slate-900 bg-[#2563eb] px-4 text-white shadow-[0_14px_32px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
        aria-label="Mo chat tro ly"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-semibold">Nhan tin</span>
      </button>
    </div>
  );
};
