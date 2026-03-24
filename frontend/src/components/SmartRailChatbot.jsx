import { useEffect, useRef, useState } from "react";
import "./SmartRailChatbot.css";

const WEBHOOK_URL =
  import.meta.env.VITE_RASA_WEBHOOK_URL ||
  "http://localhost:5005/webhooks/rest/webhook";

const isLocalWebhookOnNonLocalHost =
  WEBHOOK_URL.includes("localhost") &&
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

function toBotMessages(payload) {
  if (!Array.isArray(payload)) return [];

  return payload.map((item) => ({
    sender: "bot",
    text: item?.text || "",
    buttons: Array.isArray(item?.buttons) ? item.buttons : [],
  }));
}

export default function SmartRailChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendToBot = async (outgoingText, userLabel = outgoingText) => {
    const trimmed = (outgoingText || "").trim();
    if (!trimmed) return;

    setChat((prev) => [...prev, { sender: "user", text: userLabel }]);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "website-user",
          message: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error(`Bot webhook failed with status ${response.status}`);
      }

      const data = await response.json();
      const botMessages = toBotMessages(data);

      if (botMessages.length === 0) {
        setChat((prev) => [
          ...prev,
          { sender: "bot", text: "I could not understand that. Please try again." },
        ]);
        return;
      }

      setChat((prev) => [...prev, ...botMessages]);
    } catch (err) {
      console.error("[SmartRailChatbot] Bot request failed", {
        webhookUrl: WEBHOOK_URL,
        error: err?.message || String(err),
      });

      const fallbackText = isLocalWebhookOnNonLocalHost
        ? "Assistant endpoint is set to localhost. Configure VITE_RASA_WEBHOOK_URL to your live bot URL."
        : "SmartRail assistant is currently unreachable.";

      setChat((prev) => [
        ...prev,
        { sender: "bot", text: fallbackText },
      ]);
    }
  };

  const handleSend = async () => {
    const outgoing = message;
    setMessage("");
    await sendToBot(outgoing, outgoing);
  };

  const handleQuickReply = async (payload, title) => {
    await sendToBot(payload, title || payload);
  };

  const closeAndReset = () => {
    setIsOpen(false);
    setMessage("");
    setChat([]);
  };

  return (
    <div className="sr-chatbot-root">
      {isOpen ? (
        <section className="sr-chatbot-panel" aria-label="SmartRail assistant chat">
          <header className="sr-chatbot-header">
            <div className="sr-chatbot-title-wrap">
              <img src="/chatbot.png" alt="SmartRail assistant" className="sr-chatbot-avatar" />
              <h3 className="sr-chatbot-title">SmartRail Assistant</h3>
            </div>
            <button
              type="button"
              className="sr-chatbot-close"
              onClick={closeAndReset}
              aria-label="Close chatbot"
            >
              x
            </button>
          </header>

          <div className="sr-chatbot-messages">
            {chat.length === 0 ? (
              <div className="sr-chatbot-empty">Ask me about routes, trains, and booking help.</div>
            ) : null}

            {chat.map((msg, idx) => (
              <div
                key={`${msg.sender}-${idx}`}
                className={msg.sender === "user" ? "sr-chat-row user" : "sr-chat-row bot"}
              >
                <div className={msg.sender === "user" ? "sr-bubble user" : "sr-bubble bot"}>
                  <p>{msg.text}</p>
                  {msg.buttons?.length ? (
                    <div className="sr-quick-replies">
                      {msg.buttons.map((btn, buttonIdx) => (
                        <button
                          key={`${btn.title || btn.payload || "btn"}-${buttonIdx}`}
                          type="button"
                          className="sr-quick-reply"
                          onClick={() => handleQuickReply(btn.payload, btn.title)}
                        >
                          {btn.title || "Select"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="sr-chatbot-input-wrap">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              className="sr-chatbot-input"
              placeholder="Type your message..."
              aria-label="Type a chatbot message"
            />
            <button type="button" onClick={handleSend} className="sr-chatbot-send">
              Send
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="sr-chatbot-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open SmartRail assistant"
        >
          <img src="/chatbot.png" alt="SmartRail assistant" className="sr-chatbot-launcher-icon" />
        </button>
      )}
    </div>
  );
}
