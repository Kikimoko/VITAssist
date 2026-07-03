import { useState, useEffect, useRef } from "react";
import { askAI } from "../../shared/ai/askAI.js";

export default function AskAITab() {

    const [messages, setMessages] = useState([]);

    const [input, setInput] = useState("");
    const bottomRef = useRef(null);
    useEffect(() => {

        bottomRef.current?.scrollIntoView({
    
            behavior: "smooth"
    
        });
    
    }, [messages]);

    async function sendMessage(prefilled = null) {

        const question =
            typeof prefilled === "string"
                ? prefilled
                : input.trim();
    
        if (!question) return;
    
        setMessages(prev => [
            ...prev,
            {
                role: "user",
                text: question
            },
            {
                role: "assistant",
                text: "Thinking..."
            }
        ]);
    
        setInput("");
    
        try {
    
            const answer = await askAI(question, messages);
    
            setMessages(prev => {
    
                const copy = [...prev];
    
                copy[copy.length - 1] = {
                    role: "assistant",
                    text: answer
                };
    
                return copy;
    
            });
    
        } catch (err) {
    
            console.error(err);
    
            setMessages(prev => {
    
                const copy = [...prev];
    
                copy[copy.length - 1] = {
                    role: "assistant",
                    text: "Error contacting Gemini."
                };
    
                return copy;
    
            });
    
        }
    
    }

    return (

        <div className="ai-root">

            <div className="ai-header">

                <h2>🤖 VITAssist AI</h2>

                <p>
                Powered by your downloaded notes.
                </p>

            </div>

            {messages.length === 0 && (

                <div className="ai-empty">

                    <h3>Ask anything from your notes</h3>

                    <div className="suggestion-grid">

                        {[
                            "Explain Deadlock",
                            "Best First Search",
                            "Difference between RSA and AES",
                            "Explain TCP Handshake"
                        ].map(prompt => (

                            <button
                                key={prompt}
                                className="suggestion-chip"
                                onClick={() => {
                                    setInput(prompt);
                                    sendMessage(prompt);
                                }}
                            >
                                💡 {prompt}
                            </button>

                        ))}

                    </div>

                </div>

            )}

            <div className="chat-area">

                {messages.map((msg, i) => (

                    <div
                        key={i}
                        className={
                            msg.role === "user"
                                ? "user-message"
                                : "ai-message"
                        }
                    >

                        {msg.text}

                    </div>

                ))}
                <div ref={bottomRef}></div>

            </div>

            <div className="chat-input">

                <textarea
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) =>
                        setInput(e.target.value)
                    }
                    onKeyDown={(e)=>{

                        if(e.key==="Enter" && !e.shiftKey){
                    
                            e.preventDefault();
                    
                            sendMessage();
                    
                        }
                    
                    }}
                />

                <button onClick={() => sendMessage()}>
                    Send
                </button>

            </div>

        </div>

    );

}