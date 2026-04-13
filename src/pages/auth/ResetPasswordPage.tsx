import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';

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
  const { requestPasswordReset, updatePassword } = useAuth();

  const [mode, setMode] = React.useState<ResetMode>(() =>
    hasRecoveryTokens() ? 'update' : 'request'
  );
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = React.useState(() => hasRecoveryTokens());

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

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');

    try {
      await requestPasswordReset(email);
      setInfo(
        'Se o email estiver cadastrado, enviaremos uma mensagem com o link seguro para redefinir a senha.'
      );
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o email de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');

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
            {isRequestMode ? <Mail className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {isRequestMode ? 'Recuperar senha' : 'Criar nova senha'}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {isRequestMode
                ? 'Digite seu email para receber um link seguro de redefinição.'
                : 'Defina sua nova senha para voltar ao PostHub com segurança.'}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {info}
          </div>
        ) : null}

        {isRequestMode ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <Input
              label="Seu email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              icon={<Mail className="h-4 w-4" />}
              placeholder="voce@empresa.com"
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Enviar email de recuperação
            </Button>
          </form>
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
