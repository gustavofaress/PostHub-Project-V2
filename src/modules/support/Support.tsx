import * as React from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  Book, 
  Mail, 
  Search, 
  ChevronRight,
  ExternalLink,
  LifeBuoy
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';

const FAQS = [
  { question: 'How do I connect my Instagram account?', answer: 'Go to Settings > Integrations and click on the Instagram Connect button. Follow the Facebook OAuth flow to authorize PostHub.' },
  { question: 'What are AI credits?', answer: 'Credits are used for generating scripts, ideas, and using the AI Consultant. Different plans come with different monthly allowances.' },
  { question: 'Can I invite my clients to approve content?', answer: "Yes! Use the Approval module to generate a public link that you can share with anyone. They don't need an account to review." },
  { question: 'How do I cancel my subscription?', answer: "You can manage your subscription in Settings > Billing. You can cancel or downgrade at any time." },
];

export const Support = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">How can we help?</h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          Search our knowledge base or get in touch with our support team.
        </p>
        <div className="max-w-xl mx-auto pt-4">
          <Input 
            placeholder="Search for articles, guides, and more..." 
            className="h-14 text-lg shadow-lg border-none ring-1 ring-gray-200"
            icon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="text-center p-8 hover:border-brand/50 transition-all cursor-pointer group">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Book className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Knowledge Base</h3>
          <p className="text-sm text-text-secondary mb-6">Detailed guides and documentation for every feature.</p>
          <Button variant="outline" className="w-full gap-2">
            Browse Articles
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="text-center p-8 hover:border-brand/50 transition-all cursor-pointer group">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Live Chat</h3>
          <p className="text-sm text-text-secondary mb-6">Chat with our support team in real-time.</p>
          <Button variant="outline" className="w-full gap-2">
            Start Chat
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="text-center p-8 hover:border-brand/50 transition-all cursor-pointer group">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Mail className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Email Support</h3>
          <p className="text-sm text-text-secondary mb-6">Send us a ticket and we'll get back to you within 24h.</p>
          <Button variant="outline" className="w-full gap-2">
            Send Email
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-brand" />
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FAQS.map((faq) => (
            <Card key={faq.question} className="p-6">
              <h4 className="font-bold text-text-primary mb-3">{faq.question}</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{faq.answer}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-gray-900 text-white p-12 text-center border-none">
        <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
        <p className="text-white/70 mb-8 max-w-xl mx-auto">
          Our community forum is a great place to learn from other creators and social media managers.
        </p>
        <Button className="bg-brand hover:bg-brand/90 border-none px-8 h-12">
          Join the Community
        </Button>
      </Card>
    </div>
  );
};
