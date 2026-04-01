import * as React from 'react';
import { 
  CreditCard, 
  Zap, 
  History, 
  ArrowUpRight, 
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { cn } from '../../shared/utils/cn';

const TRANSACTIONS = [
  { id: '1', type: 'Purchase', amount: '+500 credits', date: '2024-03-25', status: 'completed' },
  { id: '2', type: 'Usage', amount: '-10 credits', date: '2024-03-24', status: 'completed', detail: 'Script Generation' },
  { id: '3', type: 'Usage', amount: '-25 credits', date: '2024-03-23', status: 'completed', detail: 'AI Consultant Chat' },
  { id: '4', type: 'Monthly Refill', amount: '+1000 credits', date: '2024-03-01', status: 'completed' },
];

export const Credits = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-brand" />
            Credits & Usage
          </h1>
          <p className="text-text-secondary">Manage your AI generation credits and billing history.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Buy Credits
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-brand text-white border-none relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-sm text-white/80 mb-1">Available Credits</p>
            <h2 className="text-4xl font-bold mb-6">1,240</h2>
            <div className="flex items-center gap-2 text-xs font-medium bg-white/20 rounded-full px-3 py-1 w-fit">
              <TrendingUp className="h-3 w-3" />
              +15% from last month
            </div>
          </div>
          <Zap className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-white/10 rotate-12" />
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">Next Refill</p>
            <h2 className="text-2xl font-bold text-text-primary">April 1st, 2024</h2>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">Monthly Allowance</span>
              <span className="text-xs font-bold text-text-primary">1,000 credits</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-full bg-brand" />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">Auto-Refill</p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-text-primary">Disabled</h2>
              <Badge variant="default">OFF</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4">Enable Auto-Refill</Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction History */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <CardTitle>Transaction History</CardTitle>
            <Button variant="ghost" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {TRANSACTIONS.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    t.amount.startsWith('+') ? "bg-green-100 text-green-600" : "bg-brand/10 text-brand"
                  )}>
                    {t.amount.startsWith('+') ? <Plus className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{t.type}</p>
                    <p className="text-xs text-text-secondary">{t.detail || t.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    t.amount.startsWith('+') ? "text-green-600" : "text-text-primary"
                  )}>
                    {t.amount}
                  </p>
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Credit Packs */}
        <div className="space-y-6">
          <Card>
            <CardTitle className="mb-4">Need more credits?</CardTitle>
            <div className="space-y-3">
              {[
                { name: 'Starter Pack', amount: '500', price: '$9.99' },
                { name: 'Growth Pack', amount: '2,000', price: '$29.99', popular: true },
                { name: 'Agency Pack', amount: '10,000', price: '$99.99' },
              ].map(pack => (
                <div key={pack.name} className={cn(
                  "relative p-4 rounded-xl border transition-all cursor-pointer group",
                  pack.popular ? "border-brand bg-brand/5" : "border-gray-100 hover:border-brand/50"
                )}>
                  {pack.popular && (
                    <Badge className="absolute top-[-10px] right-4 bg-brand text-white border-none text-[10px]">
                      MOST POPULAR
                    </Badge>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-text-primary">{pack.name}</span>
                    <span className="text-sm font-bold text-brand">{pack.price}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">{pack.amount} credits</span>
                    <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-brand transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-gray-900 text-white border-none">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <h3 className="font-bold">Usage Alert</h3>
            </div>
            <p className="text-sm text-white/70 mb-4">
              You've used 80% of your monthly credits. Enable auto-refill to ensure your workflow is never interrupted.
            </p>
            <Button className="w-full bg-brand hover:bg-brand/90 border-none">Upgrade Now</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
