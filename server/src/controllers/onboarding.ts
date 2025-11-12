import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../middleware/audit';
import {
  getPaginationParams,
  createPaginatedResponse,
  parseSortParams,
} from '../utils/pagination';

const prisma = new PrismaClient();

/**
 * List onboarding workflows
 * GET /api/v1/onboarding/workflows
 */
export async function listWorkflows(req: Request, res: Response): Promise<void> {
  try {
    const { page, perPage, skip, take } = getPaginationParams(req);
    const { department, isActive } = req.query;
    const sortParams = parseSortParams(req);

    const where: any = {};
    
    if (department) {
      where.department = department;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const orderBy: any[] = [];
    for (const [field, order] of Object.entries(sortParams)) {
      orderBy.push({ [field]: order });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: 'desc' });
    }

    const total = await prisma.onboardingWorkflow.count({ where });

    const workflows = await prisma.onboardingWorkflow.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        taskTemplates: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    const response = createPaginatedResponse(workflows, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List workflows error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing workflows',
      instance: req.path,
    });
  }
}

/**
 * Create onboarding workflow
 * POST /api/v1/onboarding/workflows
 */
export async function createWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, department, isActive = true } = req.body;

    if (!name) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Workflow name is required',
        instance: req.path,
      });
      return;
    }

    const workflow = await prisma.onboardingWorkflow.create({
      data: {
        name,
        description,
        department,
        isActive,
      },
    });

    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'create',
        'OnboardingWorkflow',
        workflow.id,
        { name, description, department },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating workflow',
      instance: req.path,
    });
  }
}

/**
 * Get workflow details
 * GET /api/v1/onboarding/workflows/:id
 */
export async function getWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const workflow = await prisma.onboardingWorkflow.findUnique({
      where: { id },
      include: {
        taskTemplates: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!workflow) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Workflow not found',
        instance: req.path,
      });
      return;
    }

    res.status(200).json(workflow);
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving workflow',
      instance: req.path,
    });
  }
}

/**
 * Update workflow
 * PATCH /api/v1/onboarding/workflows/:id
 */
export async function updateWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, department, isActive } = req.body;

    const workflow = await prisma.onboardingWorkflow.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(department !== undefined && { department }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'OnboardingWorkflow',
        workflow.id,
        { name, description, department, isActive },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json(workflow);
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating workflow',
      instance: req.path,
    });
  }
}

/**
 * Delete workflow
 * DELETE /api/v1/onboarding/workflows/:id
 */
export async function deleteWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    await prisma.onboardingWorkflow.delete({
      where: { id },
    });

    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'delete',
        'OnboardingWorkflow',
        id,
        {},
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while deleting workflow',
      instance: req.path,
    });
  }
}

/**
 * Add task template to workflow
 * POST /api/v1/onboarding/workflows/:id/templates
 */
export async function addTaskTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      taskType,
      department,
      role,
      orderIndex = 0,
      daysToComplete = 7,
      isRequired = true,
      sopId,
      pdCategory,
    } = req.body;

    if (!title || !taskType) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Title and taskType are required',
        instance: req.path,
      });
      return;
    }

    const template = await prisma.onboardingTaskTemplate.create({
      data: {
        workflowId: id,
        title,
        description,
        taskType,
        department,
        role,
        orderIndex,
        daysToComplete,
        isRequired,
        sopId,
        pdCategory,
      },
    });

    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'create',
        'OnboardingTaskTemplate',
        template.id,
        { workflowId: id, title, taskType },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(201).json(template);
  } catch (error) {
    console.error('Add task template error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while adding task template',
      instance: req.path,
    });
  }
}

/**
 * List onboarding assignments
 * GET /api/v1/onboarding/assignments
 */
export async function listAssignments(req: Request, res: Response): Promise<void> {
  try {
    const { page, perPage, skip, take } = getPaginationParams(req);
    const { status, userId, workflowId } = req.query;
    const sortParams = parseSortParams(req);

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (workflowId) {
      where.workflowId = workflowId;
    }

    const orderBy: any[] = [];
    for (const [field, order] of Object.entries(sortParams)) {
      orderBy.push({ [field]: order });
    }
    if (orderBy.length === 0) {
      orderBy.push({ startedAt: 'desc' });
    }

    const total = await prisma.onboardingAssignment.count({ where });

    const assignments = await prisma.onboardingAssignment.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const response = createPaginatedResponse(assignments, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List assignments error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing assignments',
      instance: req.path,
    });
  }
}

/**
 * Create onboarding assignment
 * POST /api/v1/onboarding/assignments
 */
