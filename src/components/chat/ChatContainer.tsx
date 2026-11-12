import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Headset,
  Bot,
  User,
  ShieldAlert,
  Loader2,
  Lock,
  CheckCheck,
  Clock,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useToast } from '../common/Toast';
import {
  subscribeToSupportMessages,
  sendCustomerMessage,
  generateClientMessageId,
  askGeminiCustomerCare
} from '../../services/chatService';
import { SupportMessage } from '../../types';
import { formatDateTime } from '../../utils/formatters';

const QUICK_SUPPORT_MESSAGES = [
  'Need assistance with my subscription plan.',
  'My payment is complete but plan is not activated.',
  'Please approve my shop account / new device.',
  'Need help setting up default interest rates.',
];

interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: number;
}

export const ChatContainer: React.FC = () => {
  const { currentUser, shopProfile, refreshProfile } = useAuth();
  const { isPremium } = useSubscription();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'standard' | 'ai'>('standard');

  // Standard Support Chat State
  const [serverMessages, setServerMessages] = useState<SupportMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<SupportMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingStandard, setSendingStandard] = useState(false);
  const [listenerError, setListenerError] = useState<string | null>(null);

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
  const standardInputRef = useRef<HTMLInputElement>(null);
  const activeShopId = shopProfile?.shopId || (currentUser ? `shop_${currentUser.uid}` : '');

  // Subscribe to real-time Admin replies
  useEffect(() => {
    if (!activeShopId) return;
    setListenerError(null);
    const unsub = subscribeToSupportMessages(
      activeShopId,
      (msgs) => {
        setServerMessages(msgs);
        setListenerError(null);
        // Clear pending messages once confirmed by server snapshot
        const confirmedClientIds = new Set(msgs.map((m) => m.clientMessageId).filter(Boolean));
        setPendingMessages((prev) =>
          prev.filter((pm) => !pm.clientMessageId || !confirmedClientIds.has(pm.clientMessageId))
        );
      },
      (err) => {
        setListenerError(err.message);
      }
    );
    return () => unsub();
  }, [activeShopId]);

  const displayedMessages = useMemo(() => {
    const confirmedClientIds = new Set(serverMessages.map((m) => m.clientMessageId).filter(Boolean));
    const unresolvedPending = pendingMessages.filter(
      (pm) => !pm.clientMessageId || !confirmedClientIds.has(pm.clientMessageId)
    );
    return [...serverMessages, ...unresolvedPending].sort((a, b) => a.timestamp - b.timestamp);
  }, [serverMessages, pendingMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages.length, aiMessages.length, activeTab]);

  const deliverMessage = async (text: string, clientMessageId: string) => {
    let targetShopId = activeShopId;
    let activeProfile = shopProfile;

    if (!targetShopId && currentUser) {
      try {
        activeProfile = await refreshProfile();
        targetShopId = activeProfile?.shopId || `shop_${currentUser.uid}`;
      } catch {
        // Handled cleanly in sendCustomerMessage or fallback below
      }
    }

    if (!targetShopId || !currentUser) {
      const msg = 'Please sign in to send support messages.';
      showToast(msg, 'error');
      return;
    }

    const authenticatedEmail = currentUser.email || activeProfile?.email || '';
    const resolvedOwnerName = activeProfile?.ownerName || currentUser.displayName || authenticatedEmail || 'Shop Owner';
    const resolvedShopName = activeProfile?.shopName || `${resolvedOwnerName}'s Pawn Shop`;

    const optimisticMsg: SupportMessage = {
      id: clientMessageId,
      conversationId: targetShopId,
      shopId: targetShopId,
      senderUid: currentUser.uid,
      senderEmail: authenticatedEmail,
      senderRole: 'shop_owner',
      senderType: 'customer',
      senderName: resolvedOwnerName,
      messageText: text,
      timestamp: Date.now(),
      clientMessageId,
      deliveryStatus: 'sending',
    };

    setPendingMessages((prev) => {
      const exists = prev.some((m) => m.clientMessageId === clientMessageId);
      if (exists) {
        return prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, deliveryStatus: 'sending', errorText: undefined }
            : m
        );
      }
      return [...prev, optimisticMsg];
    });

    setSendingStandard(true);
    try {
      await sendCustomerMessage(
        targetShopId,
        resolvedOwnerName,
        authenticatedEmail,
        resolvedShopName,
        text,
        clientMessageId
      );
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, deliveryStatus: 'sent' } : m
        )
      );
    } catch (err: any) {
      const errMsg = err?.message || 'Could not deliver message. Please retry.';
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, deliveryStatus: 'failed', errorText: errMsg }
            : m
        )
      );
      showToast(errMsg, 'error');
    } finally {
      setSendingStandard(false);
    }
  };

  const handleSendStandardMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || sendingStandard) return;

    const clientMessageId = generateClientMessageId();
    setInputMessage('');
    await deliverMessage(text, clientMessageId);
  };

  const handleRetryMessage = async (msg: SupportMessage) => {
    if (sendingStandard) return;
    await deliverMessage(msg.messageText, msg.clientMessageId || msg.id);
  };

  const handleSelectQuickMessage = (preset: string) => {
    setInputMessage(preset);
    standardInputRef.current?.focus();
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
          {/* Listener Error Banner if applicable */}
          {listenerError && (
            <div className="mx-4 mt-3 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{listenerError}</span>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            {displayedMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 max-w-md mx-auto">
                <Headset className="w-10 h-10 mx-auto mb-2 opacity-40 text-accent-600" />
                <h4 className="text-sm font-bold text-brand-950">Welcome to Customer Care</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Select a quick inquiry below or type your message. Our administrative team sees your verified email ({currentUser?.email || shopProfile?.email}) and replies in real time.
                </p>
              </div>
            ) : (
              displayedMessages.map((msg) => {
                const isCustomer = msg.senderType === 'customer' || msg.senderRole === 'shop_owner';
                const status = msg.deliveryStatus || 'sent';
                return (
                  <div
                    key={msg.clientMessageId || msg.id}
                    className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs text-xs sm:text-sm ${
                        isCustomer
                          ? status === 'failed'
                            ? 'bg-rose-900 text-white rounded-tr-none border border-rose-500'
                            : 'bg-brand-900 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="font-bold text-[11px] opacity-80">
                          {isCustomer ? `You (${msg.senderEmail || currentUser?.email || 'Shop Owner'})` : 'Admin Support'}
                        </span>
                        <span className="text-[10px] opacity-60 font-mono shrink-0">
                          {formatDateTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.messageText}</p>
                      {isCustomer && (
                        <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px]">
                          {status === 'sending' && (
                            <span className="inline-flex items-center gap-1 text-slate-300">
                              <Clock className="w-3 h-3 animate-pulse" />
                              <span>Sending...</span>
                            </span>
                          )}
                          {status === 'sent' && (
                            <span className="inline-flex items-center gap-1 text-emerald-300">
                              <CheckCheck className="w-3 h-3" />
                              <span>Sent</span>
                            </span>
                          )}
                          {status === 'failed' && (
                            <div className="flex items-center gap-2 text-rose-200">
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                <span>Failed</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRetryMessage(msg)}
                                disabled={sendingStandard}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Retry</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-Select Messages */}
          <div className="px-4 pt-2.5 pb-1 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Quick Select:
            </span>
            {QUICK_SUPPORT_MESSAGES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectQuickMessage(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                  inputMessage === preset
                    ? 'bg-accent-600 text-white border-accent-600 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-accent-400 hover:text-brand-950'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Standard Input Form */}
          <form
            onSubmit={handleSendStandardMessage}
            className="p-4 bg-white border-t border-slate-200 flex items-center space-x-3"
          >
            <input
              ref={standardInputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Select a topic above or type your message to Admin Support..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <button
              type="submit"
              disabled={sendingStandard || !inputMessage.trim()}
              className="px-5 py-3 bg-brand-900 hover:bg-brand-800 text-white rounded-xl shadow-md transition-all flex items-center space-x-2 text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {sendingStandard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">{sendingStandard ? 'Sending...' : 'Send'}</span>
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
