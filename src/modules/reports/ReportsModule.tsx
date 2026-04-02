import * as React from 'react';
import {
  Lightbulb,
  FileText,
  CalendarDays,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Activity,
  Download,
  Eye,
  Settings2,
  ChevronDown,
  TrendingUp,
  Star
} from 'lucide-react';

import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';

interface StatCard {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export const ReportsModule = () => {
  const { activeProfile } = useProfile();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = React.useState(true);

  const [period, setPeriod] = React.useState('30d');

  const [stats, setStats] = React.useState<StatCard[]>([
    { label: 'Ideias', value: '--', icon: Lightbulb },
    { label: 'Roteiros', value: '--', icon: FileText },
    { label: 'Posts Agendados', value: '--', icon: CalendarDays },
    { label: 'Pendentes', value: '--', icon: MessageSquare },
  ]);

  const loadData = async () => {
    if (!user?.id || !activeProfile?.id) return;

    setIsLoading(true);

    const { count: ideasCount } = await supabase
      .from('ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('profile_id', activeProfile.id);

    const { count: scriptsCount } = await supabase
      .from('script_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('profile_id', activeProfile.id);

    const { data: calendar } = await supabase
      .from('editorial_calendar')
      .select('*')
      .eq('user_id', user.id)
      .eq('profile_id', activeProfile.id);

    const scheduled = calendar?.filter((i) => i.scheduled_date).length || 0;
    const pending = calendar?.filter((i) => i.status === 'Review').length || 0;

    setStats([
      { label: 'Ideias', value: String(ideasCount || 0), icon: Lightbulb },
      { label: 'Roteiros', value: String(scriptsCount || 0), icon: FileText },
      { label: 'Posts Agendados', value: String(scheduled), icon: CalendarDays },
      { label: 'Pendentes', value: String(pending), icon: MessageSquare },
    ]);

    setIsLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, [user?.id, activeProfile?.id]);

  const exportPDF = async () => {
    const element = document.getElementById('report-preview');
    if (!element) return;

    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');

    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save('report.pdf');
  };

  if (isLoading) {
    return <div className="p-8 text-white/60">Carregando relatório...</div>;
  }

  return (
    <div className="flex h-full flex-col bg-bg-main">
      {/* HEADER */}
      <div className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-white/60">
            Gere relatórios profissionais para seus clientes
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2">
            <Eye className="w-4 h-4" />
            Visualizar
          </Button>

          <Button onClick={exportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex gap-8 p-8">
        {/* CONFIG */}
        <div className="w-80 space-y-6">
          <div className="bg-bg-surface p-6 rounded-xl border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Configuração
            </h2>

            <select
              className="w-full bg-bg-main border border-white/10 rounded-lg p-2 text-white"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
              <option value="month">Este mês</option>
            </select>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="flex-1 bg-white rounded-xl p-10 text-black" id="report-preview">
          <h1 className="text-3xl font-bold mb-6">
            Relatório - {activeProfile?.name}
          </h1>

          <div className="grid grid-cols-4 gap-4 mb-10">
            {stats.map((s) => (
              <div key={s.label} className="p-4 bg-gray-100 rounded-xl">
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <p className="text-gray-700 leading-relaxed">
            A operação de conteúdo apresenta consistência e previsibilidade.
            Recomenda-se manter a cadência atual e otimizar a conversão de ideias em roteiros.
          </p>
        </div>
      </div>
    </div>
  );
};
