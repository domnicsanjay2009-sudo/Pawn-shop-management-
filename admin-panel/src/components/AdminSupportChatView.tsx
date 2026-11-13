import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Building,
  User,
  Clock,
  Shield,
  Loader2,
  CheckCheck
} from 'lucide-react';
import {
  SupportConversation,
  ChatMessage,
  subscribeToSupportConversations,
  subscribeToConversationMessages,
  sendAdminSupportMessage
} from '../services/adminDataService';

export const AdminSupportChatView: React.FC = () => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToSupportConversations((list) => {
      setConversations(list);
      setSelectedShopId((prev) => prev || (list.length > 0 ? list[0].shopId : null));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedShopId) return;
    const unsub = subscribeToConversationMessages(selectedShopId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsub();
  }, [selectedShopId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedShopId || sending) return;

    setSending(true);
    const ok = await sendAdminSupportMessage(selectedShopId, replyText.trim());
    setSending(false);
    if (ok) {
      setReplyText('');
    }
  };

  const selectedConv = conversations.find((c) => c.shopId === selectedShopId);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-[#0B1528] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
      {/* Conversations List (Left) */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-[#080E1C]/50">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Customer Care Channels</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {conversations.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No support conversations active.
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = c.shopId === selectedShopId;
              return (
                <button
                  key={c.shopId}
                  onClick={() => setSelectedShopId(c.shopId)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer flex flex-col gap-1 ${
                    isSelected ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-xs truncate">
                      {c.shopName || c.shopId}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.lastSenderRole === 'shop_owner' && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold animate-pulse">
                          NEW
                        </span>
                      )}
                      {(c.lastMessageAt || c.lastUpdated) && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.lastMessageAt || c.lastUpdated!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-blue-300 font-mono font-medium truncate">
                      {c.ownerEmail || c.shopId}
                    </p>
                    {c.ownerName && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                        {c.ownerName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {c.lastMessage || 'Channel established'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Thread (Right) */}
      <div className="flex-1 flex flex-col bg-[#0B1528]">
        {selectedShopId ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-800 bg-[#080E1C]/30 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">
                  {selectedConv?.shopName || selectedShopId}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                  {selectedConv?.ownerName && (
                    <span className="text-slate-300 font-medium">{selectedConv.ownerName}</span>
                  )}
                  {selectedConv?.ownerEmail && (
                    <span className="text-blue-300 font-mono">{selectedConv.ownerEmail}</span>
                  )}
                  <span className="font-mono text-slate-500">ID: {selectedShopId}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Desk
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No messages exchanged in this conversation yet.
                </div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.senderRole === 'platform_admin' || m.senderType === 'admin';
                  const senderIdentity = isAdmin
                    ? m.senderEmail
                      ? `Platform Support (${m.senderEmail})`
                      : 'Platform Support'
                    : m.senderEmail || selectedConv?.ownerEmail
                    ? `${m.senderName || selectedConv?.ownerName || 'Shop Owner'} (${m.senderEmail || selectedConv?.ownerEmail})`
                    : m.senderName || 'Shop Staff';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                        {senderIdentity} &bull;{' '}
                        {new Date(m.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                            : 'bg-[#080E1C] border border-slate-800 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        {m.messageText}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-[#080E1C]/50 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type administrator response..."
                className="flex-1 px-4 py-2.5 bg-[#050811] border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/20"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Reply</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            Select a shop conversation to begin messaging.
          </div>
        )}
      </div>
    </div>
  );
};
