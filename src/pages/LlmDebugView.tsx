/**
 * LLM Debug View
 * 
 * Enkel intern vy för att se senaste LLM-anrop och vilken provider som använts
 * (ChatGPT som moln-LLM och Ollama som lokal LLM).
 */

import { useLlmEvents, useLlmStats } from '@/hooks/useLlmEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function LlmDebugView() {
  const { data: events, isLoading: eventsLoading } = useLlmEvents(100);
  const { data: stats, isLoading: statsLoading } = useLlmStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LLM Debug & Overview</h1>
        <Badge variant="outline">Internal Tool</Badge>
      </div>

      {/* Stats Overview */}
      {statsLoading ? (
        <Card>
          <CardContent className="p-6">
            <Loader2 className="w-6 h-6 animate-spin" />
          </CardContent>
        </Card>
      ) : stats ? (
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Success</div>
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Failed</div>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fallback Used</div>
                <div className="text-2xl font-bold text-orange-600">{stats.fallbackUsed}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">ChatGPT (moln)</div>
                <div className="text-xl font-semibold">{stats.byProvider.cloud}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Ollama (lokal)</div>
                <div className="text-xl font-semibold">{stats.byProvider.local}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Latency</div>
                <div className="text-xl font-semibold">{stats.avgLatencyMs}ms</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent LLM Events</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !events || events.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              No LLM events yet. Generate some documentation or tests to see events here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Doc Type</th>
                    <th className="text-left p-2">Provider</th>
                    <th className="text-left p-2">Fallback</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Validation</th>
                    <th className="text-left p-2">Latency</th>
                    <th className="text-left p-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{event.docType}</Badge>
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={event.finalProvider === 'cloud' ? 'default' : 'secondary'}
                        >
                          {event.finalProvider}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {event.fallbackUsed ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="p-2">
                        {event.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>Failed</span>
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {event.validationOk !== undefined ? (
                          event.validationOk ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {event.latencyMs !== undefined ? `${event.latencyMs}ms` : '-'}
                      </td>
                      <td className="p-2">
                        {event.errorCode ? (
                          <div className="text-xs">
                            <div className="font-mono text-red-600">{event.errorCode}</div>
                            {event.errorMessage && (
                              <div className="text-muted-foreground truncate max-w-xs">
                                {event.errorMessage}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
