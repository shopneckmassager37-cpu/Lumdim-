
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Paperclip, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ChatMessage, Subject, Grade } from '../types.ts';
import { getChatResponseStream } from '../services/geminiService.ts';
import { GenerateContentResponse } from "@google/genai";
import LatexRenderer from './LatexRenderer.tsx';

interface ChatBotProps {
  subject: Subject | null;
  grade: Grade | null;
  userName?: string | null;
  initialMessage?: string | null;
  isTeacher?: boolean;
}

const CHAT_LOADING_MESSAGES = [
    "מקליד...",
    "חושב על תשובה...",
    "בודק בספרים...",
    "מנסח את המשפט...",
    "רגע אחד..."
];

const ChatBot: React.FC<ChatBotProps> = ({ subject, grade, userName, initialMessage, isTeacher }) => {
  const getIntroMessage = () => {
    if (!subject) {
      return `שלום המורה ${userName || 'אורח בדיקה'}! אני עוזר ההוראה הדיגיטלי שלך. איך אוכל לעזור לך היום בתכנון השיעור או בניסוח חומרים מקצועיים?`;
    }
    return isTeacher 
        ? `שלום המורה ${userName || ''}! אני עוזר ההוראה הדיגיטלי שלך. איך אוכל לעזור לך היום בתכנון השיעור או בניסוח חומרים מקצועיים ל${subject}?`
        : `שלום ${userName || ''}! אני המורה הפרטי שלך ל${subject}. איך אני יכול לעזור לך היום בחומר של ${grade}?`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'model',
      text: getIntroMessage(),
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [attachment, setAttachment] = useState<{file: File, preview: string} | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
       interval = setInterval(() => {
          setLoadingMsgIndex((prev) => (prev + 1) % CHAT_LOADING_MESSAGES.length);
       }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = async (overrideMessage?: string) => {
    const finalInput = overrideMessage || input;
    if ((!finalInput.trim() && !attachment) || isLoading) return;

    let attachmentData = undefined;
    if (attachment) {
      const base64Data = attachment.preview.split(',')[1];
      attachmentData = {
        mimeType: attachment.file.type,
        data: base64Data
      };
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: finalInput,
      timestamp: Date.now(),
      attachment: attachmentData
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => !m.attachment)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const stream = await getChatResponseStream(history, userMessage.text, subject || undefined, grade || undefined, attachmentData);
      
      let fullResponse = '';
      const botMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: botMessageId,
        role: 'model',
        text: '',
        timestamp: Date.now()
      }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponse += c.text;
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId ? { ...msg, text: fullResponse } : msg
          ));
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'סליחה, הייתה בעיה בתקשורת. נסה שוב מאוחר יותר.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialMessage && initialMessage !== autoSentRef.current) {
      autoSentRef.current = initialMessage;
      handleSend(initialMessage);
    }
  }, [initialMessage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          file: file,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 text-right" dir="rtl">
      <div className={`p-6 text-white flex items-center justify-between ${isTeacher ? 'bg-indigo-600' : 'bg-gradient-to-r from-accent to-purple-600'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
            {isTeacher ? <Sparkles size={24} /> : <Bot size={24} />}
          </div>
          <div>
            <h3 className="font-black text-lg">{isTeacher ? 'עוזר הוראה AI' : 'המורה הפרטי שלך'}</h3>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{subject || 'כללי'} • {isTeacher ? 'מצב מורה' : grade || 'כללי'}</p>
          </div>
        </div>
        <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase">מחובר</div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : (isTeacher ? 'bg-indigo-100 text-indigo-600' : 'bg-accent text-white')}`}>
              {msg.role === 'user' ? <User size={20} /> : (isTeacher ? <Sparkles size={20} /> : <Bot size={20} />)}
            </div>
            <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
              {msg.attachment && <div className="rounded-2xl overflow-hidden border-4 border-white shadow-md mb-2 max-w-[240px]"><img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="attachment" className="w-full h-auto" /></div>}
              {msg.text && (
                <div className={`p-5 rounded-[1.5rem] text-sm font-medium shadow-sm border ${msg.role === 'user' ? 'bg-primary text-white border-blue-400 rounded-tr-none' : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'}`}>
                  <LatexRenderer text={msg.text} />
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && <div className="flex items-center gap-3 text-gray-400 text-xs mr-14 animate-pulse font-bold bg-white/50 w-fit px-4 py-2 rounded-full shadow-sm border border-gray-50"><Loader2 className="animate-spin" size={14} /><span>{CHAT_LOADING_MESSAGES[loadingMsgIndex]}</span></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        {attachment && <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-2xl w-fit border border-gray-200 shadow-inner animate-slide-up"><div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden shadow-sm"><img src={attachment.preview} alt="preview" className="w-full h-full object-cover" /></div><button onClick={removeAttachment} className="text-gray-400 hover:text-red-500 p-2"><X size={18} /></button></div>}
        <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-[1.75rem] border border-gray-200 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
          <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-indigo-600 transition-colors"><Paperclip size={22} /></button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
            placeholder={isTeacher ? "שאל כל שאלה..." : "שאל שאלה..."} 
            className="flex-1 p-3 bg-transparent border-none focus:outline-none resize-none max-h-32 min-h-[44px] font-bold text-sm text-right" 
            dir="rtl"
            rows={1} 
            disabled={isLoading} 
          />
          <button onClick={() => handleSend()} disabled={(!input.trim() && !attachment) || isLoading} className={`p-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 disabled:bg-gray-200 disabled:shadow-none ${isTeacher ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-accent hover:bg-accent/90'} text-white`}>
            <Send size={20} className={`transform rotate-180 ${isLoading ? 'opacity-0' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
