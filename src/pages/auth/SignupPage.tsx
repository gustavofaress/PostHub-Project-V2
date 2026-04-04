import * as React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Check, Briefcase } from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { useAuth } from '../../app/context/AuthContext';

export const SignupPage = () => {
  const { signup } = useAuth();

  const [isLoading, setIsLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [profileName, setProfileName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signup(name, email, password, profileName || name);
    } catch (err: any) {
      console.error('Signup full error:', err);
      setError(
        err?.message ||
          err?.error_description ||
          (typeof err === 'string' ? err : JSON.stringify(err)) ||
          'Failed to sign up'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-brand/20">
          P
        </div>
        <span className="text-2xl font-bold tracking-tight text-text-primary">PostHub</span>
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
          <p className="text-text-secondary">Start managing your content like a pro today.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200 break-words">
              {error}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="John Doe"
            icon={<User className="h-4 w-4" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Profile / Business Name"
            placeholder="My Agency"
            icon={<Briefcase className="h-4 w-4" />}
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
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
              I agree to the{' '}
              <Link to="#" className="text-brand hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="#" className="text-brand hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Get Started
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
};
