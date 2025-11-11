import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MagnifyingGlass, Plus, Wrench, Calendar, MapPin, CurrencyDollar, Barcode } from '@phosphor-icons/react';
import { useState, useMemo } from 'react';
import { useAssets, useAsset, useCreateAsset, useUpdateAsset, useLogAssetService, useTransitionAssetState } from '@/hooks/api';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/ui/error';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/helpers';
import { toast } from 'sonner';

export function ResourcesView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isStateDialogOpen, setIsStateDialogOpen] = useState(false);

  const { data: assetsData, isLoading, error, refetch } = useAssets({ perPage: 100 });
  const { data: selectedAsset } = useAsset(selectedAssetId || '');
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const logServiceMutation = useLogAssetService();
  const transitionStateMutation = useTransitionAssetState();

  const assets = assetsData?.data || [];

  // Asset types to support
  const assetTypes = [
    'Crane',
    'Forklift',
    'Vehicle',
    'Laptop',
    'Tablet',
    'Lifting Equipment',
    'Simulator',
    'Classroom',
    'Training Yard',
    'Safety Equipment',
    'Other',
  ];

  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.type.toLowerCase().includes(query) ||
          (asset.serialNumber && asset.serialNumber.toLowerCase().includes(query)) ||
          (asset.location && asset.location.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((asset) => asset.type === typeFilter);
    }

    return filtered;
  }, [assets, searchQuery, statusFilter, typeFilter]);

  // Count assets by status
  const statusCounts = useMemo(() => {
    return {
      Available: assets.filter((a) => a.status === 'Available').length,
      Assigned: assets.filter((a) => a.status === 'Assigned').length,
      Servicing: assets.filter((a) => a.status === 'Servicing').length,
      Retired: assets.filter((a) => a.status === 'Retired').length,
    };
  }, [assets]);

  // Assets due for service
  const assetsDueForService = useMemo(() => {
    const now = new Date();
    return assets.filter((asset) => {
      if (!asset.nextServiceAt) return false;
      const serviceDate = new Date(asset.nextServiceAt);
      const daysUntilService = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilService <= 30 && daysUntilService >= 0;
    });
  }, [assets]);

  const handleCreateAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await createAssetMutation.mutateAsync({
        type: formData.get('type') as string,
        name: formData.get('name') as string,
        serialNumber: formData.get('serialNumber') as string || undefined,
        location: formData.get('location') as string || undefined,
        purchaseDate: formData.get('purchaseDate') as string || undefined,
        purchaseCost: formData.get('purchaseCost') ? parseFloat(formData.get('purchaseCost') as string) : undefined,
      });
      setIsCreateDialogOpen(false);
      toast.success('Asset created successfully');
    } catch (error) {
      toast.error('Failed to create asset');
    }
  };

  const handleLogService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    const formData = new FormData(e.currentTarget);

    try {
      await logServiceMutation.mutateAsync({
        id: selectedAssetId,
        data: {
          serviceDate: new Date().toISOString(),
          servicedBy: formData.get('servicedBy') as string || undefined,
          notes: formData.get('notes') as string || undefined,
          cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : undefined,
        },
      });
      setIsServiceDialogOpen(false);
      toast.success('Service logged successfully');
    } catch (error) {
      toast.error('Failed to log service');
    }
  };

  const handleTransitionState = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    const formData = new FormData(e.currentTarget);

    try {
      await transitionStateMutation.mutateAsync({
        id: selectedAssetId,
        data: {
          state: formData.get('state') as 'Available' | 'Assigned' | 'Servicing' | 'Retired',
          notes: formData.get('notes') as string || undefined,
        },
      });
      setIsStateDialogOpen(false);
      toast.success('Asset state updated successfully');
    } catch (error) {
      toast.error('Failed to update asset state');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'default';
      case 'Assigned':
        return 'secondary';
      case 'Servicing':
        return 'outline';
      case 'Retired':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getComplianceStatus = (asset: typeof assets[0]) => {
    if (!asset.nextServiceAt) return { status: 'unknown', label: 'No schedule' };
    
    const now = new Date();
    const serviceDate = new Date(asset.nextServiceAt);
    const daysUntilService = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilService < 0) return { status: 'overdue', label: 'Overdue' };
    if (daysUntilService <= 7) return { status: 'urgent', label: 'Due Soon' };
    if (daysUntilService <= 30) return { status: 'warning', label: 'Due' };
    return { status: 'current', label: 'Current' };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Resource Management</h2>
          <p className="text-muted-foreground mt-1">Track assets, equipment, and infrastructure</p>
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Resource Management</h2>
          <p className="text-muted-foreground mt-1">Track assets, equipment, and infrastructure</p>
        </div>
        <ErrorDisplay error={error} title="Failed to load assets" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Resource Management</h2>
          <p className="text-muted-foreground mt-1">Track assets, equipment, and infrastructure</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>Create a new asset record for tracking and maintenance</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Asset Type</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name</Label>
                <Input id="name" name="name" required placeholder="e.g., Mobile Crane #1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" name="serialNumber" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="e.g., Training Yard A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input id="purchaseDate" name="purchaseDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseCost">Purchase Cost</Label>
                  <Input id="purchaseCost" name="purchaseCost" type="number" step="0.01" placeholder="$" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAssetMutation.isPending}>
                  {createAssetMutation.isPending ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.Available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.Assigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statusCounts.Servicing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due for Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{assetsDueForService.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="assets-search"
            placeholder="Search by name, type, serial, or location..."
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
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Assigned">Assigned</SelectItem>
            <SelectItem value="Servicing">Servicing</SelectItem>
            <SelectItem value="Retired">Retired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {assetTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assets List */}
      <div className="grid gap-4">
        {filteredAssets.map((asset) => {
          const complianceStatus = getComplianceStatus(asset);
          
          return (
            <Card
              key={asset.id}
              className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => setSelectedAssetId(asset.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={getStatusColor(asset.status)}>{asset.status}</Badge>
                      <Badge variant="outline">{asset.type}</Badge>
                      {complianceStatus.status === 'overdue' && (
                        <Badge variant="destructive">{complianceStatus.label}</Badge>
                      )}
                      {complianceStatus.status === 'urgent' && (
                        <Badge variant="destructive">{complianceStatus.label}</Badge>
                      )}
                      {complianceStatus.status === 'warning' && (
                        <Badge variant="secondary">{complianceStatus.label}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {asset.serialNumber && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Barcode className="w-4 h-4" />
                      <span>{asset.serialNumber}</span>
                    </div>
                  )}
                  {asset.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{asset.location}</span>
                    </div>
                  )}
                  {asset.lastServiceAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wrench className="w-4 h-4" />
                      <span>Last: {formatDate(asset.lastServiceAt)}</span>
                    </div>
                  )}
                  {asset.nextServiceAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Next: {formatDate(asset.nextServiceAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No assets found</p>
            {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="text-primary text-sm mt-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Asset Detail Dialog */}
      <Dialog open={!!selectedAssetId} onOpenChange={(open) => !open && setSelectedAssetId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedAsset && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle>{selectedAsset.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-2">
                      <Badge variant={getStatusColor(selectedAsset.status)}>{selectedAsset.status}</Badge>
                      <Badge variant="outline">{selectedAsset.type}</Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Asset Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedAsset.serialNumber && (
                    <div>
                      <Label>Serial Number</Label>
                      <p className="mt-1">{selectedAsset.serialNumber}</p>
                    </div>
                  )}
                  {selectedAsset.location && (
                    <div>
                      <Label>Location</Label>
                      <p className="mt-1">{selectedAsset.location}</p>
                    </div>
                  )}
                  {selectedAsset.purchaseDate && (
                    <div>
                      <Label>Purchase Date</Label>
                      <p className="mt-1">{formatDate(selectedAsset.purchaseDate)}</p>
                    </div>
                  )}
                  {selectedAsset.purchaseCost && (
                    <div>
                      <Label>Purchase Cost</Label>
                      <p className="mt-1">${selectedAsset.purchaseCost.toFixed(2)}</p>
                    </div>
                  )}
                  {selectedAsset.lastServiceAt && (
                    <div>
                      <Label>Last Service</Label>
                      <p className="mt-1">{formatDate(selectedAsset.lastServiceAt)}</p>
                    </div>
                  )}
                  {selectedAsset.nextServiceAt && (
                    <div>
                      <Label>Next Service</Label>
                      <p className="mt-1">{formatDate(selectedAsset.nextServiceAt)}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Wrench className="w-4 h-4 mr-2" />
                        Log Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Service Event</DialogTitle>
                        <DialogDescription>Record a maintenance or service event for this asset</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleLogService} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="servicedBy">Serviced By</Label>
                          <Input id="servicedBy" name="servicedBy" placeholder="Name or organization" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Service Notes</Label>
                          <Textarea id="notes" name="notes" placeholder="Describe work performed" rows={3} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cost">Service Cost</Label>
                          <Input id="cost" name="cost" type="number" step="0.01" placeholder="$" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsServiceDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={logServiceMutation.isPending}>
                            {logServiceMutation.isPending ? 'Logging...' : 'Log Service'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isStateDialogOpen} onOpenChange={setIsStateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change State
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Asset State</DialogTitle>
                        <DialogDescription>Update the lifecycle state of this asset</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleTransitionState} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="state">New State</Label>
                          <Select name="state" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Available">Available</SelectItem>
                              <SelectItem value="Assigned">Assigned</SelectItem>
                              <SelectItem value="Servicing">Servicing</SelectItem>
                              <SelectItem value="Retired">Retired</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea id="notes" name="notes" placeholder="Reason for state change" rows={2} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsStateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={transitionStateMutation.isPending}>
                            {transitionStateMutation.isPending ? 'Updating...' : 'Update State'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Service History */}
                <div>
                  <h4 className="font-semibold mb-3">Service History</h4>
                  {selectedAsset.services && selectedAsset.services.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAsset.services.map((service) => (
                        <Card key={service.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(service.serviceDate)}</span>
                              </div>
                              {service.cost && (
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <CurrencyDollar className="w-4 h-4" />
                                  <span>${service.cost.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                            {service.servicedBy && (
                              <p className="text-sm mb-1">
                                <span className="font-medium">Serviced by:</span> {service.servicedBy}
                              </p>
                            )}
                            {service.notes && <p className="text-sm text-muted-foreground">{service.notes}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No service history recorded</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
