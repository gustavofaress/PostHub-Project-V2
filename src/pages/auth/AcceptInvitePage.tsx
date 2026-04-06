import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Mail, Users } from 'lucide-react';
import { useAuth } from '../../app/context/AuthContext';
import { useProfile } from '../../app/context/ProfileContext';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { workspaceMembersService } from '../../services/workspace-members.service';

export const AcceptInvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { reloadProfiles } = useProfile();

  const [isAccepting, setIsAccepting] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState(
    'Faça login com o email convidado para entrar no workspace.'
  );

  React.useEffect(() => {
    if (!isAuthenticated || !user || !token) return;

    let isMounted = true;

    const acceptInvite = async () => {
      setIsAccepting(true);
      setStatus('idle');
      setMessage('Validando seu convite...');

      try {
        await workspaceMembersService.acceptInvite(token);
        await reloadProfiles();
        if (!isMounted) return;
        setStatus('success');
        setMessage('Convite aceito com sucesso. Estamos te levando para o workspace.');
        window.setTimeout(() => navigate('/workspace/dashboard'), 1200);
      } catch (error: any) {
        console.error('[AcceptInvitePage] Failed to accept invite:', error);
        if (!isMounted) return;
        setStatus('error');
        setMessage(
          error?.message ||
            'Não foi possível aceitar o convite. Verifique se você entrou com o email correto.'
        );
      } finally {
        if (isMounted) {
          setIsAccepting(false);
        }
      }
    };

    void acceptInvite();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, navigate, reloadProfiles, token, user]);

  const redirect = token ? encodeURIComponent(`/invite/${token}`) : encodeURIComponent('/login');

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Convite do workspace</h1>
            <p className="text-sm text-text-secondary">
              Entre com o email correto para liberar seu acesso ao PostHub.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <div className="mb-3 flex items-center gap-2 text-text-primary">
            {status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Mail className="h-5 w-5 text-brand" />
            )}
            <span className="font-medium">Status do convite</span>
          </div>
          <p
            className={
              status === 'error'
                ? 'text-sm text-red-600'
                : status === 'success'
                ? 'text-sm text-green-700'
                : 'text-sm text-text-secondary'
            }
          >
            {message}
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to={`/login?redirect=${redirect}`} className="flex-1">
              <Button className="w-full">Entrar e aceitar convite</Button>
            </Link>
            <Link to={`/signup?redirect=${redirect}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                Criar conta com este email
              </Button>
            </Link>
          </div>
        ) : null}

        {isAuthenticated && !isAccepting && status === 'error' ? (
          <div className="mt-6">
            <Button onClick={() => navigate('/workspace/dashboard')} variant="secondary" className="w-full">
              Voltar ao workspace
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
};
