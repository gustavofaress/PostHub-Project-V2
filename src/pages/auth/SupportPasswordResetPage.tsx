import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock3, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { supportPasswordResetService } from '../../services/support-password-reset.service';

const formatDateTime = (dateString: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

export const SupportPasswordResetPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token')?.trim() ?? '';

  const [maskedEmail, setMaskedEmail] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [validationError, setValidationError] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [isValidatingToken, setIsValidatingToken] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    let isActive = true;

    if (!token) {
      setValidationError('Este link de suporte esta incompleto. Solicite um novo link.');
      setIsValidatingToken(false);
      return () => {
        isActive = false;
      };
    }

    setValidationError('');
    setIsValidatingToken(true);

    const validateToken = async () => {
      try {
        const result = await supportPasswordResetService.validateToken(token);

        if (!isActive) return;

        setMaskedEmail(result.maskedEmail);
        setExpiresAt(result.expiresAt);
      } catch (error) {
        if (!isActive) return;

        setValidationError(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel validar este link de suporte.'
        );
      } finally {
        if (isActive) {
          setIsValidatingToken(false);
        }
      }
    };

    void validateToken();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setFormError('');

    if (!normalizedEmail) {
      setFormError('Informe o email da conta para continuar.');
      return;
    }

    if (password.length < 8) {
      setFormError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas nao coincidem.');
      return;
    }

    setIsSubmitting(true);

    try {
      await supportPasswordResetService.completeReset({
        token,
        email: normalizedEmail,
        password,
      });

      navigate('/login?reset=success', { replace: true });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel concluir a redefinicao de senha.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canRenderForm = !isValidatingToken && !validationError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Redefinir senha com suporte
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Confirme o email da conta e escolha sua nova senha com seguranca.
            </p>
          </div>
        </div>

        {validationError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {validationError}
          </div>
        ) : null}

        {formError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {formError}
          </div>
        ) : null}

        {isValidatingToken ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-text-secondary">
            Validando seu link seguro...
          </div>
        ) : null}

        {canRenderForm ? (
          <>
            <div className="mb-5 space-y-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                Este link esta vinculado ao email <strong>{maskedEmail}</strong>. Digite o
                email completo da conta para confirmar que o acesso esta sendo feito pela
                pessoa certa.
              </div>

              {expiresAt ? (
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <Clock3 className="h-4 w-4 shrink-0 text-gray-400" />
                  Expira em {formatDateTime(expiresAt)}.
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Confirme o email da conta"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                icon={<Mail className="h-4 w-4" />}
                placeholder="voce@empresa.com"
                autoComplete="email"
                required
              />

              <Input
                label="Nova senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                icon={<KeyRound className="h-4 w-4" />}
                placeholder="Digite a nova senha"
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirmar nova senha"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                icon={<ShieldCheck className="h-4 w-4" />}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                required
              />

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Salvar nova senha
              </Button>
            </form>
          </>
        ) : null}

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
