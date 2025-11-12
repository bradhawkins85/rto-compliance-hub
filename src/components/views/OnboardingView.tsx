import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, Clock, XCircle, Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import {
  useOnboardingWorkflows,
  useOnboardingAssignments,
  useCreateWorkflow,
  useCreateAssignment,
} from '@/hooks/api'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ErrorDisplay } from '@/components/ui/error'
import { formatDate } from '@/lib/helpers'

// Helper to get status badge variant
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Completed':
      return 'default'
    case 'InProgress':
      return 'secondary'
    case 'NotStarted':
      return 'outline'
    default:
      return 'secondary'
  }
}

// Helper to get status icon
function getStatusIcon(status: string) {
  switch (status) {
    case 'Completed':
      return <CheckCircle className="w-4 h-4 text-green-500" weight="fill" />
    case 'InProgress':
      return <Clock className="w-4 h-4 text-blue-500" weight="fill" />
    default:
      return <XCircle className="w-4 h-4 text-gray-400" />
  }
}

export function OnboardingView() {
  const [activeTab, setActiveTab] = useState('workflows')
  
  const { data: workflowsData, isLoading: workflowsLoading, error: workflowsError, refetch: refetchWorkflows } = useOnboardingWorkflows()
  const { data: assignmentsData, isLoading: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } = useOnboardingAssignments()

  const workflows = workflowsData?.data || []
  const assignments = assignmentsData?.data || []

  if (workflowsLoading || assignmentsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">HR & Onboarding</h2>
          <p className="text-muted-foreground mt-1">Manage onboarding workflows and track staff progress</p>
        </div>
        <ListSkeleton count={3} />
      </div>
    )
  }

  if (workflowsError || assignmentsError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">HR & Onboarding</h2>
          <p className="text-muted-foreground mt-1">Manage onboarding workflows and track staff progress</p>
        </div>
        <ErrorDisplay 
          error={workflowsError || assignmentsError} 
          title="Failed to load onboarding data"
          onRetry={() => {
            refetchWorkflows()
            refetchAssignments()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">HR & Onboarding</h2>
          <p className="text-muted-foreground mt-1">Manage onboarding workflows and track staff progress</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="assignments">Active Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows.map((workflow: any) => (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      {workflow.description && (
                        <CardDescription className="mt-1">{workflow.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {workflow.department && (
                        <Badge variant="outline">{workflow.department}</Badge>
                      )}
                      <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {workflow.taskTemplates?.length || 0} task templates
                    </span>
                    <span className="text-muted-foreground">
                      {workflow._count?.assignments || 0} active assignments
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {workflows.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No onboarding workflows found</p>
                <Button className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Workflow
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="grid gap-4">
            {assignments.map((assignment: any) => {
              const totalTasks = assignment.tasks?.length || 0
              const completedTasks = assignment.tasks?.filter((t: any) => t.status === 'Completed').length || 0
              const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

              return (
                <Card key={assignment.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(assignment.status)}
                          <Badge variant={getStatusVariant(assignment.status)}>
                            {assignment.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{assignment.workflow?.name}</CardTitle>
                        <CardDescription className="mt-1">
                          Started {formatDate(assignment.startedAt)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {completedTasks} of {totalTasks} tasks completed
                      </span>
                      {assignment.completedAt && (
                        <span className="text-muted-foreground">
                          Completed {formatDate(assignment.completedAt)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {assignments.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No active onboarding assignments</p>
                <p className="text-xs mt-2">Assignments are automatically created when new staff join</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Progress Dashboard</CardTitle>
              <CardDescription>Overview of all staff onboarding progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{assignments.filter((a: any) => a.status === 'InProgress').length}</div>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{assignments.filter((a: any) => a.status === 'Completed').length}</div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {assignments.length > 0 
                          ? Math.round(
                              (assignments.filter((a: any) => a.status === 'Completed').length / assignments.length) * 100
                            )
                          : 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">Overall Completion</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