export async function createAssignment(req: Request, res: Response): Promise<void> {
  try {
    const { userId, workflowId } = req.body;

    if (!userId || !workflowId) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'userId and workflowId are required',
        instance: req.path,
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, department: true, userRoles: { include: { role: true } } },
    });

    if (!user) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: req.path,
      });
      return;
    }

    // Check if workflow exists
    const workflow = await prisma.onboardingWorkflow.findUnique({
      where: { id: workflowId },
      include: { taskTemplates: true },
    });

    if (!workflow) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Workflow not found',
        instance: req.path,
      });
      return;
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.onboardingAssignment.findUnique({
      where: {
        userId_workflowId: {
          userId,
          workflowId,
        },
      },
    });

    if (existingAssignment) {
      res.status(409).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.8',
        title: 'Conflict',
        status: 409,
        detail: 'Assignment already exists for this user and workflow',
        instance: req.path,
      });
      return;
    }

    // Create assignment and tasks in transaction
    const assignment = await prisma.$transaction(async (tx) => {
      // Create assignment
      const newAssignment = await tx.onboardingAssignment.create({
        data: {
          userId,
          workflowId,
          status: 'InProgress',
        },
      });

      // Get user roles
      const userRoles = user.userRoles.map((ur: any) => ur.role.name);

      // Filter task templates by department and role
      const relevantTemplates = workflow.taskTemplates.filter((template: any) => {
        const deptMatch = !template.department || template.department === user.department;
        const roleMatch = !template.role || userRoles.includes(template.role);
        return deptMatch && roleMatch;
      });

      // Create tasks from templates
      const tasks = await Promise.all(
        relevantTemplates.map((template: any) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + template.daysToComplete);

          return tx.onboardingTask.create({
            data: {
              assignmentId: newAssignment.id,
              templateId: template.id,
              title: template.title,
              description: template.description,
              taskType: template.taskType,
              orderIndex: template.orderIndex,
              dueDate,
              sopId: template.sopId,
            },
          });
        })
      );

      // Auto-assign SOPs
      const sopTasks = tasks.filter((task: any) => task.sopId);
      for (const sopTask of sopTasks) {
        // Note: SOP assignment logic would go here
        // This could create PDItem records or other tracking
      }

      // Auto-assign PD items based on templates with pdCategory
      const pdTemplates = relevantTemplates.filter((t: any) => t.pdCategory);
      for (const template of pdTemplates) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + template.daysToComplete);

        await tx.pDItem.create({
          data: {
            userId,
            title: template.title,
            description: template.description,
            category: template.pdCategory,
            dueAt: dueDate,
            status: 'Planned',
          },
        });
      }

      return newAssignment;
    });

    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'create',
        'OnboardingAssignment',
        assignment.id,
        { userId, workflowId },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    // Get full assignment with tasks
    const fullAssignment = await prisma.onboardingAssignment.findUnique({
      where: { id: assignment.id },
      include: {
        workflow: true,
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    res.status(201).json(fullAssignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating assignment',
      instance: req.path,
    });
  }
}

/**
 * Get assignment details
 * GET /api/v1/onboarding/assignments/:id
 */
export async function getAssignment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const assignment = await prisma.onboardingAssignment.findUnique({
      where: { id },
      include: {
        workflow: true,
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!assignment) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Assignment not found',
        instance: req.path,
      });
      return;
    }

    res.status(200).json(assignment);
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving assignment',
      instance: req.path,
    });
  }
}

/**
 * Get user's onboarding assignments
 * GET /api/v1/onboarding/assignments/user/:userId
 */
export async function getUserAssignments(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const assignments = await prisma.onboardingAssignment.findMany({
      where: { userId },
      include: {
        workflow: true,
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    res.status(200).json(assignments);
  } catch (error) {
    console.error('Get user assignments error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving user assignments',
      instance: req.path,
    });
  }
}

/**
 * Update task
 * PATCH /api/v1/onboarding/tasks/:id
 */
export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, notes, evidenceUrl } = req.body;

    const task = await prisma.onboardingTask.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(evidenceUrl !== undefined && { evidenceUrl }),
      },
    });

    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'OnboardingTask',
        task.id,
        { status, notes },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating task',
      instance: req.path,
    });
  }
}

/**
 * Complete task
 * POST /api/v1/onboarding/tasks/:id/complete
 */
export async function completeTask(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { evidenceUrl, notes } = req.body;

    const task = await prisma.onboardingTask.update({
      where: { id },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        completedBy: req.user?.userId,
        evidenceUrl,
        notes,
      },
    });

    // Check if all tasks in assignment are completed
    const assignment = await prisma.onboardingAssignment.findUnique({
      where: { id: task.assignmentId },
      include: {
        tasks: true,
      },
    });

    if (assignment) {
      const allCompleted = assignment.tasks.every(
        (t: any) => t.status === 'Completed' || t.status === 'Skipped'
      );

      if (allCompleted) {
        await prisma.onboardingAssignment.update({
          where: { id: assignment.id },
          data: {
            status: 'Completed',
            completedAt: new Date(),
          },
        });
      }
    }

    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'OnboardingTask',
        task.id,
        { action: 'complete' },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while completing task',
      instance: req.path,
    });
  }
}

/**
 * Get onboarding progress
 * GET /api/v1/onboarding/progress/:userId
 */
export async function getOnboardingProgress(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const assignments = await prisma.onboardingAssignment.findMany({
      where: { userId },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: true,
      },
    });

    const progress = assignments.map((assignment: any) => {
      const totalTasks = assignment.tasks.length;
      const completedTasks = assignment.tasks.filter(
        (t: any) => t.status === 'Completed'
      ).length;
      const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        assignmentId: assignment.id,
        workflowId: assignment.workflow.id,
        workflowName: assignment.workflow.name,
        status: assignment.status,
        startedAt: assignment.startedAt,
        completedAt: assignment.completedAt,
        totalTasks,
        completedTasks,
        percentage,
      };
    });

    res.status(200).json({
      userId,
      assignments: progress,
      overallProgress: progress.length > 0
        ? Math.round(
            progress.reduce((sum: number, p: any) => sum + p.percentage, 0) / progress.length
          )
        : 0,
    });
  } catch (error) {
    console.error('Get onboarding progress error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving progress',
      instance: req.path,
    });
  }
}
