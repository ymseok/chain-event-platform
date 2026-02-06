'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LogOut, User, Bell, Search, AppWindow, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAppStore } from '@/lib/stores/app-store';
import { useApplications } from '@/lib/hooks/use-applications';
import type { Application } from '@/types';

interface SearchResult {
  id: string;
  type: 'application';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
}

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { setCurrentApp } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: applicationsData, isLoading } = useApplications(1, 100);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    if (applicationsData?.data) {
      const filteredApps = applicationsData.data.filter(
        (app: Application) =>
          app.name.toLowerCase().includes(query) ||
          app.description?.toLowerCase().includes(query)
      );

      filteredApps.slice(0, 5).forEach((app: Application) => {
        results.push({
          id: app.id,
          type: 'application',
          title: app.name,
          subtitle: app.description || undefined,
          icon: <AppWindow className="h-4 w-4" />,
          href: `/applications/${app.id}`,
        });
      });
    }

    return results;
  }, [searchQuery, applicationsData]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }

      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    router.push(result.href);
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [router]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!searchResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      e.preventDefault();
      handleResultClick(searchResults[selectedIndex]);
    }
  }, [searchResults, selectedIndex, handleResultClick]);

  const handleLogout = () => {
    logout();
    setCurrentApp(null);
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="relative z-10 flex h-16 items-center justify-between border-b border-border/50 bg-card/30 backdrop-blur-xl px-6">
      {/* Search */}
      <div className="relative w-80" ref={searchContainerRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={searchInputRef}
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={handleSearchKeyDown}
          className="pl-10 bg-secondary/50 border-border/50 focus:bg-secondary focus:border-primary/50 transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[hsl(225,25%,10%)] border border-border rounded-lg shadow-xl overflow-hidden z-50">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Applications
                </div>
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors ${
                      index === selectedIndex ? 'bg-secondary/50' : ''
                    }`}
                  >
                    <span className="flex items-center justify-center h-8 w-8 rounded-md bg-secondary text-muted-foreground">
                      {result.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                No results found for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 gap-3 px-2 hover:bg-secondary/50">
              <Avatar className="h-8 w-8 border-2 border-primary/30">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-semibold">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground">{user?.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
