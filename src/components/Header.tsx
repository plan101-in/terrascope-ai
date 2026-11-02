import { Cloud, CloudCheck, Database, Layers, Radio, Settings2, Sliders, UserCheck, UserX } from 'lucide-react';
import { ModelConnectionStatus } from '../types/prediction';

export type ActiveTab = 'dashboard' | 'classification' | 'queue' | 'evaluation' | 'methodology' | 'about';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  modelStatus: ModelConnectionStatus;
  isPracticeModel?: boolean;
  onOpenModelModal: () => void;
  onOpenClassModal: () => void;
  reviewQueueCount: number;
  currentUser?: any | null;
  onOpenAuthModal?: () => void;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  modelStatus,
  isPracticeModel,
  onOpenModelModal,
  onOpenClassModal,
  reviewQueueCount,
  currentUser,
  onOpenAuthModal,
  syncStatus,
}) => {
  const navItems: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'classification', label: 'Classification' },
    { id: 'queue', label: 'Review Queue', count: reviewQueueCount },
    { id: 'evaluation', label: 'Evaluation' },
    { id: 'methodology', label: 'Methodology' },
    { id: 'about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 lg:gap-8">
          {/* Zone 1: Brand title wordmark */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-hidden"
          >
            <div className="w-9 h-9 rounded-lg bg-[#102B46] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-5 h-5 text-[#DCEFFB]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#102B46] whitespace-nowrap">
                TerraScope AI
              </span>
              <span className="text-[11px] text-[#64748B] tracking-tight leading-none hidden sm:block">
                Satellite Land-Use Classification
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 rounded-md relative ${
                    isActive
                      ? 'text-[#102B46] font-semibold bg-[#DCEFFB]/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  {item.label}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="ml-1.5 text-xs font-mono text-[#1779B8] font-bold">
                      ({item.count})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Connection Status & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Supabase Cloud Auth Button */}
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                title={
                  currentUser
                    ? `Signed in as ${currentUser.email}. Click to view account & export backup.`
                    : 'Sign in to Supabase cloud for persistent storage and private imagery'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  currentUser
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/70'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {currentUser ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="max-w-[100px] truncate hidden sm:inline">
                      {currentUser.email?.split('@')[0]}
                    </span>
                    <span className="sm:hidden text-[11px] font-mono">Cloud</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Connect Cloud</span>
                    <span className="sm:hidden">Login</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onOpenClassModal}
              title="Configure Dynamic Land-Use Classes"
              className="p-2 text-slate-500 hover:text-[#102B46] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              aria-label="Class Taxonomy Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenModelModal}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  modelStatus === 'connected'
                    ? 'text-[#24845A]'
                    : modelStatus === 'connecting'
                    ? 'text-[#1779B8] animate-pulse'
                    : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {modelStatus === 'connected'
                  ? isPracticeModel
                    ? 'Practice Model Connected'
                    : 'Model: Connected'
                  : modelStatus === 'connecting'
                  ? 'Loading TFLite...'
                  : 'Model: Not Connected'}
              </span>
              <span className="sm:hidden">
                {modelStatus === 'connected'
                  ? isPracticeModel
                    ? 'Practice'
                    : 'Connected'
                  : modelStatus === 'connecting'
                  ? 'Loading'
                  : 'Colab'}
              </span>
              <Settings2 className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation strip */}
        <div className="md:hidden flex overflow-x-auto py-2 border-t border-slate-100 gap-1.5 text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive ? 'bg-[#102B46] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
                {item.count !== undefined && item.count > 0 && ` (${item.count})`}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
