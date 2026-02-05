'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Button,
} from '@repo/ui';
import { Terminal, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { useTranslations } from 'next-intl';

interface RealtimeLogsProps {
  logs: string[];
  loading?: boolean;
  onRefresh: () => void;
}

export function RealtimeLogs({ logs, loading, onRefresh }: RealtimeLogsProps) {
  const t = useTranslations('bots.detail.dashboard');
  const [expanded, setExpanded] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (expanded && autoRefresh && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expanded, autoRefresh]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(onRefresh, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const getLogLineClass = (line: string) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error')) {
      return 'text-red-400';
    }
    if (lowerLine.includes('warn')) {
      return 'text-yellow-400';
    }
    if (lowerLine.includes('info')) {
      return 'text-green-400';
    }
    return 'text-muted-foreground';
  };

  return (
    <Card>
      {/* 标题栏 */}
      <CardHeader
        className="pb-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">
              {t('realtimeLogs')}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              ({logs.length} {t('lines')})
            </span>
          </div>
          <div className="flex items-center gap-3">
            {expanded && (
              <>
                <label
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={autoRefresh}
                    onCheckedChange={(checked) =>
                      setAutoRefresh(checked === true)
                    }
                    className="size-3"
                  />
                  {t('autoRefresh')}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  disabled={loading}
                >
                  <RefreshCw
                    className={cn('size-3.5', loading && 'animate-spin')}
                  />
                </Button>
              </>
            )}
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* 日志内容 */}
      {expanded && (
        <CardContent className="pt-0">
          <div className="h-64 overflow-y-auto rounded-lg bg-muted/30 p-4 font-mono text-xs leading-relaxed">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>{t('noLogs')}</p>
              </div>
            ) : (
              <>
                {logs.map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      'py-0.5 whitespace-pre-wrap break-all',
                      getLogLineClass(line),
                    )}
                  >
                    {line}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
