import { runMigrations } from './migrations.js';
import { orgRepo } from './repositories/orgRepo.js';
import { userRepo } from './repositories/userRepo.js';
import { leadRepo } from './repositories/leadRepo.js';
import { taskRepo } from './repositories/taskRepo.js';
import { workflowRepo } from './repositories/workflowRepo.js';
import { approvalRepo } from './repositories/approvalRepo.js';
import { auditRepo } from './repositories/auditRepo.js';
import { hashPassword } from '../security/crypto.js';
import { logger } from '../core/logger.js';
import { ROLES } from '../permissions/roles.js';

export async function seedDatabase() {
  logger.info('====================================================');
  logger.info('  MEGADRONE Business OS - Seeding Real Estate Demo Dataset');
  logger.info('  (Apex Realty Advisors / Horizon Properties)');
  logger.info('====================================================');

  // Ensure migrations are run
  runMigrations();

  // 1. Check or Create Demo Organization
  let org = orgRepo.findBySlug('apex-realty');
  if (!org) {
    org = orgRepo.create({
      name: 'Apex Realty Advisors [DEMO]',
      slug: 'apex-realty',
      plan: 'business_pro',
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        aiEnabled: true,
        agencyType: 'Real Estate Brokerage',
        dataPolicy: {
          allowCloudForPublic: true,
          allowCloudForInternal: true,
          allowCloudForConfidential: false,
          allowCloudForSensitive: false,
        }
      }
    });
    logger.info(`Created Demo Organization: ${org.name} (${org.id})`);
  }

  // 2. Users
  const defaultPasswordHash = await hashPassword('megadrone123');

  let owner = userRepo.findByEmail('rohit.sharma@apexrealty.demo');
  if (!owner) {
    owner = userRepo.create({
      orgId: org.id,
      name: 'Rohit Sharma (Principal Broker)',
      email: 'rohit.sharma@apexrealty.demo',
      passwordHash: defaultPasswordHash,
      role: ROLES.OWNER,
    });
  }

  let manager = userRepo.findByEmail('anjali.mehta@apexrealty.demo');
  if (!manager) {
    manager = userRepo.create({
      orgId: org.id,
      name: 'Anjali Mehta (Sales Manager)',
      email: 'anjali.mehta@apexrealty.demo',
      passwordHash: defaultPasswordHash,
      role: ROLES.MANAGER,
    });
  }

  let agent1 = userRepo.findByEmail('vikram.singh@apexrealty.demo');
  if (!agent1) {
    agent1 = userRepo.create({
      orgId: org.id,
      name: 'Vikram Singh (Senior Agent)',
      email: 'vikram.singh@apexrealty.demo',
      passwordHash: defaultPasswordHash,
      role: ROLES.EMPLOYEE,
    });
  }

  // 3. Clear existing leads for clean demo seed if needed, or check count
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const in2Days = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const in5Days = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const overdue2Days = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const overdue4Days = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);

  const existingLeads = leadRepo.listByOrg(org.id);
  if (existingLeads.length < 15) {
    const demoLeads = [
      // 1. Hot Inbound - Site Visit Today
      {
        name: 'Aarav Singhania [DEMO]',
        company: 'Singhania Logistics',
        email: 'aarav.s@singhanialogistics.com',
        phone: '+91 98290 11223',
        source: 'PORTAL_99ACRES',
        status: 'QUALIFIED',
        priority: 'URGENT',
        propertyType: '3BHK Luxury Apartment',
        budgetMin: 85,
        budgetMax: 110,
        preferredLocation: 'Vaishali Nagar, Jaipur',
        bedrooms: 3,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: today, // Site visit scheduled today!
        nextFollowup: today,
        assignedTo: agent1.id,
        aiClassification: 'Ready Buyer • Urgent Site Visit Today',
        aiSuggestedAction: 'Confirm site visit timing for 4:00 PM at Royal Palms Residency',
        notes: 'Looking for ready-to-move 3BHK with 2 covered parkings and east-facing balcony.',
      },
      // 2. High Value Villa - Site Visit Tomorrow
      {
        name: 'Devika Choudhary [DEMO]',
        company: 'Choudhary Exports',
        email: 'devika.c@choudharyexports.in',
        phone: '+91 98110 44556',
        source: 'INBOUND_WEBSITE',
        status: 'PROPOSAL',
        priority: 'HIGH',
        propertyType: '4BHK Gated Villa',
        budgetMin: 220,
        budgetMax: 280,
        preferredLocation: 'Golf Course Road, Gurugram',
        bedrooms: 4,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: tomorrow,
        nextFollowup: today,
        assignedTo: manager.id,
        aiClassification: 'High Net-Worth Buyer • Villa Shortlist',
        aiSuggestedAction: 'Send digital walkthrough brochure and gate pass entry clearance',
        notes: 'Interested in Corner Villa in DLF Phase 5. Requested detailed payment schedule.',
      },
      // 3. Overdue Follow-up - Negotiation Stage
      {
        name: 'Rajesh Khandelwal [DEMO]',
        company: 'Khandelwal Jewellers',
        email: 'rajesh@khandelwaljewels.com',
        phone: '+91 98291 77889',
        source: 'REFERRAL',
        status: 'NEGOTIATION',
        priority: 'URGENT',
        propertyType: 'Commercial Retail Showroom',
        budgetMin: 180,
        budgetMax: 220,
        preferredLocation: 'MI Road, Jaipur',
        bedrooms: null,
        purpose: 'Investment',
        buyOrRent: 'Buy',
        siteVisitDate: overdue2Days,
        nextFollowup: overdue2Days, // OVERDUE FOLLOWUP
        assignedTo: owner.id,
        aiClassification: 'Active Commercial Deal • Price Negotiation',
        aiSuggestedAction: 'Follow up on counter-offer from builder (discount of ₹5 Lakh discussed)',
        notes: 'Final price negotiations underway with developer. Customer offered ₹1.95 Cr.',
      },
      // 4. Overdue Follow-up - New Buyer
      {
        name: 'Neha Verma [DEMO]',
        company: 'TechMahindra',
        email: 'neha.verma@techm.com',
        phone: '+91 97112 33445',
        source: 'FACEBOOK_ADS',
        status: 'CONTACTED',
        priority: 'HIGH',
        propertyType: '2BHK Apartment',
        budgetMin: 55,
        budgetMax: 68,
        preferredLocation: 'Jagatpura, Jaipur',
        bedrooms: 2,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: overdue4Days, // OVERDUE
        assignedTo: agent1.id,
        aiClassification: 'First-time Homebuyer • Needs Re-engagement',
        aiSuggestedAction: 'Send gentle reminder with 2 newly launched affordable 2BHK units',
        notes: 'Inquired about home loan tie-ups with SBI and HDFC for 2BHK projects.',
      },
      // 5. Won Deal (Closed Sale)
      {
        name: 'Karan Malhotra [DEMO]',
        company: 'Malhotra Fintech Labs',
        email: 'karan@malhotralabs.io',
        phone: '+91 98330 99887',
        source: 'DIRECT_OFFICE',
        status: 'WON',
        priority: 'MEDIUM',
        propertyType: '3BHK Penthouse',
        budgetMin: 140,
        budgetMax: 160,
        preferredLocation: 'Bandra West, Mumbai',
        bedrooms: 3,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: yesterday,
        nextFollowup: null,
        assignedTo: manager.id,
        aiClassification: 'Closed & Won Contract',
        aiSuggestedAction: 'Handover registration deed documents and collect review',
        notes: 'Deal closed at ₹1.52 Cr. Token payment received and registry completed.',
      },
      // 6. Lost Deal (Customer opted elsewhere)
      {
        name: 'Siddharth Iyer [DEMO]',
        company: 'Iyer Consulting',
        email: 'siddharth@iyerconsult.com',
        phone: '+91 99001 22334',
        source: 'MAGICBRICKS',
        status: 'LOST',
        priority: 'LOW',
        propertyType: '2BHK Apartment',
        budgetMin: 45,
        budgetMax: 50,
        preferredLocation: 'Whitefield, Bangalore',
        bedrooms: 2,
        purpose: 'Investment',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: null,
        assignedTo: agent1.id,
        aiClassification: 'Lost Opportunity • Budget Constraint',
        aiSuggestedAction: 'Archive lead and re-target during festive discount campaigns',
        notes: 'Customer purchased resale flat in secondary market due to urgent possession need.',
      },
      // 7. Site Visit Scheduled in 2 Days
      {
        name: 'Pooja Deshmukh [DEMO]',
        company: 'Infosys BPM',
        email: 'pooja.deshmukh@infosys.com',
        phone: '+91 98450 66778',
        source: 'INBOUND_WEBSITE',
        status: 'QUALIFIED',
        priority: 'HIGH',
        propertyType: '3BHK High-rise Apartment',
        budgetMin: 95,
        budgetMax: 125,
        preferredLocation: 'Hinjewadi, Pune',
        bedrooms: 3,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: in2Days,
        nextFollowup: tomorrow,
        assignedTo: agent1.id,
        aiClassification: 'IT Professional • Scheduled Site Walkthrough',
        aiSuggestedAction: 'Confirm GPS pin location and contact number of project site supervisor',
        notes: 'Wants amenities tour including clubhouse, swimming pool, and EV charging bays.',
      },
      // 8. Commercial Office Space Investor
      {
        name: 'Amitabh Sen [DEMO]',
        company: 'Sen Capital Partners',
        email: 'amitabh@sencapital.in',
        phone: '+91 98100 88990',
        source: 'LINKEDIN',
        status: 'PROPOSAL',
        priority: 'HIGH',
        propertyType: 'Pre-leased Commercial Floor',
        budgetMin: 400,
        budgetMax: 600,
        preferredLocation: 'Sector 62, Noida',
        bedrooms: null,
        purpose: 'Investment',
        buyOrRent: 'Buy',
        siteVisitDate: in3Days,
        nextFollowup: in2Days,
        assignedTo: owner.id,
        aiClassification: 'Institutional Commercial Buyer • 8.5% Rental Yield Focus',
        aiSuggestedAction: 'Share tenant lease terms with Grade-A multinational bank tenant',
        notes: 'Looking for ₹4-6 Cr pre-leased commercial property with lock-in period of 5+ years.',
      },
      // 9. Luxury Farmhouse Buyer
      {
        name: 'Rani Gayatri Devi [DEMO]',
        company: 'Heritage Estates Foundation',
        email: 'gayatri.devi@heritageestates.org',
        phone: '+91 98290 55443',
        source: 'REFERRAL',
        status: 'NEGOTIATION',
        priority: 'HIGH',
        propertyType: 'Farmhouse / Agri-Estate',
        budgetMin: 350,
        budgetMax: 450,
        preferredLocation: 'Ajmer Road, Jaipur',
        bedrooms: 5,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: in5Days,
        nextFollowup: in3Days,
        assignedTo: manager.id,
        aiClassification: 'Ultra HNI Farmhouse Buyer',
        aiSuggestedAction: 'Review boundary demarcation maps and municipal NOC papers',
        notes: 'Seeking 2-acre gated farmhouse with solar power setup and organic orchard.',
      },
      // 10. Rental Tenant - Executive Relocation
      {
        name: 'Sameer Bansal [DEMO]',
        company: 'Google India',
        email: 'sameer.bansal@google.com',
        phone: '+91 99887 11223',
        source: 'CORPORATE_RELOCATION',
        status: 'NEW',
        priority: 'MEDIUM',
        propertyType: '3BHK Fully Furnished Flat',
        budgetMin: 45, // 45k/mo
        budgetMax: 60, // 60k/mo
        preferredLocation: 'Indiranagar, Bangalore',
        bedrooms: 3,
        purpose: 'Self-use',
        buyOrRent: 'Rent',
        siteVisitDate: in2Days,
        nextFollowup: today,
        assignedTo: agent1.id,
        aiClassification: 'Corporate Rental Tenant',
        aiSuggestedAction: 'Send video walkthroughs of 3 furnished apartments near metro station',
        notes: 'Immediate joining next month. Requires society with power backup and gym.',
      },
      // 11. NRI Investor
      {
        name: 'Vikramaditya Rao [DEMO]',
        company: 'Rao Wealth Management (Dubai)',
        email: 'vikram.rao@dubaiinvest.ae',
        phone: '+971 50 123 4567',
        source: 'NRI_PORTAL',
        status: 'QUALIFIED',
        priority: 'HIGH',
        propertyType: 'Luxury Studio / 1BHK Suites',
        budgetMin: 70,
        budgetMax: 90,
        preferredLocation: 'Mansarovar, Jaipur',
        bedrooms: 1,
        purpose: 'Investment',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: in2Days,
        assignedTo: manager.id,
        aiClassification: 'NRI Real Estate Investor • High Rental Yield Focus',
        aiSuggestedAction: 'Arrange WhatsApp video call with project structural engineer',
        notes: 'Interested in studio apartment block for guaranteed rental returns.',
      },
      // 12. Urgent 2BHK Buyer
      {
        name: 'Sunita Meena [DEMO]',
        company: 'Government Medical College',
        email: 'dr.sunita@medjaipur.gov.in',
        phone: '+91 94140 22334',
        source: 'HOARDING_BANNER',
        status: 'CONTACTED',
        priority: 'HIGH',
        propertyType: '2BHK Ready Possession',
        budgetMin: 48,
        budgetMax: 58,
        preferredLocation: 'Tonk Road, Jaipur',
        bedrooms: 2,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: today, // SITE VISIT TODAY
        nextFollowup: today,
        assignedTo: agent1.id,
        aiClassification: 'Ready Medical Professional Buyer • Site Visit Today',
        aiSuggestedAction: 'Greet customer at project site reception at 5:30 PM',
        notes: 'Looking for apartment within 15 minutes of hospital corridor.',
      },
      // 13. Overdue 3BHK Inquiry
      {
        name: 'Deepak Saxena [DEMO]',
        company: 'Saxena & Associates',
        email: 'deepak.saxena@lawfirm.in',
        phone: '+91 98118 77665',
        source: 'HOUSING_COM',
        status: 'CONTACTED',
        priority: 'MEDIUM',
        propertyType: '3BHK Builder Floor',
        budgetMin: 75,
        budgetMax: 90,
        preferredLocation: 'Malviya Nagar, Jaipur',
        bedrooms: 3,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: overdue2Days, // OVERDUE
        assignedTo: agent1.id,
        aiClassification: 'Builder Floor Seeker • Overdue Follow-up',
        aiSuggestedAction: 'Send updated inventory of standalone builder floors with stilt parking',
        notes: 'Prefers 2nd floor with private roof rights.',
      },
      // 14. Industrial Plot Buyer
      {
        name: 'Harpreet Singh [DEMO]',
        company: 'Punjab Agro Cold Storage',
        email: 'harpreet@punjabagrocold.com',
        phone: '+91 98765 11002',
        source: 'INDUSTRIAL_DIRECTORY',
        status: 'PROPOSAL',
        priority: 'HIGH',
        propertyType: 'Industrial Plot (1000 sq yards)',
        budgetMin: 150,
        budgetMax: 200,
        preferredLocation: 'Mahindra World City, Jaipur',
        bedrooms: null,
        purpose: 'Investment',
        buyOrRent: 'Buy',
        siteVisitDate: in3Days,
        nextFollowup: tomorrow,
        assignedTo: owner.id,
        aiClassification: 'Industrial Warehouse Investor',
        aiSuggestedAction: 'Verify RIICO power allocation & pollution clearance certificate',
        notes: 'Warehouse construction planned for cold storage chain setup.',
      },
      // 15. New Inbound Web Lead
      {
        name: 'Gaurav Bhatia [DEMO]',
        company: 'Freelance Architect',
        email: 'gaurav.b@designstudio.com',
        phone: '+91 98200 44332',
        source: 'INBOUND_WEBSITE',
        status: 'NEW',
        priority: 'MEDIUM',
        propertyType: '3BHK Duplex Penthouse',
        budgetMin: 120,
        budgetMax: 150,
        preferredLocation: 'C-Scheme, Jaipur',
        bedrooms: 3,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: tomorrow,
        assignedTo: manager.id,
        aiClassification: 'Fresh Web Inbound • High Aesthetic Standard',
        aiSuggestedAction: 'Share architectural layout plans and high-resolution 3D renders',
        notes: 'Requested natural lighting orientation and terrace deck dimensions.',
      },
      // 16. Won Resale Transaction
      {
        name: 'Meenakshi Sundaram [DEMO]',
        company: 'Sundaram Textiles',
        email: 'meenakshi@sundaramtex.com',
        phone: '+91 94440 99881',
        source: 'REFERRAL',
        status: 'WON',
        priority: 'LOW',
        propertyType: 'Residential Plot (250 sq yards)',
        budgetMin: 60,
        budgetMax: 70,
        preferredLocation: 'Sirsi Road, Jaipur',
        bedrooms: null,
        purpose: 'Investment',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: null,
        assignedTo: agent1.id,
        aiClassification: 'Closed Plot Sale',
        aiSuggestedAction: 'Issue boundary wall work order and collect NOC documentation',
        notes: 'Registry completed at Sub-Registrar office on 10th. Full brokerage settled.',
      },
      // 17. Lost Deal - Relocated to another city
      {
        name: 'Tanvi Joshi [DEMO]',
        company: 'Cognizant Pune',
        email: 'tanvi.joshi@cognizant.com',
        phone: '+91 98220 33441',
        source: 'FACEBOOK_ADS',
        status: 'LOST',
        priority: 'LOW',
        propertyType: '1BHK Studio Apartment',
        budgetMin: 30,
        budgetMax: 38,
        preferredLocation: 'Wakad, Pune',
        bedrooms: 1,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: null,
        assignedTo: agent1.id,
        aiClassification: 'Closed Lost • Job Relocation',
        aiSuggestedAction: 'Archive lead',
        notes: 'Candidate received international transfer to Singapore office.',
      },
      // 18. Budget 2BHK Inquirer
      {
        name: 'Manish Agarwal [DEMO]',
        company: 'Agarwal Traders',
        email: 'manish@agarwaltraders.in',
        phone: '+91 94141 55667',
        source: 'PORTAL_99ACRES',
        status: 'NEW',
        priority: 'MEDIUM',
        propertyType: '2BHK Apartment',
        budgetMin: 40,
        budgetMax: 50,
        preferredLocation: 'Kalwar Road, Jaipur',
        bedrooms: 2,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: null,
        nextFollowup: in2Days,
        assignedTo: agent1.id,
        aiClassification: 'Affordable Housing Prospect',
        aiSuggestedAction: 'Share Pradhan Mantri Awas Yojana (PMAY) interest subsidy options',
        notes: 'Needs bank approval with 80% LTV financing.',
      },
      // 19. Ready Commercial Showroom
      {
        name: 'Zameer Khan [DEMO]',
        company: 'Khan Leather Works',
        email: 'zameer@khanleather.com',
        phone: '+91 98280 66554',
        source: 'DIRECT_OFFICE',
        status: 'QUALIFIED',
        priority: 'HIGH',
        propertyType: 'Commercial Corner Shop',
        budgetMin: 90,
        budgetMax: 120,
        preferredLocation: 'Raja Park, Jaipur',
        bedrooms: null,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: in3Days,
        nextFollowup: tomorrow,
        assignedTo: manager.id,
        aiClassification: 'Retail Corner Commercial Buyer',
        aiSuggestedAction: 'Provide footfall traffic metrics and front glass facade frontage dimensions',
        notes: 'Wants main market front visibility with 20 ft wide road frontage.',
      },
      // 20. Luxury Penthouse Negotiation
      {
        name: 'Dr. Vivek Swaminathan [DEMO]',
        company: 'Apollo Specialty Hospitals',
        email: 'dr.vivek@apollospecialty.in',
        phone: '+91 98400 11229',
        source: 'REFERRAL',
        status: 'NEGOTIATION',
        priority: 'URGENT',
        propertyType: '4BHK Sky Villa Penthouse',
        budgetMin: 250,
        budgetMax: 300,
        preferredLocation: 'Bani Park, Jaipur',
        bedrooms: 4,
        purpose: 'Self-use',
        buyOrRent: 'Buy',
        siteVisitDate: yesterday,
        nextFollowup: today,
        assignedTo: owner.id,
        aiClassification: 'Executive Medical Director • Final Negotiation',
        aiSuggestedAction: 'Finalize developer customization agreement for private splash pool',
        notes: 'Agreement draft under legal review. Target registry by end of month.',
      }
    ];

    for (const l of demoLeads) {
      leadRepo.create({
        orgId: org.id,
        ...l,
      });
    }
    logger.info(`Seeded ${demoLeads.length} verified real estate demo leads.`);
  }

  // 4. Tasks for Real Estate Agency
  const existingTasks = taskRepo.listByOrg(org.id);
  if (existingTasks.length < 5) {
    taskRepo.create({
      orgId: org.id,
      title: 'Conduct Site Walkthrough with Aarav Singhania (Royal Palms)',
      description: 'Meet client at project entrance gate at 4:00 PM. Present sample 3BHK flat.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      dueDate: today,
      assignedTo: agent1.id,
    });

    taskRepo.create({
      orgId: org.id,
      title: 'Prepare final price negotiation sheet for Rajesh Khandelwal showroom',
      description: 'Calculate stamp duty, registry fees, and GST savings on commercial space.',
      priority: 'URGENT',
      status: 'PENDING',
      dueDate: today,
      assignedTo: owner.id,
    });

    taskRepo.create({
      orgId: org.id,
      title: 'Deliver DLF Phase 5 Villa Brochure to Devika Choudhary',
      description: 'Prepare printed brochure and structural specifications for tomorrow site visit.',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: today,
      assignedTo: manager.id,
    });

    taskRepo.create({
      orgId: org.id,
      title: 'Follow up on Neha Verma 2BHK home loan sanction (OVERDUE)',
      description: 'Follow up with HDFC bank home loan officer regarding pre-approval letter.',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: overdue2Days,
      assignedTo: agent1.id,
    });

    taskRepo.create({
      orgId: org.id,
      title: 'Review RIICO NOC papers for Harpreet Singh industrial plot',
      description: 'Consult municipal liaison regarding high-tension electricity line clearance.',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: in2Days,
      assignedTo: owner.id,
    });

    logger.info('Seeded 5 operational real estate tasks.');
  }

  // 5. Workflows
  const existingWorkflows = workflowRepo.listByOrg(org.id);
  if (existingWorkflows.length === 0) {
    workflowRepo.create({
      orgId: org.id,
      name: 'High-Value Real Estate Lead Auto-Qualification',
      description: 'When an inbound property lead is registered with budget > 80L, auto-classify and schedule site visit task.',
      triggerType: 'LEAD_CREATED',
      conditions: [{ field: 'name', operator: 'IS_NOT_NULL', value: '' }],
      actions: [
        { type: 'CLASSIFY_LEAD', params: {} },
        { type: 'CREATE_TASK', params: { title: 'AI Assistant: Schedule property site visit for high-priority lead', priority: 'HIGH', dueDays: 1 } },
        { type: 'GENERATE_SUGGESTED_DRAFT', params: {} }
      ],
      createdBy: owner.id,
    });
    logger.info('Seeded Real Estate automation workflow.');
  }

  // 6. Approval Item
  const existingApprovals = approvalRepo.listByOrg(org.id);
  if (existingApprovals.length === 0) {
    approvalRepo.create({
      orgId: org.id,
      actionType: 'SEND_EXTERNAL_COMMUNICATION',
      riskLevel: 'HIGH',
      payload: {
        recipientEmail: 'rajesh@khandelwaljewels.com',
        recipientName: 'Rajesh Khandelwal',
        subject: 'Formal Commercial Proposal & Payment Terms - MI Road Showroom',
        body: 'Dear Mr. Khandelwal,\n\nFollowing up on our discussions with the project developers, we have secured formal approval for the commercial unit at ₹1.98 Cr inclusive of dedicated basement parking.\n\nPlease review the attached term sheet.\n\nWarm regards,\nRohit Sharma\nApex Realty Advisors',
      },
      reason: 'Outbound commercial agreement with pricing concessions requires broker authorization before WhatsApp/Email dispatch.',
      requestedBy: 'AI_ORCHESTRATOR',
    });
    logger.info('Seeded sample pending human approval request.');
  }

  // 7. Audit log
  auditRepo.create({
    orgId: org.id,
    userId: owner.id,
    action: 'REAL_ESTATE_DEMO_SYSTEM_SEEDED',
    resourceType: 'SYSTEM',
    resourceId: org.id,
    details: { version: '2.0.0', dataset: 'Apex Realty Advisors 20-Lead Real Estate Dataset' },
  });

  logger.info('====================================================');
  logger.info('  Real Estate Seed Complete! Login Credentials:');
  logger.info('  Broker/Owner:  rohit.sharma@apexrealty.demo   / megadrone123');
  logger.info('  Manager:       anjali.mehta@apexrealty.demo   / megadrone123');
  logger.info('  Agent:         vikram.singh@apexrealty.demo   / megadrone123');
  logger.info('====================================================');
}

// Run if called directly
if (process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch(err => {
    logger.error('Seeding failed:', { error: err.message });
    process.exit(1);
  });
}
