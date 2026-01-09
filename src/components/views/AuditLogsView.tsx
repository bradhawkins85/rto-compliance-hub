import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
}

interface AuditLogStats {
  totalLogs: number;
  actionStats: Array<{ action: string; count: number }>;
  entityTypeStats: Array<{ entityType: string; count: number }>;
  topUsers: Array<{ userId: string; _count: { id: number }; user: any }>;
}

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, searchQuery, actionFilter, entityTypeFilter, dateFromFilter, dateToFilter]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '20',
      });

      if (searchQuery) params.append('q', searchQuery);
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);

      const response = await fetch(`/api/v1/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.data);
      setTotalPages(data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);

      const response = await fetch(`/api/v1/audit-logs/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit log stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const exportLogs = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format: 'csv',
      });

      if (searchQuery) params.append('q', searchQuery);
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);

      const response = await fetch(`/api/v1/audit-logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('');
    setEntityTypeFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      read: 'bg-gray-100 text-gray-800',
      login: 'bg-purple-100 text-purple-800',
      logout: 'bg-purple-100 text-purple-800',
      sync: 'bg-indigo-100 text-indigo-800',
      export: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <Badge className={variants[action] || 'bg-gray-100 text-gray-800'}>
        {action}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all system activities and changes
          </p>
        </div>
        <Button
          onClick={exportLogs}
          disabled={exporting}
          className="flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Logs</div>
            <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Most Common Action</div>
            <div className="text-2xl font-bold">
              {stats.actionStats[0]?.action || 'N/A'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Most Active Entity</div>
            <div className="text-2xl font-bold">
              {stats.entityTypeStats[0]?.entityType || 'N/A'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Top User Activity</div>
            <div className="text-2xl font-bold">
              {stats.topUsers[0]?._count.id || 0}
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <FunnelIcon className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">Action</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="read">Read</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="sync">Sync</option>
                  <option value="export">Export</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Entity Type</label>
                <select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Entities</option>
                  <option value="Policy">Policy</option>
                  <option value="User">User</option>
                  <option value="Credential">Credential</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Asset">Asset</option>
                  <option value="PDItem">PD Item</option>
                  <option value="Auth">Auth</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date From</label>
                <Input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date To</label>
                <Input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>

              <div className="md:col-span-4 flex justify-end">
                <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-2">
                  <XMarkIcon className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {/* Audit Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Entity</th>
                <th className="px-4 py-3 text-left text-sm font-medium">IP Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      {formatDate(log.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{log.user.name}</div>
                        <div className="text-xs text-muted-foreground">{log.user.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium">{log.entityType}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {log.entityId.substring(0, 8)}...
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono text-xs">
                      {log.ipAddress || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="flex items-center gap-1"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Audit Log Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <div className="mt-1">{formatDate(selectedLog.createdAt)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <div className="mt-1">
                    {selectedLog.user.name} ({selectedLog.user.email})
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                  <div className="mt-1">{selectedLog.entityType}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity ID</label>
                  <div className="mt-1 font-mono text-sm">{selectedLog.entityId}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <div className="mt-1 font-mono text-sm">{selectedLog.ipAddress || 'N/A'}</div>
                </div>

                {selectedLog.userAgent && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                    <div className="mt-1 text-sm break-all">{selectedLog.userAgent}</div>
                  </div>
                )}

                {selectedLog.changes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Changes</label>
                    <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
