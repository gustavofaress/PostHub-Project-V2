import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, Mail, Users } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { useAuth } from '../../app/context/AuthContext';

export const MemberLoginPage = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState(searchParams.get('email') || '');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar com o acesso do membro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Login de membro</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Use o email cadastrado e a senha automática enviada pelo administrador do workspace.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <Input
            label="Email do membro"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={<Mail className="h-4 w-4" />}
            placeholder="membro@empresa.com"
            required
          />

          <Input
            label="Senha automática"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            icon={<KeyRound className="h-4 w-4" />}
            placeholder="Digite a senha recebida"
            required
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Entrar no workspace
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-text-secondary">
          Esse acesso é exclusivo para membros convidados. Se você for o proprietário da conta, use o{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            login padrão
          </Link>
          .
        </div>
      </Card>
    </div>
  );
};
