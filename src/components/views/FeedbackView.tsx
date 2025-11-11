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
import { FilterBar, type ActiveFilter } from '@/components/ui/filter-bar';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SavedFilters } from '@/components/ui/saved-filters';
import { SortableHeader } from '@/components/ui/sortable-header';
import { useDebounce } from '@/hooks/useDebounce';
import { useSort } from '@/hooks/useSort';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { DateRange } from 'react-day-picker';

export function FeedbackView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter presets
  const { presets, savePreset, deletePreset } = useFilterPresets('feedback');

  // Calculate date range for API
  const dateFrom = useMemo(() => {
    if (dateRange?.from) {
      return dateRange.from.toISOString();
    }
    return undefined;
  }, [dateRange]);

  const dateTo = useMemo(() => {
    if (dateRange?.to) {
      return dateRange.to.toISOString();
    }
    return undefined;
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

  // Filter feedback by search query and rating
  const filteredFeedback = useMemo(() => {
    let filtered = feedback;

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(item =>
        item.comments?.toLowerCase().includes(query) ||
        item.trainingProduct?.name.toLowerCase().includes(query) ||
        item.trainingProduct?.code.toLowerCase().includes(query)
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseInt(ratingFilter);
      filtered = filtered.filter(item => 
        item.rating !== null && item.rating !== undefined && item.rating >= minRating
      );
    }

    // Date range filter (client-side for more precision)
    if (dateRange?.from) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.submittedAt);
        if (dateRange.to) {
          return itemDate >= dateRange.from! && itemDate <= dateRange.to;
        }
        return itemDate >= dateRange.from!;
      });
    }

    return filtered;
  }, [feedback, debouncedSearch, ratingFilter, dateRange]);

  // Sorting
  const { sortedData, sortConfig, handleSort } = useSort(filteredFeedback, 'submittedAt', 'desc');

  // Active filters
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = [];
    
    if (typeFilter !== 'all') {
      filters.push({ id: 'type', label: 'Type', value: typeFilter });
    }
    if (ratingFilter !== 'all') {
      filters.push({ id: 'rating', label: 'Min Rating', value: `${ratingFilter}+ stars` });
    }
    if (dateRange?.from) {
      const value = dateRange.to
        ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
        : `From ${formatDate(dateRange.from)}`;
      filters.push({ id: 'dateRange', label: 'Date Range', value });
    }
    
    return filters;
  }, [typeFilter, ratingFilter, dateRange]);

  // Handle filter removal
  const handleRemoveFilter = (id: string) => {
    switch (id) {
      case 'type':
        setTypeFilter('all');
        break;
      case 'rating':
        setRatingFilter('all');
        break;
      case 'dateRange':
        setDateRange(undefined);
        break;
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setRatingFilter('all');
    setDateRange(undefined);
  };

  // Handle save preset
  const handleSavePreset = (name: string) => {
    savePreset(name, {
      searchQuery,
      typeFilter,
      ratingFilter,
      dateRange,
    });
  };

  // Handle load preset
  const handleLoadPreset = (filters: Record<string, any>) => {
    setSearchQuery(filters.searchQuery || '');
    setTypeFilter(filters.typeFilter || 'all');
    setRatingFilter(filters.ratingFilter || 'all');
    setDateRange(filters.dateRange);
  };

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Feedback Management</h2>
          <p className="text-muted-foreground mt-1">Learner, employer, and industry feedback</p>
        </div>
        <div className="flex gap-2">
          <SavedFilters
            presets={presets}
            currentFilters={{ searchQuery, typeFilter, ratingFilter, dateRange }}
            onLoadPreset={handleLoadPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={deletePreset}
          />
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="w-4 h-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
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
                {dateRange?.from ? 'In date range' : 'All time'}
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
      <FilterBar
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAll}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="feedback-search"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="learner">Learner</SelectItem>
              <SelectItem value="employer">Employer</SelectItem>
              <SelectItem value="industry">Industry</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Minimum rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="2">2+ Stars</SelectItem>
              <SelectItem value="1">1+ Star</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="Date range"
          />
        </div>
      </FilterBar>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        <SortableHeader
          label="Date"
          field="submittedAt"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
        <SortableHeader
          label="Rating"
          field="rating"
          currentField={sortConfig.field}
          currentDirection={sortConfig.direction}
          onSort={handleSort}
        />
      </div>

      {/* Feedback by Type Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary">{sortedData.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="learner" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Learner
            <Badge variant="secondary">
              {sortedData.filter(f => f.type === 'learner').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="employer" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Employer
            <Badge variant="secondary">
              {sortedData.filter(f => f.type === 'employer').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="industry" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Industry
            <Badge variant="secondary">
              {sortedData.filter(f => f.type === 'industry').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {['all', 'learner', 'employer', 'industry'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-4">
            {sortedData
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
            {sortedData.filter(f => tabValue === 'all' || f.type === tabValue).length === 0 && (
              <div className="text-center py-12">
                <ChatCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
                <p className="text-muted-foreground">
                  {activeFilters.length > 0 || searchQuery
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
