import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MagnifyingGlass, 
  Download, 
  TrendUp, 
  TrendDown, 
  Star,
  ChatCircle,
  Users,
  Building,
  GraduationCap,
} from '@phosphor-icons/react';
import { useState, useMemo } from 'react';
import { useFeedback, useFeedbackInsights, useExportFeedback } from '@/hooks/api';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/ui/error';
import { formatDate } from '@/lib/helpers';
import { toast } from 'sonner';

export function FeedbackView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'30' | '90' | 'all'>('90');

  // Calculate date range
  const dateFrom = useMemo(() => {
    if (dateRange === 'all') return undefined;
    const days = parseInt(dateRange);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }, [dateRange]);

  // Fetch feedback with filters
  const { data: feedbackData, isLoading, error, refetch } = useFeedback({
    type: typeFilter === 'all' ? undefined : typeFilter as any,
    dateFrom,
    perPage: 100,
  });

  // Fetch insights
  const { data: insights } = useFeedbackInsights({
    type: typeFilter === 'all' ? undefined : typeFilter as any,
    dateFrom,
  });

  // Export mutation
  const exportMutation = useExportFeedback();

  const feedback = feedbackData?.data || [];

  // Filter feedback by search query
  const filteredFeedback = useMemo(() => {
    if (!searchQuery) return feedback;
    const query = searchQuery.toLowerCase();
    return feedback.filter(item =>
      item.comments?.toLowerCase().includes(query) ||
      item.trainingProduct?.name.toLowerCase().includes(query) ||
      item.trainingProduct?.code.toLowerCase().includes(query)
    );
  }, [feedback, searchQuery]);

  // Handle export
  const handleExport = () => {
    exportMutation.mutate(
      {
        type: typeFilter === 'all' ? undefined : typeFilter as any,
        dateFrom,
      },
      {
        onSuccess: () => {
          toast.success('Feedback exported successfully');
        },
        onError: () => {
          toast.error('Failed to export feedback');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Feedback Management</h2>
          <p className="text-muted-foreground mt-1">Learner, employer, and industry feedback</p>
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Feedback Management</h2>
          <p className="text-muted-foreground mt-1">Learner, employer, and industry feedback</p>
        </div>
        <ErrorDisplay 
          error={error} 
          title="Failed to load feedback"
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Feedback Management</h2>
          <p className="text-muted-foreground mt-1">Learner, employer, and industry feedback</p>
        </div>
        <Button onClick={handleExport} disabled={exportMutation.isPending}>
          <Download className="w-4 h-4 mr-2" />
          {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Key Metrics */}
      {insights && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <ChatCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.summary.totalCount}</div>
              <p className="text-xs text-muted-foreground">
                Last {dateRange === '30' ? '30' : '90'} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {insights.summary.averageRating !== null
                  ? insights.summary.averageRating.toFixed(1)
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">Out of 5.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
              {insights.trend.direction === 'improving' ? (
                <TrendUp className="h-4 w-4 text-green-500" />
              ) : insights.trend.direction === 'declining' ? (
                <TrendDown className="h-4 w-4 text-red-500" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {insights.summary.averageSentiment !== null
                  ? insights.summary.averageSentiment > 0
                    ? 'Positive'
                    : insights.summary.averageSentiment < 0
                    ? 'Negative'
                    : 'Neutral'
                  : 'N/A'}
              </div>
              {insights.trend.direction && (
                <p className="text-xs text-muted-foreground capitalize">
                  {insights.trend.direction}
                  {insights.trend.percentage !== null && ` (${insights.trend.percentage > 0 ? '+' : ''}${insights.trend.percentage}%)`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {insights.topThemes.length > 0 ? insights.topThemes[0].theme : 'N/A'}
              </div>
              {insights.topThemes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {insights.topThemes[0].count} mentions
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights Panel */}
      {insights && insights.recommendations.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendUp className="w-4 h-4" />
              AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="feedback-search"
            placeholder="Search feedback comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="learner">Learner</SelectItem>
            <SelectItem value="employer">Employer</SelectItem>
            <SelectItem value="industry">Industry</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback by Type Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary">{filteredFeedback.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="learner" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Learner
            <Badge variant="secondary">
              {filteredFeedback.filter(f => f.type === 'learner').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="employer" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Employer
            <Badge variant="secondary">
              {filteredFeedback.filter(f => f.type === 'employer').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="industry" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Industry
            <Badge variant="secondary">
              {filteredFeedback.filter(f => f.type === 'industry').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {['all', 'learner', 'employer', 'industry'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
            {filteredFeedback
              .filter(f => tabValue === 'all' || f.type === tabValue)
              .map(item => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            item.type === 'learner' ? 'default' :
                            item.type === 'employer' ? 'secondary' :
                            'outline'
                          }>
                            {item.type}
                          </Badge>
                          {item.trainingProduct && (
                            <span className="text-sm text-muted-foreground">
                              {item.trainingProduct.code} - {item.trainingProduct.name}
                            </span>
                          )}
                          {item.anonymous && (
                            <Badge variant="outline">Anonymous</Badge>
                          )}
                        </div>
                        {item.rating !== null && item.rating !== undefined && (
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className="w-4 h-4"
                                weight={idx < item.rating! ? 'fill' : 'regular'}
                                color={idx < item.rating! ? '#f59e0b' : undefined}
                              />
                            ))}
                            <span className="text-sm text-muted-foreground ml-2">
                              {item.rating.toFixed(1)} / 5.0
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(item.submittedAt)}
                        </p>
                        {item.sentiment !== null && item.sentiment !== undefined && (
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <span className="text-xs text-muted-foreground">Sentiment:</span>
                            <Badge variant={
                              item.sentiment > 0.3 ? 'default' :
                              item.sentiment < -0.3 ? 'destructive' :
                              'secondary'
                            } className="text-xs">
                              {item.sentiment > 0.3 ? 'Positive' :
                               item.sentiment < -0.3 ? 'Negative' :
                               'Neutral'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {item.comments && (
                    <CardContent>
                      <p className="text-sm">{item.comments}</p>
                      {item.themes && item.themes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.themes.map((theme, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            {filteredFeedback.filter(f => tabValue === 'all' || f.type === tabValue).length === 0 && (
              <div className="text-center py-12">
                <ChatCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'No feedback has been submitted yet'}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
