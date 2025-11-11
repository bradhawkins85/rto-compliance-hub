import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MagnifyingGlass,
  Plus,
  Warning,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  ChatCircle,
  TrendUp,
  User,
} from '@phosphor-icons/react';
import { useState, useMemo } from 'react';
import {
  useComplaints,
  useComplaint,
  useCreateComplaint,
  useUpdateComplaint,
  useCloseComplaint,
  useEscalateComplaint,
  useAddComplaintNote,
  useComplaintTimeline,
} from '@/hooks/api';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/ui/error';
import { formatDate } from '@/lib/helpers';
import { toast } from 'sonner';
import type { Complaint, CreateComplaintData, CloseComplaintData } from '@/lib/api';

export function ComplaintsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter] = useState<string>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  // Fetch complaints with filters
  const { data: complaintsData, isLoading, error, refetch } = useComplaints({
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    source: sourceFilter === 'all' ? undefined : (sourceFilter as any),
    slaBreach: slaFilter === 'all' ? undefined : slaFilter,
    perPage: 100,
  });

  // Fetch selected complaint details
  const { data: selectedComplaintData } = useComplaint(selectedComplaint || '');
  
  // Fetch timeline for selected complaint
  const { data: timeline } = useComplaintTimeline(selectedComplaint || '');

  // Mutations
  const createMutation = useCreateComplaint();
  const updateMutation = useUpdateComplaint();
  const closeMutation = useCloseComplaint();
  const escalateMutation = useEscalateComplaint();
  const addNoteMutation = useAddComplaintNote();

  const complaints = complaintsData?.data || [];

  // Filter complaints by search query
  const filteredComplaints = useMemo(() => {
    if (!searchQuery) return complaints;
    const query = searchQuery.toLowerCase();
    return complaints.filter(complaint =>
      complaint.description.toLowerCase().includes(query) ||
      complaint.studentId?.toLowerCase().includes(query) ||
      complaint.trainer?.name.toLowerCase().includes(query) ||
      complaint.trainingProduct?.name.toLowerCase().includes(query)
    );
  }, [complaints, searchQuery]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredComplaints.length;
    const newCount = filteredComplaints.filter(c => c.status === 'New').length;
    const inReviewCount = filteredComplaints.filter(c => c.status === 'InReview').length;
    const actionedCount = filteredComplaints.filter(c => c.status === 'Actioned').length;
    const closedCount = filteredComplaints.filter(c => c.status === 'Closed').length;
    const slaBreachCount = filteredComplaints.filter(c => c.slaBreach && c.status !== 'Closed').length;

    return {
      total,
      newCount,
      inReviewCount,
      actionedCount,
      closedCount,
      slaBreachCount,
    };
  }, [filteredComplaints]);

  // Status badge helper
  const getStatusBadge = (status: string, slaBreach?: boolean) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      New: { label: 'New', variant: 'destructive' },
      InReview: { label: 'In Review', variant: 'secondary' },
      Actioned: { label: 'Actioned', variant: 'outline' },
      Closed: { label: 'Closed', variant: 'default' },
    };
    
    const config = badges[status] || { label: status, variant: 'outline' };
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant}>{config.label}</Badge>
        {slaBreach && status !== 'Closed' && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Warning className="w-3 h-3" />
            SLA Breach
          </Badge>
        )}
      </div>
    );
  };

  // Status icon helper
  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      New: <XCircle className="w-5 h-5 text-red-500" />,
      InReview: <Clock className="w-5 h-5 text-yellow-500" />,
      Actioned: <ArrowRight className="w-5 h-5 text-blue-500" />,
      Closed: <CheckCircle className="w-5 h-5 text-green-500" />,
    };
    return icons[status] || <Clock className="w-5 h-5 text-gray-500" />;
  };

  // Handle create complaint
  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: CreateComplaintData = {
      source: formData.get('source') as any,
      description: formData.get('description') as string,
      studentId: formData.get('studentId') as string || undefined,
      trainerId: formData.get('trainerId') as string || undefined,
      trainingProductId: formData.get('trainingProductId') as string || undefined,
      courseId: formData.get('courseId') as string || undefined,
    };

    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Complaint created successfully');
        setIsCreateDialogOpen(false);
        e.currentTarget.reset();
      },
      onError: () => {
        toast.error('Failed to create complaint');
      },
    });
  };

  // Handle status update
  const handleStatusUpdate = (complaintId: string, newStatus: string) => {
    updateMutation.mutate(
      { id: complaintId, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          toast.success(`Complaint status updated to ${newStatus}`);
        },
        onError: () => {
          toast.error('Failed to update complaint status');
        },
      }
    );
  };

  // Handle close complaint
  const handleClose = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const formData = new FormData(e.currentTarget);
    const data: CloseComplaintData = {
      rootCause: formData.get('rootCause') as string,
      correctiveAction: formData.get('correctiveAction') as string,
      notes: formData.get('notes') as string || undefined,
    };

    closeMutation.mutate(
      { id: selectedComplaint, data },
      {
        onSuccess: () => {
          toast.success('Complaint closed successfully');
          setIsCloseDialogOpen(false);
          e.currentTarget.reset();
        },
        onError: () => {
          toast.error('Failed to close complaint');
        },
      }
    );
  };

  // Handle escalate
  const handleEscalate = (complaintId: string) => {
    escalateMutation.mutate(
      { id: complaintId, notes: 'Escalated to management for review' },
      {
        onSuccess: () => {
          toast.success('Complaint escalated to management');
        },
        onError: () => {
          toast.error('Failed to escalate complaint');
        },
      }
    );
  };

  // Handle add note
  const handleAddNote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const formData = new FormData(e.currentTarget);
    const notes = formData.get('notes') as string;

    addNoteMutation.mutate(
      { id: selectedComplaint, notes },
      {
        onSuccess: () => {
          toast.success('Note added successfully');
          setIsNoteDialogOpen(false);
          e.currentTarget.reset();
        },
        onError: () => {
          toast.error('Failed to add note');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Complaints & Appeals</h2>
          <p className="text-muted-foreground mt-1">Track and manage complaints through resolution</p>
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Complaints & Appeals</h2>
          <p className="text-muted-foreground mt-1">Track and manage complaints through resolution</p>
        </div>
        <ErrorDisplay 
          error={error} 
          title="Failed to load complaints"
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
          <h2 className="text-2xl font-semibold tracking-tight">Complaints & Appeals</h2>
          <p className="text-muted-foreground mt-1">Track and manage complaints through resolution</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Complaint</DialogTitle>
                <DialogDescription>
                  Log a new complaint or appeal for tracking and resolution.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="source">Source *</Label>
                  <Select name="source" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Employer">Employer</SelectItem>
                      <SelectItem value="External">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Describe the complaint..."
                    rows={4}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input id="studentId" name="studentId" placeholder="Student identifier" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trainerId">Trainer ID</Label>
                  <Input id="trainerId" name="trainerId" placeholder="Trainer UUID" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="courseId">Course ID</Label>
                  <Input id="courseId" name="courseId" placeholder="Course identifier" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Complaint'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ChatCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">All complaints</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inReviewCount}</div>
            <p className="text-xs text-muted-foreground">Under investigation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actioned</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.actionedCount}</div>
            <p className="text-xs text-muted-foreground">Being resolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.closedCount}</div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>

        <Card className={metrics.slaBreachCount > 0 ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breach</CardTitle>
            <Warning className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics.slaBreachCount}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="InReview">In Review</SelectItem>
            <SelectItem value="Actioned">Actioned</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Student">Student</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
            <SelectItem value="Employer">Employer</SelectItem>
            <SelectItem value="External">External</SelectItem>
          </SelectContent>
        </Select>

        <Select value={slaFilter} onValueChange={setSlaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by SLA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Complaints</SelectItem>
            <SelectItem value="true">SLA Breached</SelectItem>
            <SelectItem value="false">Within SLA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Complaints List */}
      <div className="grid gap-4">
        {filteredComplaints.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <ChatCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No complaints found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredComplaints.map((complaint) => (
            <Card key={complaint.id} className={complaint.slaBreach ? 'border-red-300' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(complaint.status)}
                      <CardTitle className="text-lg">
                        {complaint.source} Complaint
                      </CardTitle>
                      {getStatusBadge(complaint.status, complaint.slaBreach)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted {formatDate(complaint.submittedAt)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{complaint.description}</p>
                
                {/* Details */}
                <div className="grid gap-2 text-sm">
                  {complaint.studentId && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Student:</span>
                      <span>{complaint.studentId}</span>
                    </div>
                  )}
                  {complaint.trainer && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Trainer:</span>
                      <span>{complaint.trainer.name}</span>
                    </div>
                  )}
                  {complaint.trainingProduct && (
                    <div className="flex items-center gap-2">
                      <TrendUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Course:</span>
                      <span>{complaint.trainingProduct.code} - {complaint.trainingProduct.name}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedComplaint(complaint.id)}
                  >
                    View Details
                  </Button>
                  
                  {complaint.status === 'New' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusUpdate(complaint.id, 'InReview')}
                      disabled={updateMutation.isPending}
                    >
                      Start Review
                    </Button>
                  )}
                  
                  {complaint.status === 'InReview' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusUpdate(complaint.id, 'Actioned')}
                      disabled={updateMutation.isPending}
                    >
                      Mark as Actioned
                    </Button>
                  )}
                  
                  {(complaint.status === 'InReview' || complaint.status === 'Actioned') && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedComplaint(complaint.id);
                          setIsCloseDialogOpen(true);
                        }}
                      >
                        Close Complaint
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEscalate(complaint.id)}
                        disabled={escalateMutation.isPending}
                      >
                        <Warning className="w-4 h-4 mr-1" />
                        Escalate
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setSelectedComplaint(complaint.id);
                      setIsNoteDialogOpen(true);
                    }}
                  >
                    <ChatCircle className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Complaint Details Dialog */}
      {selectedComplaintData && (
        <Dialog open={!!selectedComplaint && !isCloseDialogOpen && !isNoteDialogOpen} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(selectedComplaintData.status)}
                {selectedComplaintData.source} Complaint
              </DialogTitle>
              <DialogDescription>
                Submitted {formatDate(selectedComplaintData.submittedAt)}
                {selectedComplaintData.closedAt && ` • Closed ${formatDate(selectedComplaintData.closedAt)}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Status Badge */}
              <div>
                {getStatusBadge(selectedComplaintData.status, selectedComplaintData.slaBreach)}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedComplaintData.description}</p>
              </div>

              {/* Details */}
              <div>
                <h4 className="text-sm font-medium mb-2">Details</h4>
                <div className="grid gap-2 text-sm">
                  {selectedComplaintData.studentId && (
                    <div><span className="text-muted-foreground">Student ID:</span> {selectedComplaintData.studentId}</div>
                  )}
                  {selectedComplaintData.trainer && (
                    <div><span className="text-muted-foreground">Trainer:</span> {selectedComplaintData.trainer.name} ({selectedComplaintData.trainer.email})</div>
                  )}
                  {selectedComplaintData.trainingProduct && (
                    <div><span className="text-muted-foreground">Training Product:</span> {selectedComplaintData.trainingProduct.code} - {selectedComplaintData.trainingProduct.name}</div>
                  )}
                  {selectedComplaintData.courseId && (
                    <div><span className="text-muted-foreground">Course ID:</span> {selectedComplaintData.courseId}</div>
                  )}
                </div>
              </div>

              {/* Resolution */}
              {(selectedComplaintData.rootCause || selectedComplaintData.correctiveAction) && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Resolution</h4>
                  {selectedComplaintData.rootCause && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Root Cause:</span>
                      <p className="text-sm mt-1">{selectedComplaintData.rootCause}</p>
                    </div>
                  )}
                  {selectedComplaintData.correctiveAction && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Corrective Action:</span>
                      <p className="text-sm mt-1">{selectedComplaintData.correctiveAction}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              {timeline && timeline.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Timeline</h4>
                  <div className="space-y-2">
                    {timeline.map((entry, index) => (
                      <div key={entry.id} className="flex gap-2 text-sm">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.status === 'Closed' ? 'bg-green-500' :
                            entry.status === 'Actioned' ? 'bg-blue-500' :
                            entry.status === 'InReview' ? 'bg-yellow-500' :
                            entry.status === 'Escalated' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`} />
                          {index < timeline.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="font-medium">{entry.status}</div>
                          {entry.notes && (
                            <div className="text-muted-foreground">{entry.notes}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(entry.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Close Complaint Dialog */}
      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <form onSubmit={handleClose}>
            <DialogHeader>
              <DialogTitle>Close Complaint</DialogTitle>
              <DialogDescription>
                Provide root cause analysis and corrective actions taken.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rootCause">Root Cause *</Label>
                <Textarea 
                  id="rootCause" 
                  name="rootCause" 
                  placeholder="Describe the root cause..."
                  rows={3}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="correctiveAction">Corrective Action *</Label>
                <Textarea 
                  id="correctiveAction" 
                  name="correctiveAction" 
                  placeholder="Describe corrective actions taken..."
                  rows={3}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  placeholder="Any additional context..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={closeMutation.isPending}>
                {closeMutation.isPending ? 'Closing...' : 'Close Complaint'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddNote}>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>
                Add a note or update to this complaint.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="noteContent">Note *</Label>
                <Textarea 
                  id="noteContent" 
                  name="notes" 
                  placeholder="Enter your note..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addNoteMutation.isPending}>
                {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
