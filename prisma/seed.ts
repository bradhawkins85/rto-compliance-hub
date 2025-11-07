import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// RTO Standards (Australian Skills Quality Authority - ASQA Standards)
const rtoStandards = [
  {
    code: 'Standard 1',
    title: 'Training and assessment',
    clause: 'Standard 1',
    description: 'The RTO's training and assessment strategies and practices are responsive to industry and learner needs and meet the requirements of training packages and VET accredited courses.',
    category: 'Core Standards',
  },
  {
    code: '1.1',
    title: 'Training and assessment strategies',
    clause: '1.1',
    description: 'The RTO's training and assessment strategies and practices, including the amount of training they provide, are consistent with the requirements of training packages and VET accredited courses.',
    category: 'Core Standards',
  },
  {
    code: '1.2',
    title: 'Industry engagement',
    clause: '1.2',
    description: 'The RTO's training and assessment strategies and practices are responsive to industry and learner needs.',
    category: 'Core Standards',
  },
  {
    code: '1.3',
    title: 'Trainer and assessor competence',
    clause: '1.3',
    description: 'The RTO ensures that all trainers and assessors meet the requirements outlined in Item 1 and Item 2 of Schedule 1.',
    category: 'Core Standards',
  },
  {
    code: '1.4',
    title: 'Supervision of trainers and assessors',
    clause: '1.4',
    description: 'The RTO has a training and assessment workforce that is sufficient for the operations of the RTO.',
    category: 'Core Standards',
  },
  {
    code: '1.5',
    title: 'Competency of trainers and assessors',
    clause: '1.5',
    description: 'The RTO has documented processes for the systematic validation and continuous improvement of the training and assessment it provides.',
    category: 'Core Standards',
  },
  {
    code: '1.6',
    title: 'Systematic validation',
    clause: '1.6',
    description: 'The RTO has documented processes for the systematic validation and continuous improvement of the training and assessment it provides.',
    category: 'Core Standards',
  },
  {
    code: '1.7',
    title: 'Quality assurance of assessment',
    clause: '1.7',
    description: 'The RTO ensures that it operates with integrity by ensuring that all issued AQF certification documentation meets the requirements of AQF qualifications.',
    category: 'Core Standards',
  },
  {
    code: '1.8',
    title: 'Assessment system',
    clause: '1.8',
    description: 'The RTO implements an assessment system that ensures that assessment meets the requirements of the relevant training package or VET accredited course.',
    category: 'Core Standards',
  },
  {
    code: 'Standard 2',
    title: 'The operations of the RTO',
    clause: 'Standard 2',
    description: 'The operations of the RTO are quality assured.',
    category: 'Operational Standards',
  },
  {
    code: '2.1',
    title: 'Quality training and assessment',
    clause: '2.1',
    description: 'The RTO's training and assessment comply with these Standards.',
    category: 'Operational Standards',
  },
  {
    code: '2.2',
    title: 'Third party arrangements',
    clause: '2.2',
    description: 'The RTO provides quality training and assessment across all operations.',
    category: 'Operational Standards',
  },
  {
    code: '2.3',
    title: 'Agreement with third parties',
    clause: '2.3',
    description: 'Where the RTO has arrangements with any other party, the RTO retains responsibility for all services provided on its behalf.',
    category: 'Operational Standards',
  },
  {
    code: '2.4',
    title: 'Engagement with third parties',
    clause: '2.4',
    description: 'Where the RTO engages with other parties, it ensures there are adequate controls and monitoring processes.',
    category: 'Operational Standards',
  },
  {
    code: 'Standard 3',
    title: 'The RTO issues AQF certification documentation',
    clause: 'Standard 3',
    description: 'The RTO issues, maintains and accepts AQF certification documentation in accordance with these Standards.',
    category: 'Certification Standards',
  },
  {
    code: '3.1',
    title: 'AQF certification documentation',
    clause: '3.1',
    description: 'The RTO issues AQF certification documentation only to a learner whom it has assessed.',
    category: 'Certification Standards',
  },
  {
    code: '3.2',
    title: 'Issuance of AQF certification',
    clause: '3.2',
    description: 'The RTO issues AQF certification documentation within 30 calendar days of a learner being assessed.',
    category: 'Certification Standards',
  },
  {
    code: '3.3',
    title: 'Recognition of prior learning',
    clause: '3.3',
    description: 'The RTO implements a systematic approach to recognition of prior learning.',
    category: 'Certification Standards',
  },
  {
    code: '3.4',
    title: 'Credit transfer',
    clause: '3.4',
    description: 'The RTO provides access to relevant information and training resources.',
    category: 'Certification Standards',
  },
  {
    code: 'Standard 4',
    title: 'Accurate and accessible information',
    clause: 'Standard 4',
    description: 'Accurate and accessible information about an RTO, its services and performance is available to inform prospective and current learners and clients.',
    category: 'Information Standards',
  },
  {
    code: '4.1',
    title: 'Marketing and advertising',
    clause: '4.1',
    description: 'The RTO provides accurate information about its services, performance and regulatory status.',
    category: 'Information Standards',
  },
  {
    code: '4.2',
    title: 'Consumer protection',
    clause: '4.2',
    description: 'The RTO provides current and accurate information that enables learners to make informed choices.',
    category: 'Information Standards',
  },
  {
    code: 'Standard 5',
    title: 'Each learner is properly informed',
    clause: 'Standard 5',
    description: 'Each learner is properly informed and protected.',
    category: 'Learner Protection Standards',
  },
  {
    code: '5.1',
    title: 'Learner information',
    clause: '5.1',
    description: 'Prior to enrolment or the commencement of training, the RTO provides learners with information about the training.',
    category: 'Learner Protection Standards',
  },
  {
    code: '5.2',
    title: 'Learner support',
    clause: '5.2',
    description: 'The RTO provides adequate learning and support services.',
    category: 'Learner Protection Standards',
  },
  {
    code: '5.3',
    title: 'Complaints and appeals',
    clause: '5.3',
    description: 'The RTO has effective and accessible complaints handling and appeals processes.',
    category: 'Learner Protection Standards',
  },
  {
    code: 'Standard 6',
    title: 'Complaints and appeals',
    clause: 'Standard 6',
    description: 'Complaints and appeals are recorded, acknowledged and dealt with fairly, efficiently and effectively.',
    category: 'Complaints Standards',
  },
  {
    code: '6.1',
    title: 'Complaints handling',
    clause: '6.1',
    description: 'The RTO has a complaints handling policy and process.',
    category: 'Complaints Standards',
  },
  {
    code: '6.2',
    title: 'Appeals process',
    clause: '6.2',
    description: 'The RTO has an appeals process that includes independent review.',
    category: 'Complaints Standards',
  },
  {
    code: 'Standard 7',
    title: 'Governance and administration',
    clause: 'Standard 7',
    description: 'The RTO has effective governance and administration arrangements in place.',
    category: 'Governance Standards',
  },
  {
    code: '7.1',
    title: 'Governance structure',
    clause: '7.1',
    description: 'The RTO has a clearly defined governance structure.',
    category: 'Governance Standards',
  },
  {
    code: '7.2',
    title: 'Legal and financial responsibilities',
    clause: '7.2',
    description: 'The RTO complies with all legal and financial requirements.',
    category: 'Governance Standards',
  },
  {
    code: 'Standard 8',
    title: 'The RTO cooperates with the VET Regulator',
    clause: 'Standard 8',
    description: 'The RTO cooperates with the VET Regulator and is responsive to the VET Regulator's requirements.',
    category: 'Regulatory Standards',
  },
  {
    code: '8.1',
    title: 'Regulatory compliance',
    clause: '8.1',
    description: 'The RTO cooperates with the VET Regulator.',
    category: 'Regulatory Standards',
  },
  {
    code: '8.2',
    title: 'Information provision',
    clause: '8.2',
    description: 'The RTO provides accurate and timely information to the VET Regulator.',
    category: 'Regulatory Standards',
  },
  {
    code: '8.3',
    title: 'Notification of changes',
    clause: '8.3',
    description: 'The RTO notifies the VET Regulator of changes to its operations.',
    category: 'Regulatory Standards',
  },
  {
    code: '8.4',
    title: 'Access for audits',
    clause: '8.4',
    description: 'The RTO provides access for audits and site visits.',
    category: 'Regulatory Standards',
  },
];

