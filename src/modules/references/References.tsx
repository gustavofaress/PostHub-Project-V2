import * as React from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  ExternalLink, 
  Copy, 
  MoreVertical,
  Tag,
  Folder
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import { cn } from '../../shared/utils/cn';

const REFERENCES = [
  { id: '1', title: 'Minimalist Interior Design', type: 'Visual', source: 'Pinterest', tags: ['aesthetic', 'interior'], thumbnail: 'https://picsum.photos/seed/ref1/400/400' },
  { id: '2', title: 'Viral Hook Examples', type: 'Script', source: 'TikTok', tags: ['hooks', 'viral'], thumbnail: 'https://picsum.photos/seed/ref2/400/400' },
  { id: '3', title: 'Color Palette: Ocean Breeze', type: 'Visual', source: 'Dribbble', tags: ['colors', 'branding'], thumbnail: 'https://picsum.photos/seed/ref3/400/400' },
  { id: '4', title: 'B2B Content Strategy', type: 'Article', source: 'LinkedIn', tags: ['strategy', 'b2b'], thumbnail: 'https://picsum.photos/seed/ref4/400/400' },
  { id: '5', title: 'Dynamic Transition Tutorial', type: 'Video', source: 'YouTube', tags: ['editing', 'transitions'], thumbnail: 'https://picsum.photos/seed/ref5/400/400' },
  { id: '6', title: 'Typography Trends 2024', type: 'Article', source: 'Medium', tags: ['fonts', 'design'], thumbnail: 'https://picsum.photos/seed/ref6/400/400' },
];

export const References = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand" />
            References Bank
          </h1>
          <p className="text-text-secondary">Save and organize your visual and creative inspirations.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Reference
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-96">
          <Input placeholder="Search references..." icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Button variant="outline" size="sm" className="gap-2 shrink-0">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <div className="h-8 w-px bg-gray-200 shrink-0" />
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
            <button className="p-1.5 rounded-md bg-white shadow-sm text-brand">
              <Grid className="h-4 w-4" />
            </button>
            <button className="p-1.5 rounded-md text-gray-500 hover:text-text-primary">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {REFERENCES.map((ref) => (
          <Card key={ref.id} padding="none" className="group overflow-hidden flex flex-col">
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              <img 
                src={ref.thumbnail} 
                alt={ref.title} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button className="h-10 w-10 rounded-full bg-white text-text-primary flex items-center justify-center hover:bg-brand hover:text-white transition-colors">
                  <ExternalLink className="h-5 w-5" />
                </button>
                <button className="h-10 w-10 rounded-full bg-white text-text-primary flex items-center justify-center hover:bg-brand hover:text-white transition-colors">
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute top-3 left-3">
                <Badge className="bg-white/90 text-text-primary backdrop-blur-sm border-none shadow-sm">
                  {ref.type}
                </Badge>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-text-primary text-sm line-clamp-2 leading-tight">{ref.title}</h3>
                <button className="text-gray-400 hover:text-text-primary shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded">
                  {ref.source}
                </span>
              </div>

              <div className="mt-auto flex flex-wrap gap-1.5">
                {ref.tags.map(tag => (
                  <span key={tag} className="text-[10px] text-brand bg-brand/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Tag className="h-2 w-2" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Collections Section */}
      <div className="pt-8 border-t border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Folder className="h-5 w-5 text-brand" />
            Your Collections
          </h2>
          <Button variant="ghost" size="sm" className="text-brand">View All</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Summer Campaign 2024', count: 24, color: 'bg-orange-100 text-orange-600' },
            { name: 'Client: Acme Corp', count: 12, color: 'bg-blue-100 text-blue-600' },
            { name: 'Reels Inspiration', count: 48, color: 'bg-pink-100 text-pink-600' },
          ].map(folder => (
            <Card key={folder.name} className="flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", folder.color)}>
                <Folder className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-sm">{folder.name}</h3>
                <p className="text-xs text-text-secondary">{folder.count} items</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
