// src/app/inbox/page.tsx

"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FiInbox, FiSend, FiUser, FiMessageSquare } from "react-icons/fi";

// ... (Tipler burada aynı kalıyor: Marketplace, Customer, Conversation, Message)
type Marketplace = { id: number; name: string };
type Customer = {
  id: number;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  source: string | null;
  marketplace_id: number;
};
type Conversation = {
  id: number;
  subject: string | null;
  status: string;
  customers: { full_name: string } | null;
};
type Message = {
  id: number;
  content: string | null;
  sender_type: "customer" | "agent";
  sent_at: string;
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function fetchConversations() {
      setLoadingConversations(true);
      const { data, error } = await supabase
        .from("conversations")
        .select(`*, customers (full_name)`);
      if (data) setConversations(data as any);
      setLoadingConversations(false);
    }
    fetchConversations();
  }, []);

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setMessages([]);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: true });
    if (data) setMessages(data);
    setLoadingMessages(false);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    const { data } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        content: newMessage,
        sender_type: "agent",
      })
      .select()
      .single();
    if (data) {
      setMessages((currentMessages) => [...currentMessages, data]);
      setNewMessage("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 text-slate-800">
      {/* Sol Panel: Konuşma Listesi */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 font-bold text-lg border-b border-slate-200 shrink-0 flex items-center gap-2 text-slate-600">
          <FiInbox /> Gelen Kutusu
        </div>
        <div className="overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-center text-slate-500">Yükleniyor...</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleConversationSelect(conv)}
                className={`p-4 cursor-pointer hover:bg-slate-100 border-b border-slate-200 transition-colors ${
                  selectedConversation?.id === conv.id
                    ? "bg-blue-600 text-white hover:bg-blue-600"
                    : ""
                }`}
              >
                <div className="font-semibold">
                  {conv.customers?.full_name || "Bilinmeyen"}
                </div>
                <p
                  className={`text-sm truncate ${
                    selectedConversation?.id === conv.id
                      ? "text-blue-100"
                      : "text-slate-500"
                  }`}
                >
                  {conv.subject || "Konu Yok"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Orta Panel: Mesajlaşma Ekranı */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-slate-200 shadow-sm shrink-0">
              <h2 className="font-bold text-xl text-slate-700">
                {selectedConversation.customers?.full_name}
              </h2>
              <p className="text-sm text-slate-500">
                {selectedConversation.subject}
              </p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {loadingMessages ? (
                <div className="text-center text-slate-500">Yükleniyor...</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.sender_type === "agent"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-2xl ${
                        msg.sender_type === "agent"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-slate-200 text-slate-800 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-slate-200 flex gap-3 shrink-0 bg-slate-50"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Cevabınızı yazın..."
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <FiSend size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <FiMessageSquare size={64} />
            <p className="mt-4 text-lg">Görüntülemek için bir konuşma seçin</p>
          </div>
        )}
      </div>

      {/* Sağ Panel: Detay Bilgileri */}
      <div className="w-96 border-l border-slate-200 p-6 overflow-y-auto bg-slate-50">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <FiUser /> Müşteri Detayları
          </h2>
          {selectedConversation ? (
            <div className="space-y-2 mt-4 text-sm">
              <p>
                <span className="font-semibold text-slate-500">Müşteri:</span>{" "}
                {selectedConversation.customers?.full_name}
              </p>
              <p>
                <span className="font-semibold text-slate-500">Durum:</span>{" "}
                <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                  {selectedConversation.status}
                </span>
              </p>
              <div className="border-t border-slate-200 my-4"></div>
              <p className="text-xs text-slate-400">Sipariş ID: 1234567</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 mt-4">
              Henüz bir konuşma seçilmedi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
