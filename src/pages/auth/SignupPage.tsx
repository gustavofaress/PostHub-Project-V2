import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Check, Briefcase, Smartphone } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { useAuth } from '../../app/context/AuthContext';
import { BrandLogo } from '../../assets/branding/BrandLogo';
import { trackMetaEvent } from '../../services/meta-conversions.service';
import { AffiliateNotice } from '../../shared/components/AffiliateNotice';
import {
  buildAuthPath,
  normalizeInternalRedirectPath,
  normalizeProductContext,
} from '../../shared/utils/authPaths';

export const SignupPage = () => {
  const { signup } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = React.useMemo(
    () => normalizeInternalRedirectPath(searchParams.get('redirect')),
    [searchParams]
  );
  const productContext = React.useMemo(
    () => normalizeProductContext(searchParams.get('product')),
    [searchParams]
  );
  const isMetricHubFlow = productContext === 'metric-hub';
  const loginPath = React.useMemo(
    () =>
      buildAuthPath('/login', {
        redirectTo,
        product: productContext,
      }),
    [productContext, redirectTo]
  );

  const [isLoading, setIsLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [profileName, setProfileName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [confirmationEmail, setConfirmationEmail] = React.useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setConfirmationEmail('');

    try {
      const result = await signup(name, email, password, profileName || name, redirectTo);
      if (result.requiresEmailConfirmation) {
        setConfirmationEmail(result.email);
        trackMetaEvent({
          eventName: 'CompleteRegistration',
          userData: {
            em: result.email,
          },
          customData: {
            content_name: isMetricHubFlow ? 'MetricHub account' : 'PostHub account',
            status: 'pending_email_confirmation',
          },
        });
        return;
      }

      trackMetaEvent({
        eventName: 'CompleteRegistration',
        userData: {
          em: result.email,
        },
        customData: {
          content_name: isMetricHubFlow ? 'MetricHub account' : 'PostHub account',
          status: 'completed',
        },
      });
    } catch (err: any) {
      console.error('Signup full error:', err);
      setError(
        err?.message ||
          err?.error_description ||
          (typeof err === 'string' ? err : JSON.stringify(err)) ||
          'Não foi possível criar sua conta'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4">
      <BrandLogo
        className="mb-8 flex justify-center"
        imgClassName="h-12 w-auto object-contain"
      />

      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          {isMetricHubFlow ? (
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
              <Smartphone className="h-4 w-4" />
              MetricHub mobile
            </div>
          ) : null}
          <h1 className="text-2xl font-bold text-text-primary">
            {isMetricHubFlow ? 'Crie sua conta no MetricHub' : 'Crie sua conta'}
          </h1>
          <p className="text-text-secondary">
            {isMetricHubFlow
              ? 'Monte seu histórico de métricas em um espaço próprio, pensado para celular.'
              : 'Comece a gerenciar seu conteúdo com mais profissionalismo.'}
          </p>
        </div>

        <AffiliateNotice />

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200 break-words">
              {error}
            </div>
          )}

          {confirmationEmail && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Enviamos um link de confirmação para <strong>{confirmationEmail}</strong>.
              Confirme o email para liberar seu acesso ao{' '}
              {isMetricHubFlow ? 'MetricHub' : 'PostHub'}.
            </div>
          )}

          <Input
            label="Nome completo"
            placeholder="Ana Silva"
            icon={<User className="h-4 w-4" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Nome do perfil ou negócio"
            placeholder={isMetricHubFlow ? 'Meu creator profile' : 'Minha agência'}
            icon={<Briefcase className="h-4 w-4" />}
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            required
          />

          <Input
            label="E-mail"
            type="email"
            placeholder="nome@empresa.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center gap-2 py-2">
            <div className="h-4 w-4 rounded border border-gray-300 flex items-center justify-center bg-brand text-white shrink-0">
              <Check className="h-3 w-3" />
            </div>
            <span className="text-xs text-text-secondary">
              Eu concordo com os{' '}
              <Link to="#" className="text-brand hover:underline">
                Termos de Serviço
              </Link>{' '}
              e a{' '}
              <Link to="#" className="text-brand hover:underline">
                Política de Privacidade
              </Link>
              .
            </span>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isMetricHubFlow ? 'Criar conta no MetricHub' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-text-secondary">
          Já tem uma conta?{' '}
          <Link to={loginPath} className="font-semibold text-brand hover:underline">
            {isMetricHubFlow ? 'Entrar no MetricHub' : 'Entrar'}
          </Link>
        </p>
      </Card>
    </div>
  );
};
