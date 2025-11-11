import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  PlayIcon, 
  PauseIcon, 
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Job {
  id: string;
  name: string;
  status: string;
  schedule: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastResult: string | null;
}

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export default function JobsView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    // Refresh every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/v1/jobs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs);
      setMetrics(data.queueMetrics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const triggerJob = async (jobName: string) => {
    setTriggeringJob(jobName);
    try {
      const response = await fetch('/api/v1/jobs/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: jobName }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger job');
      }

      // Refresh jobs list
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger job');
    } finally {
      setTriggeringJob(null);
    }
  };

  const pauseJob = async (jobName: string) => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobName}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to pause job');
      }

      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause job');
    }
  };

  const resumeJob = async (jobName: string, schedule: string) => {
    try {
      const response = await fetch(`/api/v1/jobs/${jobName}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          pattern: schedule, 
          tz: 'Australia/Sydney' 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resume job');
      }

      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume job');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'Running':
        return <Badge className="bg-yellow-100 text-yellow-800">Running</Badge>;
      case 'Completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'Failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'Paused':
        return <Badge className="bg-gray-100 text-gray-800">Paused</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatJobName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Job Scheduler</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage background jobs
          </p>
        </div>
        <Button onClick={fetchJobs} variant="outline">
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Queue Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{metrics.active}</p>
              </div>
              <PlayIcon className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waiting</p>
                <p className="text-2xl font-bold">{metrics.waiting}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{metrics.completed}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold">{metrics.failed}</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delayed</p>
                <p className="text-2xl font-bold">{metrics.delayed}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Jobs List */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Scheduled Jobs</h2>
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium">
                        {formatJobName(job.name)}
                      </h3>
                      {getStatusBadge(job.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Schedule:</span>{' '}
                        {job.schedule || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Last Run:</span>{' '}
                        {formatDate(job.lastRunAt)}
                      </div>
                      <div>
                        <span className="font-medium">Next Run:</span>{' '}
                        {formatDate(job.nextRunAt)}
                      </div>
                    </div>

                    {job.lastResult && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-gray-700">Last Result:</span>
                        <p className="text-gray-600 mt-1 font-mono text-xs">
                          {job.lastResult}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerJob(job.name)}
                      disabled={triggeringJob === job.name}
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      {triggeringJob === job.name ? 'Triggering...' : 'Run Now'}
                    </Button>

                    {job.status === 'Paused' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resumeJob(job.name, job.schedule || '0 0 * * *')}
                      >
                        <PlayIcon className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pauseJob(job.name)}
                        disabled={job.status === 'Paused'}
                      >
                        <PauseIcon className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {jobs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No scheduled jobs found
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
