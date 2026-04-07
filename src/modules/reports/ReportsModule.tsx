import * as React from 'react';
import jsPDF from 'jspdf';
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

interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  time: string;
  status: 'success' | 'info' | 'warning';
  createdAt: string;
}

interface IdeaRow {
  id: string;
  title: string;
  updated_at: string;
}

interface ScriptDraftRow {
  id: string;
  title: string;
  updated_at: string;
}

interface EditorialCalendarRow {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  scheduled_date?: string | null;
}

interface ApprovalPostRow {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
}

type PeriodOption = '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

export const ReportsModule = () => {
  const { activeProfile } = useProfile();
  const { user } = useAuth();

  const reportPreviewRef = React.useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = React.useState<string | null>(null);

  const [period, setPeriod] = React.useState<PeriodOption>('30d');
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');

  const [sections, setSections] = React.useState({
    kpis: true,
    status: true,
    activity: true,
    insights: true,
    notes: true,
  });

  const [reportConfig, setReportConfig] = React.useState({
    clientName: activeProfile?.name || 'Nome do Cliente',
    reportName: 'Relatório de Desempenho',
    finalNotes: 'Obrigado pela parceria. Seguimos à disposição para dúvidas.',
  });

  React.useEffect(() => {
    if (activeProfile?.name) {
      setReportConfig((prev) => ({
        ...prev,
        clientName: activeProfile.name,
      }));
    }
  }, [activeProfile?.name]);

  const [stats, setStats] = React.useState<StatCard[]>([
    { label: 'Ideias', value: '--', icon: Lightbulb },
    { label: 'Roteiros', value: '--', icon: FileText },
    { label: 'Posts Agendados', value: '--', icon: CalendarDays },
    { label: 'Pendentes', value: '--', icon: MessageSquare },
  ]);

  const [recentActivity, setRecentActivity] = React.useState<DashboardActivityItem[]>([]);
  const [contentStatus, setContentStatus] = React.useState({
    inProduction: 0,
    pendingReview: 0,
    published: 0,
  });

  const loadReport = React.useCallback(async () => {
    if (!user?.id || !activeProfile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [ideasResult, scriptsResult, calendarResult, approvalsResult] = await Promise.all([
        supabase
          .from('ideas')
          .select('id,title,updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        supabase
          .from('script_drafts')
          .select('id,title,updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        supabase
          .from('editorial_calendar')
          .select('id,title,status,updated_at,scheduled_date', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        supabase
          .from('approval_posts')
          .select('id,title,status,updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),
      ]);

      if (ideasResult.error) throw ideasResult.error;
      if (scriptsResult.error) throw scriptsResult.error;
      if (calendarResult.error) throw calendarResult.error;
      if (approvalsResult.error) throw approvalsResult.error;

      const ideas = (ideasResult.data ?? []) as IdeaRow[];
      const scripts = (scriptsResult.data ?? []) as ScriptDraftRow[];
      const calendar = (calendarResult.data ?? []) as EditorialCalendarRow[];
      const approvals = (approvalsResult.data ?? []) as ApprovalPostRow[];

      const scheduledPostsCount = calendar.filter((item) => item.scheduled_date).length;
      const pendingReviewsCount =
        calendar.filter((item) => item.status === 'Review').length +
        approvals.filter(
          (item) => item.status === 'changes_requested' || item.status === 'pending'
        ).length;

      setStats([
        {
          label: 'Ideias',
          value: String(ideasResult.count ?? ideas.length),
          icon: Lightbulb,
        },
        {
          label: 'Roteiros',
          value: String(scriptsResult.count ?? scripts.length),
          icon: FileText,
        },
        {
          label: 'Posts Agendados',
          value: String(scheduledPostsCount),
          icon: CalendarDays,
        },
        {
          label: 'Pendentes',
          value: String(pendingReviewsCount),
          icon: MessageSquare,
        },
      ]);

      setContentStatus({
        inProduction: calendar.filter((item) =>
          ['Draft', 'Planned'].includes(item.status || '')
        ).length,
        pendingReview: calendar.filter((item) => item.status === 'Review').length,
        published: calendar.filter((item) => item.status === 'Published').length,
      });

      const activity: DashboardActivityItem[] = [];

      ideas.slice(0, 5).forEach((item) => {
        activity.push({
          id: `idea-${item.id}`,
          type: 'Ideia',
          title: `Nova ideia: "${item.title}"`,
          time: formatDate(item.updated_at),
          status: 'info',
          createdAt: item.updated_at,
        });
      });

      scripts.slice(0, 5).forEach((item) => {
        activity.push({
          id: `script-${item.id}`,
          type: 'Roteiro',
          title: `Roteiro atualizado: "${item.title}"`,
          time: formatDate(item.updated_at),
          status: 'info',
          createdAt: item.updated_at,
        });
      });

      calendar.slice(0, 5).forEach((item) => {
        activity.push({
          id: `calendar-${item.id}`,
          type: 'Post',
          title:
            item.status === 'Published'
              ? `${item.title} foi publicado`
              : `${item.title} atualizado`,
          time: formatDate(item.updated_at),
          status:
            item.status === 'Published'
              ? 'success'
              : item.status === 'Review'
              ? 'warning'
              : 'info',
          createdAt: item.updated_at,
        });
      });

      approvals.slice(0, 5).forEach((item) => {
        activity.push({
          id: `approval-${item.id}`,
          type: 'Revisão',
          title:
            item.status === 'changes_requested'
              ? `Alterações solicitadas: "${item.title}"`
              : `Aprovação atualizada: "${item.title}"`,
          time: formatDate(item.updated_at),
          status: item.status === 'changes_requested' ? 'warning' : 'success',
          createdAt: item.updated_at,
        });
      });

      activity.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRecentActivity(activity.slice(0, 10));
    } catch (error) {
      console.error('[ReportsModule] Error loading report:', error);
      setErrorMessage('Não foi possível carregar os dados do relatório.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeProfile?.id]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const getPeriodLabel = () => {
    switch (period) {
      case '7d':
        return 'Últimos 7 dias';
      case '30d':
        return 'Últimos 30 dias';
      case 'this_month':
        return 'Este mês';
      case 'last_month':
        return 'Mês passado';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate} até ${customEndDate}`;
        }
        return 'Período personalizado';
      default:
        return 'Últimos 30 dias';
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      setExportErrorMessage(null);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const ensureSpace = (height: number) => {
        if (y + height <= pdfHeight - margin) return;

        pdf.addPage();
        y = 20;
      };

      const setTextColor = (hex: string) => {
        pdf.setTextColor(hex);
      };

      const addWrappedText = (
        text: string,
        x: number,
        maxWidth: number,
        lineHeight: number,
        options?: { fontSize?: number; color?: string; fontStyle?: 'normal' | 'bold' }
      ) => {
        pdf.setFont('helvetica', options?.fontStyle || 'normal');
        pdf.setFontSize(options?.fontSize || 10);
        setTextColor(options?.color || '#374151');

        const lines = pdf.splitTextToSize(text, maxWidth) as string[];
        ensureSpace(lines.length * lineHeight);
        pdf.text(lines, x, y);
        y += lines.length * lineHeight;
      };

      const addSectionTitle = (title: string) => {
        ensureSpace(14);
        y += 4;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        setTextColor('#9ca3af');
        pdf.text(title.toUpperCase(), margin, y);
        y += 8;
      };

      const addDivider = () => {
        pdf.setDrawColor('#e5e7eb');
        pdf.line(margin, y, pageWidth - margin, y);
        y += 8;
      };

      pdf.setFillColor('#ffffff');
      pdf.rect(0, 0, pageWidth, pdfHeight, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      setTextColor('#111827');
      pdf.text(reportConfig.reportName || 'Relatório', margin, y);
      y += 9;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      setTextColor('#6b7280');
      pdf.text(`Cliente: ${reportConfig.clientName || 'Não informado'}`, margin, y);
      y += 6;
      pdf.text(`Período: ${getPeriodLabel()}`, margin, y);
      y += 10;
      addDivider();

      if (sections.kpis) {
        addSectionTitle('KPIs Gerais');

        const cardGap = 4;
        const cardWidth = (contentWidth - cardGap * (stats.length - 1)) / stats.length;
        const cardHeight = 26;

        ensureSpace(cardHeight + 8);

        stats.forEach((stat, index) => {
          const x = margin + index * (cardWidth + cardGap);

          pdf.setDrawColor('#e5e7eb');
          pdf.setFillColor('#f9fafb');
          pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          setTextColor('#6b7280');
          pdf.text(stat.label, x + 4, y + 8);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(16);
          setTextColor('#111827');
          pdf.text(stat.value, x + 4, y + 19);
        });

        y += cardHeight + 8;
      }

      if (sections.status) {
        addSectionTitle('Status da Operação');

        const statusRows = [
          ['Em Produção', String(contentStatus.inProduction)],
          ['Em Revisão', String(contentStatus.pendingReview)],
          ['Publicados', String(contentStatus.published)],
        ];

        statusRows.forEach(([label, value]) => {
          ensureSpace(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          setTextColor('#4b5563');
          pdf.text(label, margin, y);

          pdf.setFont('helvetica', 'bold');
          setTextColor('#111827');
          pdf.text(value, pageWidth - margin, y, { align: 'right' });
          y += 8;
        });
      }

      if (sections.insights) {
        addSectionTitle('Insights Executivos');

        addWrappedText(
          `A operação de conteúdo para ${reportConfig.clientName} está ativa com um pipeline saudável. Temos ${stats[0].value} ideias no backlog e ${stats[1].value} roteiros em andamento.`,
          margin,
          contentWidth,
          6,
          { fontSize: 11 }
        );
        y += 3;
        addWrappedText(
          `Atualmente, há ${contentStatus.inProduction} itens em produção e ${contentStatus.pendingReview} aguardando revisão. Com ${stats[2].value} posts agendados, o calendário de publicações está bem mantido para o próximo período.`,
          margin,
          contentWidth,
          6,
          { fontSize: 11 }
        );
        y += 3;
        addWrappedText(
          'Para manter o ritmo, recomendamos focar em mover os itens atualmente em revisão para o status de publicado e converter mais ideias em roteiros acionáveis.',
          margin,
          contentWidth,
          6,
          { fontSize: 11 }
        );
      }

      if (sections.activity) {
        addSectionTitle('Linha do Tempo da Operação');

        if (recentActivity.length === 0) {
          addWrappedText(
            'Nenhuma atividade recente registrada neste período.',
            margin,
            contentWidth,
            6,
            { color: '#6b7280' }
          );
        } else {
          recentActivity.forEach((activity) => {
            ensureSpace(16);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            setTextColor('#111827');
            pdf.text(activity.title, margin, y);
            y += 5;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            setTextColor('#6b7280');
            pdf.text(`${activity.type} • ${activity.time}`, margin, y);
            y += 8;
          });
        }
      }

      if (sections.notes) {
        addSectionTitle('Observações Finais');
        addWrappedText(
          reportConfig.finalNotes || 'Sem observações finais.',
          margin,
          contentWidth,
          6,
          { fontSize: 11 }
        );
      }

      ensureSpace(16);
      y = Math.max(y + 8, pdfHeight - 24);
      pdf.setDrawColor('#e5e7eb');
      pdf.line(margin, y - 8, pageWidth - margin, y - 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setTextColor('#9ca3af');
      pdf.text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );

      const safeClientName = (reportConfig.clientName || 'cliente')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

      const safeReportName = (reportConfig.reportName || 'relatorio')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

      pdf.save(`${safeReportName}-${safeClientName}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      setExportErrorMessage(
        'Não foi possível gerar o PDF agora. Tente novamente em alguns instantes.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewClick = () => {
    if (!reportPreviewRef.current) return;
    reportPreviewRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-main">
        <p className="text-text-secondary">Gerando relatório...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="h-full bg-bg-main p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg-main">
      <header className="flex flex-col justify-between gap-4 border-b border-white/5 px-8 py-8 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-text-primary">Relatórios</h1>
          <p className="text-text-secondary">
            Gere relatórios profissionais e white-label para seus clientes.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
          <span className="max-w-[220px] text-xs text-text-secondary md:text-right">
            O PDF exportado será gerado em formato white-label, sem a marca da PostHub.
          </span>

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="gap-2" onClick={handlePreviewClick}>
              <Eye className="h-4 w-4" />
              Visualizar
            </Button>

            <Button className="gap-2" onClick={handleExportPdf} disabled={isExporting}>
              <Download className="h-4 w-4" />
              {isExporting ? 'Gerando PDF...' : 'Baixar PDF'}
            </Button>
          </div>

          {exportErrorMessage && (
            <p className="max-w-[360px] text-xs font-medium text-red-500 md:text-right">
              {exportErrorMessage}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-col items-start gap-8 p-8 xl:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-6 xl:w-80">
          <div className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-bg-surface p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <Settings2 className="h-5 w-5 text-brand" />
              Configuração
            </h2>

            <div className="space-y-3">
              <label className="text-sm font-medium text-text-secondary">Período</label>

              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-white/10 bg-bg-main px-4 py-2.5 text-sm text-text-primary outline-none focus:border-brand"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodOption)}
                >
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="this_month">Este mês</option>
                  <option value="last_month">Mês passado</option>
                  <option value="custom">Personalizado</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              </div>

              {period === 'custom' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-text-secondary">
                Detalhes do Relatório
              </label>

              <Input
                placeholder="Nome do cliente"
                value={reportConfig.clientName}
                onChange={(e) =>
                  setReportConfig({ ...reportConfig, clientName: e.target.value })
                }
              />

              <Input
                placeholder="Título do relatório"
                value={reportConfig.reportName}
                onChange={(e) =>
                  setReportConfig({ ...reportConfig, reportName: e.target.value })
                }
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-text-secondary">
                Seções Incluídas
              </label>

              <div className="space-y-2">
                {Object.entries({
                  kpis: 'KPIs Gerais',
                  status: 'Status da Operação',
                  activity: 'Atividades Recentes',
                  insights: 'Insights',
                  notes: 'Observações Finais',
                }).map(([key, label]) => (
                  <label
                    key={key}
                    className="group flex cursor-pointer items-center gap-3"
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border transition-colors',
                        sections[key as keyof typeof sections]
                          ? 'border-brand bg-brand'
                          : 'border-white/20 bg-bg-main group-hover:border-white/40'
                      )}
                    >
                      {sections[key as keyof typeof sections] && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>

                    <span className="text-sm text-text-secondary transition-colors group-hover:text-text-primary">
                      {label}
                    </span>

                    <input
                      type="checkbox"
                      className="hidden"
                      checked={sections[key as keyof typeof sections]}
                      onChange={(e) =>
                        setSections({
                          ...sections,
                          [key]: e.target.checked,
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex-1 overflow-x-auto rounded-2xl border border-white/5 bg-bg-surface p-8">
          <div
            ref={reportPreviewRef}
            data-report-preview="true"
            className="mx-auto min-w-[800px] max-w-4xl rounded-xl border border-gray-100 bg-white p-12 shadow-sm"
          >
            <header className="mb-12 border-b border-gray-100 pb-8">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="mb-2 text-4xl font-black tracking-tight text-gray-900">
                    {reportConfig.reportName || 'Relatório'}
                  </h1>
                  <p className="text-lg font-medium text-gray-500">
                    Cliente:{' '}
                    <span className="text-gray-900">
                      {reportConfig.clientName || 'Não informado'}
                    </span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-gray-400">
                    Período
                  </p>
                  <p className="text-xl font-medium text-gray-900">{getPeriodLabel()}</p>
                </div>
              </div>
            </header>

            {sections.kpis && (
              <section className="mb-12">
                <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-gray-400">
                  KPIs Gerais
                </h2>

                <div className="grid grid-cols-4 gap-6">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-6"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-xl bg-white p-2.5 text-[#38B6FF] shadow-sm">
                          <stat.icon className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                      </div>

                      <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(sections.status || sections.insights) && (
              <div className="mb-12 grid grid-cols-5 gap-12">
                {sections.status && (
                  <section className={sections.insights ? 'col-span-2' : 'col-span-5'}>
                    <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-gray-400">
                      Status da Operação
                    </h2>

                    <div className="space-y-6 rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                            <Clock className="h-4 w-4" />
                          </div>
                          <span className="font-medium">Em Produção</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                          {contentStatus.inProduction}
                        </span>
                      </div>

                      <div className="h-px w-full bg-gray-100" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                            <AlertCircle className="h-4 w-4" />
                          </div>
                          <span className="font-medium">Em Revisão</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                          {contentStatus.pendingReview}
                        </span>
                      </div>

                      <div className="h-px w-full bg-gray-100" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-600">
                          <div className="rounded-lg bg-green-100 p-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <span className="font-medium">Publicados</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                          {contentStatus.published}
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {sections.insights && (
                  <section className={sections.status ? 'col-span-3' : 'col-span-5'}>
                    <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-gray-400">
                      Insights Executivos
                    </h2>

                    <div className="h-[calc(100%-2.5rem)] rounded-2xl border border-[#38B6FF]/10 bg-[#38B6FF]/5 p-8">
                      <div className="prose prose-blue max-w-none">
                        <p className="text-lg leading-relaxed text-gray-700">
                          A operação de conteúdo para{' '}
                          <strong>{reportConfig.clientName}</strong> está ativa com um
                          pipeline saudável. Temos <strong>{stats[0].value} ideias</strong> no
                          backlog e <strong>{stats[1].value} roteiros</strong> em andamento.
                        </p>

                        <p className="mt-4 text-lg leading-relaxed text-gray-700">
                          Atualmente, há{' '}
                          <strong>{contentStatus.inProduction} itens em produção</strong> e{' '}
                          <strong>{contentStatus.pendingReview} aguardando revisão</strong>. Com{' '}
                          <strong>{stats[2].value} posts agendados</strong>, o calendário de
                          publicações está bem mantido para o próximo período.
                        </p>

                        <p className="mt-4 text-lg leading-relaxed text-gray-700">
                          Para manter o ritmo, recomendamos focar em mover os itens
                          atualmente em revisão para o status de publicado e converter mais
                          ideias em roteiros acionáveis.
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}

            {sections.activity && (
              <section className="mb-12">
                <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-gray-400">
                  Linha do Tempo da Operação
                </h2>

                <div className="rounded-2xl border border-gray-100 p-8">
                  {recentActivity.length === 0 ? (
                    <p className="italic text-gray-500">
                      Nenhuma atividade recente registrada neste período.
                    </p>
                  ) : (
                    <div className="relative ml-4 space-y-8 border-l-2 border-gray-100 pb-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="relative pl-8">
                          <div
                            className={cn(
                              'absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white',
                              activity.status === 'success'
                                ? 'bg-green-500'
                                : activity.status === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-[#38B6FF]'
                            )}
                          />

                          <div className="flex items-start justify-between">
                            <div>
                              <p className="mb-1 text-base font-semibold text-gray-900">
                                {activity.title}
                              </p>
                              <p className="text-sm text-gray-500">{activity.time}</p>
                            </div>

                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                              {activity.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {sections.notes && (
              <section>
                <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-gray-400">
                  Observações Finais
                </h2>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                  <textarea
                    className="w-full resize-none border-none bg-transparent leading-relaxed text-gray-700 outline-none"
                    rows={3}
                    value={reportConfig.finalNotes}
                    onChange={(e) =>
                      setReportConfig({
                        ...reportConfig,
                        finalNotes: e.target.value,
                      })
                    }
                    placeholder="Adicione observações finais aqui..."
                  />
                </div>
              </section>
            )}

            <footer className="mt-16 border-t border-gray-100 pt-8 text-center">
              <p className="text-sm text-gray-400">
                Gerado em{' '}
                {new Date().toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};
