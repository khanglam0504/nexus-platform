'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun, Check } from 'lucide-react';

const themes = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Sáng sủa, dễ đọc',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Tối, dễ nhìn ban đêm',
  },
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Theo cài đặt hệ thống',
  },
] as const;

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Giao diện</CardTitle>
          <CardDescription>Chọn theme cho ứng dụng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {themes.map((t) => (
              <div
                key={t.value}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-muted"
              >
                <t.icon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">{t.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giao diện</CardTitle>
        <CardDescription>Chọn theme cho ứng dụng</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:border-primary/50',
                theme === t.value
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:bg-muted/50'
              )}
            >
              {theme === t.value && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              <t.icon
                className={cn(
                  'h-6 w-6',
                  theme === t.value ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground text-center">
                {t.description}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
