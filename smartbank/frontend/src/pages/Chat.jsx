import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";

const SESSION_ID = `session_${Date.now()}`;
const WELCOME = {
  role: "bot",
  text: "👋 Hello! I'm your **SmartBank** AI assistant.\n\nI can help with:\n• 💰 Account balance\n• 📋 Transactions\n• 🏦 Loans & EMI\n• 🎁 Rewards\n• 💳 Card management\n• 📊 Interest rates\n\nWhat can I do for you?",
  ts: Date.now(),
};
const QUICK = ["💰 My balance","📋 Recent transactions","🏦 Loan details","🎁 My rewards","📊 Interest rates","💳 Block my card","🧑‍💼 Talk to agent","🚨 Report fraud"];

function renderText(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2,-2)}</strong>
      : p
  );
}

function Bubble({ msg }) {
  const isBot = msg.role === "bot";
  return (
    <div className={`msg ${isBot ? "bot" : "user"}`}>
      <div className={`bubble ${isBot ? "bot-bubble" : "user-bubble"}`}>
        {msg.text.split("\n").map((line, i, arr) => (
          <span key={i}>{renderText(line)}{i < arr.length-1 && <br />}</span>
        ))}
        <span className="msg-time">
          {new Date(msg.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
        </span>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="msg bot">
      <div className="typing-bubble"><span/><span/><span/></div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = useCallback(async (text) => {
    const msg = text.trim();
    if (!msg) return;
    setMessages(prev => [...prev, { role:"user", text: msg, ts: Date.now() }]);
    setInput(""); setTyping(true); setShowQuick(false);
    try {
      const res = await api.post("/chat/message", { message: msg, session_id: SESSION_ID });
      for (let i = 0; i < res.data.replies.length; i++) {
        await new Promise(r => setTimeout(r, i * 400));
        setMessages(prev => [...prev, { role:"bot", text: res.data.replies[i], ts: Date.now() }]);
      }
    } catch {
      setMessages(prev => [...prev, { role:"bot", text:"⚠️ Connection error. Please try again.", ts: Date.now() }]);
    } finally { setTyping(false); }
  }, []);

  return (
    <div className="chat-page">
      <div className="chat-header-bar">
        <div className="chat-status-dot" />
        <span className="chat-title">SmartBank Assistant</span>
        <span className="chat-online">Online</span>
        <button className="btn-clear-chat" onClick={() => { setMessages([WELCOME]); setShowQuick(true); }}>
          🗑 Clear
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((m,i) => <Bubble key={i} msg={m} />)}
        {typing && <Typing />}
        <div ref={bottomRef} />
      </div>

      {showQuick && (
        <div className="quick-chips">
          {QUICK.map(q => (
            <button key={q} className="chip" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}

      <form className="chat-input-row" onSubmit={e => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Ask about balance, loans, transactions..." disabled={typing} autoFocus />
        <button type="submit" disabled={!input.trim() || typing} className="send-btn">➤</button>
      </form>
    </div>
  );
}
