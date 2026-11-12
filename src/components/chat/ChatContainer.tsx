import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Headset,
  Bot,
  User,
  ShieldAlert,
  Loader2,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useToast } from '../common/Toast';
import {
  subscribeToSupportMessages,
  sendCustomerMessage,
  askGeminiCustomerCare
} from '../../services/chatService';
import { SupportMessage } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: number;
}

export const ChatContainer: React.FC = () => {
  const { shopProfile } = useAuth();
  const { isPremium } = useSubscription();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'standard' | 'ai'>('standard');

  // Standard Support Chat State
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingStandard, setSendingStandard] = useState(false);

  // AI Support Chat State (Gated to Premium)
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome_ai',
      sender: 'ai',
      text: "Hello! I am your AI Support Assistant. I can help guide you on how to use Pawn Shop Management features, create bills, record payments, calculate interest, and configure local app lock. What would you like to ask?",
      time: Date.now(),
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [askingAi, setAskingAi] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time Admin replies
  useEffect(() => {
    if (shopProfile?.shopId) {
      const unsub = subscribeToSupportMessages(shopProfile.shopId, (msgs) => {
        setMessages(msgs);
      });
      return () => unsub();
    }
  }, [shopProfile?.shopId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiMessages, activeTab]);

  const handleSendStandardMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !shopProfile) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSendingStandard(true);

    try {
      await sendCustomerMessage(
        shopProfile.shopId,
        shopProfile.ownerName,
        shopProfile.email,
        shopProfile.shopName,
        text
      );
    } catch (err: any) {
      showToast('Could not send message. Please retry.', 'error');
    } finally {
      setSendingStandard(false);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    if (!isPremium) {
      showToast('AI Customer Care is an exclusive feature of the Yearly Premium Plan.', 'warning');
      return;
    }

    const question = aiInput.trim();
    setAiInput('');

    // Append user question immediately
    setAiMessages((prev) => [
      ...prev,
      { id: `usr_${Date.now()}`, sender: 'user', text: question, time: Date.now() },
    ]);

    setAskingAi(true);
    const result = await askGeminiCustomerCare(question, isPremium);
    setAskingAi(false);

    if (result.error) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `Error: ${result.error}`,
          time: Date.now(),
        },
      ]);
    } else {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: result.text,
          time: Date.now(),
        },
      ]);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)] animate-fadeIn">
      {/* Top Header with Tab Selector */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-950 to-brand-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-accent-400" />
            <span>Customer Care & Support</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time assistance for your pawn shop management operations
          </p>
        </div>

        {/* Tab switch: Customer Care vs AI Customer Care (Premium) */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('standard')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'standard' ? 'bg-accent-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Headset className="w-3.5 h-3.5" />
            <span>Admin Care</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ai' ? 'bg-accent-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Customer Care</span>
            {!isPremium && <Lock className="w-3 h-3 text-slate-400 ml-1" />}
          </button>
        </div>
      </div>

      {/* Standard Human/Admin Care View */}
      {activeTab === 'standard' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Messages Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 max-w-sm mx-auto">
                <Headset className="w-10 h-10 mx-auto mb-2 opacity-40 text-accent-600" />
                <h4 className="text-sm font-bold text-brand-950">Welcome to Customer Care</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Type your inquiry below. Our administrative team receives your messages directly and replies in real time.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.senderType === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs text-xs sm:text-sm ${
                        isCustomer
                          ? 'bg-brand-900 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-[11px] opacity-75">
                          {isCustomer ? 'You (Shop Owner)' : 'Admin Support'}
                        </span>
                        <span className="text-[10px] opacity-50 font-mono">
                          {formatDateTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.messageText}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Standard Input Form */}
          <form
            onSubmit={handleSendStandardMessage}
            className="p-4 bg-white border-t border-slate-200 flex items-center space-x-3"
          >
            <input
              type="text"
              required
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask an administrative question or report an issue..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <button
              type="submit"
              disabled={sendingStandard}
              className="px-5 py-3 bg-brand-900 hover:bg-brand-800 text-white rounded-xl shadow-md transition-all flex items-center space-x-2 text-xs font-bold disabled:opacity-70 cursor-pointer"
            >
              {sendingStandard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}

      {/* AI Customer Care View (Gated to Premium) */}
      {activeTab === 'ai' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {!isPremium ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-brand-950">
                Premium AI Customer Care
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                Live AI Customer Care powered by Gemini is available exclusively to Yearly Premium subscribers.
                Upgrade your subscription to get 24/7 instant guidance for all your pawn shop workflows.
              </p>
            </div>
          ) : (
            <>
              {/* Disclaimer */}
              <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                <span>
                  <strong>AI Assistant:</strong> Answers usage queries instantly. No private customer records are ever sent to Gemini.
                </span>
                <span className="bg-blue-200/60 font-semibold px-2 py-0.5 rounded text-[10px]">
                  AI Generated
                </span>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {aiMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs text-xs sm:text-sm ${
                          isUser
                            ? 'bg-accent-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-bold text-[11px] opacity-75">
                            {isUser ? 'You' : 'Gemini AI Assistant'}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                {askingAi && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs flex items-center space-x-2 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-600" />
                      <span>Gemini is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Question Form */}
              <form
                onSubmit={handleAskAI}
                className="p-4 bg-white border-t border-slate-200 flex items-center space-x-3"
              >
                <input
                  type="text"
                  required
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask a question about adding bills, interest calculations, settings..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <button
                  type="submit"
                  disabled={askingAi}
                  className="px-5 py-3 bg-accent-600 hover:bg-accent-500 text-white rounded-xl shadow-md transition-all flex items-center space-x-2 text-xs font-bold disabled:opacity-70 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};
