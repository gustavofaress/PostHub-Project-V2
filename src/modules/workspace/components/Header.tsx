import * as React from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';
import { useApp } from '../../../app/context/AppContext';
import { useProfile } from '../../../app/context/ProfileContext';
import { Avatar } from '../../../shared/components/Avatar';
import { Dropdown, DropdownItem } from '../../../shared/components/Dropdown';
import { Button } from '../../../shared/components/Button';
import { NotificationsDropdown } from './NotificationsDropdown';

export const Header = () => {
  const { setActiveModule } = useApp();
  const { activeProfile, setActiveProfile, profiles } = useProfile();

  const handleNewContent = () => {
    setActiveModule('ideas');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search content, ideas, scripts..."
            className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button size="sm" className="hidden md:flex gap-2" onClick={handleNewContent}>
          <Plus className="h-4 w-4" />
          New Content
        </Button>

        <NotificationsDropdown />

        <div className="h-8 w-px bg-gray-200 mx-2" />

        {activeProfile && (
          <Dropdown
            trigger={
              <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-50 transition-colors">
                <Avatar src={activeProfile.avatar_url} fallback={activeProfile.name} size="sm" />
                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold text-text-primary leading-none">{activeProfile.name}</p>
                  <p className="text-xs text-text-secondary">{activeProfile.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            }
          >
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Switch Profile
            </div>
            {profiles.map((profile) => (
              <DropdownItem
                key={profile.id}
                onClick={() => setActiveProfile(profile)}
                className={activeProfile.id === profile.id ? 'bg-brand/5 text-brand font-medium' : ''}
              >
                <div className="flex items-center gap-2">
                  <Avatar src={profile.avatar_url} fallback={profile.name} size="sm" className="h-6 w-6" />
                  <span>{profile.name}</span>
                </div>
              </DropdownItem>
            ))}
            <div className="my-1 border-t border-gray-100" />
            <DropdownItem icon={Plus}>Add New Profile</DropdownItem>
          </Dropdown>
        )}
      </div>
    </header>
  );
};
