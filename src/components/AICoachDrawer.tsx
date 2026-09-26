// ============================================================
// PlacementOS — AI Coach Interactive Drawer
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Clock,
  ArrowRight,
  ChevronUp,
} from 'lucide-react';
import { aiService } from '../services/ai.service';
import type { CoachMessage } from '../types';

export default function AICoachDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'init_1',
      role: 'assistant',
      content:
        '👋 Hi! I am your **Placement Coach**. I have access to your Placement Twin, resume claims, assessment scores, and recent simulation performance.\n\nHow can I help accelerate your placement readiness today?',
      suggested_actions: [
        { label: '⚡ I have 45 minutes today. What should I study?', action_type: 'study_topic', payload: '45 min plan' },
        { label: '🎯 Analyze my highest-priority root cause gaps', action_type: 'navigate', payload: '/weaknesses' },
        { label: '🚀 Launch AI Placement Simulation', action_type: 'navigate', payload: '/simulation' },
      ],
      timestamp: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: CoachMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await aiService.coachStudent({
        query,
        history: messages,
      });
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered a brief issue connecting. You can explore your recommended study plan directly in the Preparation Plan tab.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: { label: string; action_type: string; payload: string }) => {
    if (action.action_type === 'navigate') {
      navigate(action.payload);
      setIsOpen(false);
    } else if (action.action_type === 'simulate') {
      navigate('/simulation');
      setIsOpen(false);
    } else if (action.action_type === 'start_test') {
      navigate('/assessment');
      setIsOpen(false);
    } else {
      handleSend(action.label);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-accent to-accent-light text-white font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-105 transition-all duration-200 border border-white/20 animate-pulse"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-sm">Ask AI Coach</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>
        )}
      </div>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-bg-secondary border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-card/50 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-light">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  PlacementOS Coach
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                    Online
                  </span>
                </h3>
                <p className="text-xs text-text-muted">Twin-Aware Readiness Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Preset Prompts */}
          <div className="px-4 py-2 bg-bg-tertiary/40 border-b border-border/50 flex gap-2 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => handleSend('I have 45 minutes today. What should I do?')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-card hover:bg-accent/10 hover:text-accent-light border border-border transition-colors whitespace-nowrap text-text-secondary"
            >
              <Clock size={12} />
              <span>45-Min Sprint</span>
            </button>
            <button
              onClick={() => handleSend('Why do I keep getting tree and graph questions wrong?')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-card hover:bg-accent/10 hover:text-accent-light border border-border transition-colors whitespace-nowrap text-text-secondary"
            >
              <span>🌲 Tree Gaps</span>
            </button>
            <button
              onClick={() => handleSend('How do I prepare for System Design in technical round?')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-card hover:bg-accent/10 hover:text-accent-light border border-border transition-colors whitespace-nowrap text-text-secondary"
            >
              <span>🏗️ System Design</span>
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-light flex-shrink-0 mt-0.5">
                    <Bot size={15} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-accent text-white rounded-br-none'
                      : 'bg-bg-card border border-border text-text-primary rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Suggested Actions if any */}
                  {m.suggested_actions && m.suggested_actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                        Suggested Actions:
                      </p>
                      {m.suggested_actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleActionClick(act)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-bg-secondary hover:bg-accent/15 border border-border/80 text-accent-light text-xs font-medium transition-colors text-left"
                        >
                          <span>{act.label}</span>
                          <ArrowRight size={12} className="flex-shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-bg-card border border-border flex items-center justify-center text-text-secondary flex-shrink-0 mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-center">
                <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-accent-light flex-shrink-0">
                  <Bot size={15} />
                </div>
                <div className="bg-bg-card border border-border rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-text-muted flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]"></div>
                  <span>Analyzing Placement Twin data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 border-t border-border bg-bg-card/30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask advice, timing strategy, or concept help..."
                className="flex-1 bg-bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-accent hover:bg-accent-light disabled:opacity-50 text-white transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
