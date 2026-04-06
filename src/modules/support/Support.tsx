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
  { question: 'Como eu conecto minha conta do Instagram?', answer: 'Vá em Configurações > Integrações e clique no botão de conectar Instagram. Depois, siga o fluxo de autenticação do Facebook para autorizar o PostHub.' },
  { question: 'O que são créditos de IA?', answer: 'Os créditos são usados para gerar roteiros, ideias e utilizar o Consultor de IA. Cada plano inclui uma quantidade mensal diferente.' },
  { question: 'Posso convidar meus clientes para aprovar conteúdo?', answer: 'Sim! Use o módulo de Aprovação para gerar um link público que pode ser compartilhado com qualquer pessoa. Ela não precisa ter conta para revisar.' },
  { question: 'Como eu cancelo minha assinatura?', answer: 'Você pode gerenciar sua assinatura em Configurações > Cobrança. É possível cancelar ou fazer downgrade a qualquer momento.' },
];

export const Support = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Como podemos ajudar?</h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          Pesquise na nossa base de conhecimento ou entre em contato com o nosso time de suporte.
        </p>
        <div className="max-w-xl mx-auto pt-4">
          <Input 
            placeholder="Busque por artigos, guias e mais..." 
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
          <h3 className="text-xl font-bold text-text-primary mb-2">Base de Conhecimento</h3>
          <p className="text-sm text-text-secondary mb-6">Guias detalhados e documentação para cada funcionalidade.</p>
          <Button variant="outline" className="w-full gap-2">
            Ver Artigos
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="text-center p-8 hover:border-brand/50 transition-all cursor-pointer group">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Chat ao Vivo</h3>
          <p className="text-sm text-text-secondary mb-6">Converse com nosso time de suporte em tempo real.</p>
          <Button variant="outline" className="w-full gap-2">
            Iniciar Chat
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="text-center p-8 hover:border-brand/50 transition-all cursor-pointer group">
          <div className="h-14 w-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Mail className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Suporte por E-mail</h3>
          <p className="text-sm text-text-secondary mb-6">Envie um chamado e responderemos em até 24h.</p>
          <Button variant="outline" className="w-full gap-2">
            Enviar E-mail
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-brand" />
          Perguntas Frequentes
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
        <h2 className="text-3xl font-bold mb-4">Ainda precisa de ajuda?</h2>
        <p className="text-white/70 mb-8 max-w-xl mx-auto">
          Nosso fórum da comunidade é um ótimo lugar para aprender com outros criadores e social media managers.
        </p>
        <Button className="bg-brand hover:bg-brand/90 border-none px-8 h-12">
          Entrar na Comunidade
        </Button>
      </Card>
    </div>
  );
};
