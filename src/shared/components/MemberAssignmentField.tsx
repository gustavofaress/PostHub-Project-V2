import * as React from 'react';
import { Check, Users } from 'lucide-react';
import { Avatar } from './Avatar';
import { cn } from '../utils/cn';
import type { TeamMember } from '../constants/workspaceMembers';

interface MemberAssignmentFieldProps {
  members: TeamMember[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  description?: string;
}

export const MemberAssignmentField = ({
  members,
  value,
  onChange,
  label = 'Membros vinculados',
  description = 'Escolha quais membros podem atuar e ser mencionados nesta demanda.',
}: MemberAssignmentFieldProps) => {
  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggleMember = (memberId: string) => {
    if (selectedSet.has(memberId)) {
      onChange(value.filter((current) => current !== memberId));
      return;
    }

    onChange([...value, memberId]);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand" />
          <p className="text-sm font-medium text-text-primary">{label}</p>
        </div>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-text-secondary">
          Adicione membros no workspace para vinculá-los às demandas.
        </div>
      ) : (
        <div className="grid gap-2">
          {members.map((member) => {
            const isSelected = selectedSet.has(member.id);

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-all',
                  isSelected
                    ? 'border-brand bg-brand/5 shadow-sm'
                    : 'border-gray-200 hover:border-brand/30 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar fallback={member.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{member.name}</p>
                    <p className="text-xs text-text-secondary">{member.email}</p>
                  </div>
                </div>

                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border transition-all',
                    isSelected
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-200 bg-white text-transparent'
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
