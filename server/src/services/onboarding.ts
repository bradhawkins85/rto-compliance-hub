import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Auto-trigger onboarding workflow when new user is created
 * @param userId - The ID of the newly created user
 * @param department - User's department
 * @param roles - User's roles
 */
export async function triggerOnboardingForNewUser(
  userId: string,
  department: string,
  roles: string[]
): Promise<void> {
  try {
    // Find active workflows for the user's department (or general workflows)
    const workflows = await prisma.onboardingWorkflow.findMany({
      where: {
        isActive: true,
        OR: [
          { department: department },
          { department: null }, // General workflows
        ],
      },
      include: {
        taskTemplates: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (workflows.length === 0) {
      console.log(`No active workflows found for department: ${department}`);
      return;
    }

    // Create assignment for each applicable workflow
    for (const workflow of workflows) {
      // Check if assignment already exists
      const existingAssignment = await prisma.onboardingAssignment.findUnique({
        where: {
          userId_workflowId: {
            userId,
            workflowId: workflow.id,
          },
        },
      });

      if (existingAssignment) {
        console.log(`Assignment already exists for user ${userId} and workflow ${workflow.id}`);
        continue;
      }

      // Create assignment
      const assignment = await prisma.onboardingAssignment.create({
        data: {
          userId,
          workflowId: workflow.id,
          status: 'InProgress',
        },
      });

      // Filter templates by department and role
      const relevantTemplates = workflow.taskTemplates.filter((template) => {
        const deptMatch = !template.department || template.department === department;
        const roleMatch = !template.role || roles.includes(template.role);
        return deptMatch && roleMatch;
      });

      // Create tasks from templates
      const tasks = await Promise.all(
        relevantTemplates.map((template) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + template.daysToComplete);

          return prisma.onboardingTask.create({
            data: {
              assignmentId: assignment.id,
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

      console.log(`Created onboarding assignment for user ${userId} with ${tasks.length} tasks`);

      // Auto-assign PD items based on templates with pdCategory
      const pdTemplates = relevantTemplates.filter((t) => t.pdCategory);
      for (const template of pdTemplates) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + template.daysToComplete);

        await prisma.pDItem.create({
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
    }
  } catch (error) {
    console.error('Error triggering onboarding for new user:', error);
    throw error;
  }
}

/**
 * Check for incomplete onboarding and send notifications
 * Should be run daily by scheduler
 */
export async function checkIncompleteOnboarding(): Promise<void> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find assignments that are incomplete and started more than 7 days ago
    const incompleteAssignments = await prisma.onboardingAssignment.findMany({
      where: {
        status: 'InProgress',
        startedAt: {
          lte: sevenDaysAgo,
        },
        OR: [
          { notificationSentAt: null },
          {
            notificationSentAt: {
              lte: sevenDaysAgo, // Re-send notification if it's been 7+ days since last one
            },
          },
        ],
      },
      include: {
        workflow: {
          select: {
            name: true,
          },
        },
        tasks: {
          where: {
            status: {
              in: ['Pending', 'InProgress'],
            },
          },
        },
      },
    });

    for (const assignment of incompleteAssignments) {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: assignment.userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) continue;

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'email',
          title: 'Incomplete Onboarding Tasks',
          message: `You have ${assignment.tasks.length} incomplete onboarding tasks in the "${assignment.workflow.name}" workflow. Please complete them as soon as possible.`,
        },
      });

      // Update assignment to track that notification was sent
      await prisma.onboardingAssignment.update({
        where: { id: assignment.id },
        data: {
          notificationSentAt: new Date(),
        },
      });

      console.log(`Sent incomplete onboarding notification to user ${user.email}`);
    }

    console.log(`Checked incomplete onboarding for ${incompleteAssignments.length} assignments`);
  } catch (error) {
    console.error('Error checking incomplete onboarding:', error);
    throw error;
  }
}

/**
 * Calculate onboarding completion percentage for a user
 * @param userId - User ID
 * @returns Completion percentage (0-100)
 */
export async function calculateOnboardingProgress(userId: string): Promise<number> {
  try {
    const assignments = await prisma.onboardingAssignment.findMany({
      where: { userId },
      include: {
        tasks: true,
      },
    });

    if (assignments.length === 0) return 100; // No onboarding required

    let totalTasks = 0;
    let completedTasks = 0;

    for (const assignment of assignments) {
      totalTasks += assignment.tasks.length;
      completedTasks += assignment.tasks.filter(
        (t) => t.status === 'Completed' || t.status === 'Skipped'
      ).length;
    }

    if (totalTasks === 0) return 100;

    return Math.round((completedTasks / totalTasks) * 100);
  } catch (error) {
    console.error('Error calculating onboarding progress:', error);
    return 0;
  }
}

/**
 * Get onboarding status for a user
 * @param userId - User ID
 * @returns Onboarding status object
 */
export async function getOnboardingStatus(userId: string) {
  try {
    const assignments = await prisma.onboardingAssignment.findMany({
      where: { userId },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            taskType: true,
          },
        },
      },
    });

    const hasIncomplete = assignments.some((a) => a.status !== 'Completed');
    const progress = await calculateOnboardingProgress(userId);

    return {
      hasOnboarding: assignments.length > 0,
      isComplete: !hasIncomplete,
      progress,
      assignments: assignments.map((a) => ({
        id: a.id,
        workflowId: a.workflow.id,
        workflowName: a.workflow.name,
        status: a.status,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        totalTasks: a.tasks.length,
        completedTasks: a.tasks.filter((t) => t.status === 'Completed').length,
      })),
    };
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return {
      hasOnboarding: false,
      isComplete: true,
      progress: 100,
      assignments: [],
    };
  }
}
