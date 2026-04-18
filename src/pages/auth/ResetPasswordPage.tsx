import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  KeyRound,
  MessageCircleMore,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import { SUPPORT_WHATSAPP_URL } from '../../shared/constants/support';

type ResetMode = 'request' | 'update';

const getHashParams = () => {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
};

const hasRecoveryTokens = () => {
  if (typeof window === 'undefined') return false;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = getHashParams();

  return (
    searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    hashParams.has('access_token') ||
    hashParams.has('refresh_token')
  );
};

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = React.useState<ResetMode>(() =>
    hasRecoveryTokens() ? 'update' : 'request'
  );
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = React.useState(() => hasRecoveryTokens());
  const supportEmail = searchParams.get('email')?.trim() ?? '';

  React.useEffect(() => {
    if (!supabase) {
      setIsCheckingRecovery(false);
      return;
    }

    const hashParams = getHashParams();
    const searchParams = new URLSearchParams(window.location.search);
    const errorDescription =
      hashParams.get('error_description') || searchParams.get('error_description');

    if (errorDescription) {
      setError(errorDescription);
    }

    const recoveryExpected = hasRecoveryTokens();

    if (!recoveryExpected) {
      setIsCheckingRecovery(false);
      return;
    }

    let isActive = true;

    const waitForRecoverySession = async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isActive) return;

        if (session) {
          setMode('update');
          setError('');
          setIsCheckingRecovery(false);
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      if (!isActive) return;

      setMode('request');
      setIsCheckingRecovery(false);
      setError('Esse link de recuperação é inválido ou expirou. Solicite um novo email.');
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) return;

      if (event === 'PASSWORD_RECOVERY' || (recoveryExpected && session)) {
        setMode('update');
        setError('');
        setIsCheckingRecovery(false);
      }
    });

    void waitForRecoverySession();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      await updatePassword(password);
      await supabase?.auth.signOut();
      navigate('/login?reset=success', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRequestMode = mode === 'request';

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            {isRequestMode ? (
              <MessageCircleMore className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {isRequestMode ? 'Fale com o suporte' : 'Criar nova senha'}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {isRequestMode
                ? 'Nossa equipe envia o link seguro de redefinicao pelo suporte.'
                : 'Defina sua nova senha para voltar ao PostHub com segurança.'}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {isRequestMode ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              Para redefinir sua senha, fale com o suporte no WhatsApp. Por la, nossa equipe
              gera o link seguro de redefinicao para sua conta.
            </div>

            {supportEmail ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Email informado
                </div>
                <div className="mt-2 break-all font-medium text-gray-900">{supportEmail}</div>
              </div>
            ) : null}

            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              Conversar com o suporte no WhatsApp
              <ExternalLink className="h-4 w-4" />
            </a>

            <p className="text-center text-sm text-text-secondary">
              Se preferir, informe ao suporte o email da conta para agilizar o atendimento.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {isCheckingRecovery ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-text-secondary">
                Validando seu link seguro...
              </div>
            ) : null}

            <Input
              label="Nova senha"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              placeholder="Digite a nova senha"
              required
            />

            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              icon={<ShieldCheck className="h-4 w-4" />}
              placeholder="Repita a nova senha"
              required
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isCheckingRecovery}
            >
              Salvar nova senha
            </Button>
          </form>
        )}

        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </div>
      </Card>
    </div>
  );
};