// Default roles
const defaultRoles = [
  {
    name: 'SystemAdmin',
    description: 'Full system access with ability to manage users, roles, and system configuration',
  },
  {
    name: 'ComplianceAdmin',
    description: 'Access to manage policies, standards, compliance tracking and reporting',
  },
  {
    name: 'Trainer',
    description: 'Access to training products, SOPs, professional development, and learner feedback',
  },
  {
    name: 'Manager',
    description: 'Access to view compliance dashboards, reports, and manage staff PD',
  },
  {
    name: 'Staff',
    description: 'Basic access to view policies, complete PD, and submit feedback',
  },
];

// Default permissions
const defaultPermissions = [
  // User management
  { resource: 'users', action: 'create', name: 'users.create', description: 'Create new users' },
  { resource: 'users', action: 'read', name: 'users.read', description: 'View user information' },
  { resource: 'users', action: 'update', name: 'users.update', description: 'Update user information' },
  { resource: 'users', action: 'delete', name: 'users.delete', description: 'Delete users' },
  // Policy management
  { resource: 'policies', action: 'create', name: 'policies.create', description: 'Create policies' },
  { resource: 'policies', action: 'read', name: 'policies.read', description: 'View policies' },
  { resource: 'policies', action: 'update', name: 'policies.update', description: 'Update policies' },
  { resource: 'policies', action: 'delete', name: 'policies.delete', description: 'Delete policies' },
  // Standards management
  { resource: 'standards', action: 'create', name: 'standards.create', description: 'Create standards' },
  { resource: 'standards', action: 'read', name: 'standards.read', description: 'View standards' },
  { resource: 'standards', action: 'update', name: 'standards.update', description: 'Update standards' },
  { resource: 'standards', action: 'delete', name: 'standards.delete', description: 'Delete standards' },
  // Training products
  { resource: 'training', action: 'create', name: 'training.create', description: 'Create training products' },
  { resource: 'training', action: 'read', name: 'training.read', description: 'View training products' },
  { resource: 'training', action: 'update', name: 'training.update', description: 'Update training products' },
  { resource: 'training', action: 'delete', name: 'training.delete', description: 'Delete training products' },
  // Professional development
  { resource: 'pd', action: 'create', name: 'pd.create', description: 'Create PD items' },
  { resource: 'pd', action: 'read', name: 'pd.read', description: 'View PD items' },
  { resource: 'pd', action: 'update', name: 'pd.update', description: 'Update PD items' },
  { resource: 'pd', action: 'delete', name: 'pd.delete', description: 'Delete PD items' },
  // Feedback
  { resource: 'feedback', action: 'create', name: 'feedback.create', description: 'Submit feedback' },
  { resource: 'feedback', action: 'read', name: 'feedback.read', description: 'View feedback' },
  { resource: 'feedback', action: 'update', name: 'feedback.update', description: 'Update feedback' },
  { resource: 'feedback', action: 'delete', name: 'feedback.delete', description: 'Delete feedback' },
  // Assets
  { resource: 'assets', action: 'create', name: 'assets.create', description: 'Create assets' },
  { resource: 'assets', action: 'read', name: 'assets.read', description: 'View assets' },
  { resource: 'assets', action: 'update', name: 'assets.update', description: 'Update assets' },
  { resource: 'assets', action: 'delete', name: 'assets.delete', description: 'Delete assets' },
  // Complaints
  { resource: 'complaints', action: 'create', name: 'complaints.create', description: 'Create complaints' },
  { resource: 'complaints', action: 'read', name: 'complaints.read', description: 'View complaints' },
  { resource: 'complaints', action: 'update', name: 'complaints.update', description: 'Update complaints' },
  { resource: 'complaints', action: 'delete', name: 'complaints.delete', description: 'Delete complaints' },
  // Reports
  { resource: 'reports', action: 'read', name: 'reports.read', description: 'View reports and analytics' },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in development only)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Cleaning existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.job.deleteMany();
    await prisma.evidence.deleteMany();
    await prisma.complaintTimeline.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.assetService.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.pdItem.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.trainingProductSOP.deleteMany();
    await prisma.sopStandardMapping.deleteMany();
    await prisma.sop.deleteMany();
    await prisma.trainingProduct.deleteMany();
    await prisma.policyStandardMapping.deleteMany();
    await prisma.policyVersion.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.user.deleteMany();
  }

  // Seed Standards
  console.log('📋 Seeding RTO standards...');
  for (const standard of rtoStandards) {
    await prisma.standard.create({
      data: standard,
    });
  }
  console.log(`✅ Created ${rtoStandards.length} RTO standards`);

  // Seed Roles
  console.log('👥 Seeding roles...');
  for (const role of defaultRoles) {
    await prisma.role.create({
      data: role,
    });
  }
  console.log(`✅ Created ${defaultRoles.length} roles`);

  // Seed Permissions
  console.log('🔐 Seeding permissions...');
  for (const permission of defaultPermissions) {
    await prisma.permission.create({
      data: permission,
    });
  }
  console.log(`✅ Created ${defaultPermissions.length} permissions`);

  // Assign permissions to roles
  console.log('🔗 Assigning permissions to roles...');
  
  const systemAdminRole = await prisma.role.findUnique({ where: { name: 'SystemAdmin' } });
  const complianceAdminRole = await prisma.role.findUnique({ where: { name: 'ComplianceAdmin' } });
  const trainerRole = await prisma.role.findUnique({ where: { name: 'Trainer' } });
  const managerRole = await prisma.role.findUnique({ where: { name: 'Manager' } });
  const staffRole = await prisma.role.findUnique({ where: { name: 'Staff' } });

  const allPermissions = await prisma.permission.findMany();

  // SystemAdmin gets all permissions
  if (systemAdminRole) {
    for (const permission of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: systemAdminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // ComplianceAdmin gets most permissions except user management
  if (complianceAdminRole) {
    const compliancePermissions = allPermissions.filter(
      p => !p.resource.startsWith('users') || p.action === 'read'
    );
    for (const permission of compliancePermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: complianceAdminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Trainer gets training, PD, feedback permissions
  if (trainerRole) {
    const trainerPermissions = allPermissions.filter(
      p => ['training', 'pd', 'feedback', 'policies'].includes(p.resource) && 
           ['read', 'create', 'update'].includes(p.action)
    );
    for (const permission of trainerPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: trainerRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Manager gets read access to most resources
  if (managerRole) {
    const managerPermissions = allPermissions.filter(
      p => p.action === 'read' || (p.resource === 'pd' && p.action === 'update')
    );
    for (const permission of managerPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Staff gets basic read access and own PD management
  if (staffRole) {
    const staffPermissions = allPermissions.filter(
      p => (p.action === 'read' && ['policies', 'standards', 'training'].includes(p.resource)) ||
           (p.resource === 'pd' && ['read', 'create', 'update'].includes(p.action)) ||
           (p.resource === 'feedback' && p.action === 'create')
    );
    for (const permission of staffPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: staffRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log('✅ Assigned permissions to roles');

  // Create a default system admin user
  // NOTE: In production, either:
  // 1. Require admin password via environment variable: process.env.ADMIN_PASSWORD
  // 2. Generate a random password and output it securely
  // 3. Use OAuth/SSO and don't set a password
  console.log('👤 Creating default admin user...');
  console.log('⚠️  WARNING: Default admin user created without password.');
  console.log('⚠️  Password must be set via password reset flow before use.');
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@rto-compliance-hub.local',
      name: 'System Administrator',
      password: null, // Password must be set via password reset
      department: 'Admin',
      status: 'Active',
    },
  });

  if (systemAdminRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: systemAdminRole.id,
      },
    });
  }

  console.log('✅ Created default admin user (email: admin@rto-compliance-hub.local, password: NOT SET - use password reset)');

  // Create some default jobs
  console.log('⚙️ Creating default jobs...');
  const jobs = [
    {
      name: 'pdReminders',
      status: 'Scheduled',
      schedule: '0 9 * * *', // Daily at 9 AM
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      name: 'policyReviews',
      status: 'Scheduled',
      schedule: '0 0 * * 1', // Weekly on Monday
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'credentialExpiry',
      status: 'Scheduled',
      schedule: '0 8 * * *', // Daily at 8 AM
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: job });
  }

  console.log(`✅ Created ${jobs.length} scheduled jobs`);

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
