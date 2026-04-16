import * as React from 'react';
import { cn } from '../utils/cn';

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => {
  return (
    <div
      className={cn(
        'hide-scrollbar -mx-1 flex overflow-x-auto border-b border-gray-200 px-1 pb-px',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-2xl px-4 py-2 text-sm font-medium transition-all',
            activeTab === tab.id
              ? 'bg-brand/[0.06] text-brand'
              : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
          )}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
          )}
        </button>
      ))}
    </div>
  );
};
