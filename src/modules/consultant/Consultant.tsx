import * as React from 'react';
import { MessageSquare, Send, Sparkles, User, Bot } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Avatar } from '../../shared/components/Avatar';
import { cn } from '../../shared/utils/cn';

const MOCK_MESSAGES = [
  { id: 1, role: 'assistant', content: 'Hello! I am your PostHub AI Consultant. How can I help you optimize your content strategy today?' },
  { id: 2, role: 'user', content: 'Can you suggest some content ideas for a tech agency on Instagram?' },
  { id: 3, role: 'assistant', content: 'Certainly! For a tech agency, you should focus on demonstrating expertise and humanizing your team. Here are 3 ideas:\n1. "Behind the Code": Show a time-lapse of a developer working.\n2. "Tech Mythbusting": Short reels debunking common tech misconceptions.\n3. "Client Success Stories": Carousel posts showing the transformation you provided.' },
];

export const Consultant = () => {
  const [messages, setMessages] = React.useState(MOCK_MESSAGES);
  const [input, setInput] = React.useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newUserMessage = { id: Date.now(), role: 'user', content: input };
    setMessages([...messages, newUserMessage]);
    setInput('');

    // Mock assistant response
    setTimeout(() => {
      const assistantMessage = { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: "That's a great question! I'm analyzing your profile data to give you the best advice..." 
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-brand" />
          AI Consultant
        </h1>
        <p className="text-text-secondary">Your personal content strategist, powered by AI.</p>
      </div>

      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "flex gap-4 max-w-[80%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'assistant' ? "bg-brand text-white" : "bg-gray-200 text-gray-600"
              )}>
                {msg.role === 'assistant' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className={cn(
                "rounded-2xl p-4 text-sm leading-relaxed",
                msg.role === 'assistant' ? "bg-gray-50 text-text-primary" : "bg-brand text-white"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything about your strategy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-text-secondary">
            <Sparkles className="h-3 w-3 text-brand" />
            AI can make mistakes. Verify important information.
          </div>
        </form>
      </Card>
    </div>
  );
};
