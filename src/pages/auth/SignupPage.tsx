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
