import * as React from 'react';
import { User, Mail, Globe, Shield, Bell } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Avatar } from '../../shared/components/Avatar';
import { useAuth } from '../../app/context/AuthContext';

export const AccountArea = () => {
  const { user } = useAuth();

  const [website, setWebsite] = React.useState('');

  const fullName = user?.name?.trim() || 'User';
  const email = user?.email || '';

  const nameParts = React.useMemo(() => fullName.split(' ').filter(Boolean), [fullName]);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Account Settings</h1>
        <p className="text-text-secondary">Manage your personal information and preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-4">
          <Card className="flex flex-col items-center text-center">
            <Avatar fallback={initials} size="lg" className="h-24 w-24 mb-4" />
            <h3 className="font-bold text-text-primary">{fullName}</h3>
            <p className="text-sm text-text-secondary mb-4">Account Owner</p>
            <Button variant="outline" size="sm" className="w-full">Change Photo</Button>
          </Card>

          <nav className="space-y-1">
            {[
              { label: 'Profile', icon: User, active: true },
              { label: 'Security', icon: Shield },
              { label: 'Notifications', icon: Bell },
            ].map((item) => (
              <button
                key={item.label}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  item.active ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:bg-gray-50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardTitle className="mb-6">Personal Information</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" defaultValue={firstName} />
              <Input label="Last Name" defaultValue={lastName} />
              <div className="col-span-2">
                <Input label="Email Address" defaultValue={email} icon={<Mail className="h-4 w-4" />} />
              </div>
              <div className="col-span-2">
                <Input
                  label="Website"
                  defaultValue={website}
                  icon={<Globe className="h-4 w-4" />}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </Card>

          <Card className="border-red-100 bg-red-50/30">
            <CardTitle className="text-red-600 mb-2">Delete Account</CardTitle>
            <CardDescription className="mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </CardDescription>
            <Button variant="danger" size="sm">Delete Account</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
