import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { approvalRepo } from '../database/repositories/approvalRepo.js';
import { userRepo } from '../database/repositories/userRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { salesManagerAgent } from './salesManagerAgent.js';
import { logger } from '../core/logger.js';

export class BusinessOperationsAgent extends BaseAgent {
  constructor() {
    super(
      'BusinessOperationsAgent',
      'AI Business Operations Manager providing executive health analytics, risk radar, daily action plans, and proactive operations guidance',
      TASK_TYPES.BUSINESS_ANALYSIS
    );
  }

  /**
   * Evaluates whether a lead qualifies as VIP / High-Value by explicit deterministic rules:
   * 1. Priority is URGENT
   * 2. Budget min or max >= 100 (representing ₹1.00 Cr / 100 Lakhs in real estate domain)
   * 3. Budget string contains 'Cr' or numeric value >= 100
   * 
   * @param {Object} lead 
   * @returns {boolean}
   */
  isVipLead(lead) {
    if (!lead) return false;
    if (lead.priority === 'URGENT') return true;
    if (lead.budget_max !== undefined && lead.budget_max !== null && Number(lead.budget_max) >= 100) return true;
    if (lead.budget_min !== undefined && lead.budget_min !== null && Number(lead.budget_min) >= 100) return true;
    if (lead.budgetMax !== undefined && lead.budgetMax !== null && Number(lead.budgetMax) >= 100) return true;
    if (lead.budgetMin !== undefined && lead.budgetMin !== null && Number(lead.budgetMin) >= 100) return true;
    if (lead.budget) {
      const bStr = String(lead.budget);
      if (bStr.toLowerCase().includes('cr')) return true;
      const num = parseInt(bStr.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num >= 100) return true;
    }
    return false;
  }

  /**
   * 1. OPERATIONAL HEALTH INDEX (MEGATRON Operational Health Index)
   * Deterministic 0-100 score across 4 components (25 pts each).
   * 
   * @param {string} orgId 
   * @returns {Object} { score, maxScore, status, summary, components: { pipelineVelocity, taskSla, followupSla, approvalBacklog } }
   */
  calculateOperationalHealth(orgId) {
    const today = new Date().toISOString().slice(0, 10);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();

    const allLeads = leadRepo.listByOrg(orgId, { limit: 200 });
    const allTasks = taskRepo.listByOrg(orgId, { limit: 200 });
    const pendingApprovals = approvalRepo.listByOrg(orgId, { status: 'PENDING', limit: 100 });

    // Handle Empty Datasets safely
    if (allLeads.length === 0 && allTasks.length === 0) {
      return {
        score: 100,
        maxScore: 100,
        status: 'NO_DATA',
        label: 'Operational Health Index',
        summary: 'Data unavailable. Add leads and tasks to initialize operations intelligence.',
        components: {
          pipelineVelocity: { score: 25, max_score: 25, reason: 'Data unavailable (No active leads).', raw_metrics: { totalLeads: 0, activeLeads: 0, stalledLeads: 0 } },
          taskSla: { score: 25, max_score: 25, reason: 'Data unavailable (No open tasks).', raw_metrics: { openTasks: 0, overdueTasks: 0 } },
          followupSla: { score: 25, max_score: 25, reason: 'Data unavailable (No scheduled follow-ups).', raw_metrics: { totalFollowups: 0, overdueFollowups: 0 } },
          approvalBacklog: { score: 25, max_score: 25, reason: 'No pending approvals in queue.', raw_metrics: { pendingCount: 0, staleCount: 0 } }
        }
      };
    }

    // Component 1: Pipeline Velocity (25 pts)
    const activeLeads = allLeads.filter(l => !['WON', 'LOST'].includes(l.status));
    const stalledLeads = activeLeads.filter(l => ['NEGOTIATION', 'PROPOSAL', 'QUALIFIED'].includes(l.status) && (l.updated_at || l.created_at) < fiveDaysAgo);
    let pipelineScore = 25;
    let pipelineReason = 'Healthy pipeline velocity across all active deals.';
    if (activeLeads.length > 0) {
      const activeMovingCount = Math.max(0, activeLeads.length - stalledLeads.length);
      const velocityRatio = activeMovingCount / activeLeads.length;
      pipelineScore = Math.round(velocityRatio * 25);
      pipelineReason = stalledLeads.length > 0
        ? `${stalledLeads.length} stalled deal(s) (>5 days without update) out of ${activeLeads.length} active lead(s).`
        : `All ${activeLeads.length} active deal(s) moving with regular velocity.`;
    }

    // Component 2: Task SLA (25 pts)
    const openTasks = allTasks.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status));
    const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today);
    let taskScore = 25;
    let taskReason = 'All operational deliverables on schedule.';
    if (openTasks.length > 0) {
      const onTimeCount = Math.max(0, openTasks.length - overdueTasks.length);
      const taskRatio = onTimeCount / openTasks.length;
      taskScore = Math.round(taskRatio * 25);
      taskReason = overdueTasks.length > 0
        ? `${overdueTasks.length} overdue task(s) out of ${openTasks.length} open deliverable(s).`
        : `All ${openTasks.length} open task(s) compliant with due date SLAs.`;
    }

    // Component 3: Follow-up SLA (25 pts)
    const leadsWithFollowup = activeLeads.filter(l => l.next_followup);
    const overdueFollowups = leadsWithFollowup.filter(l => l.next_followup < today);
    let followupScore = 25;
    let followupReason = 'Customer follow-up SLAs strictly maintained.';
    if (leadsWithFollowup.length > 0) {
      const onTimeFollowups = Math.max(0, leadsWithFollowup.length - overdueFollowups.length);
      const followupRatio = onTimeFollowups / leadsWithFollowup.length;
      followupScore = Math.round(followupRatio * 25);
      followupReason = overdueFollowups.length > 0
        ? `${overdueFollowups.length} overdue follow-up(s) out of ${leadsWithFollowup.length} scheduled contact date(s).`
        : `All ${leadsWithFollowup.length} scheduled customer follow-up(s) on track.`;
    }

    // Component 4: Approval Backlog (25 pts)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const staleApprovals = pendingApprovals.filter(a => a.created_at < fortyEightHoursAgo);
    let approvalScore = 25;
    let approvalReason = 'Approval queue clear; zero governance bottlenecks.';
    if (pendingApprovals.length > 0) {
      if (pendingApprovals.length <= 2) approvalScore = 22;
      else if (pendingApprovals.length <= 5) approvalScore = 17;
      else approvalScore = Math.max(0, 25 - pendingApprovals.length * 3);

      // Stale penalty: -4 pts per approval older than 48 hours
      approvalScore = Math.max(0, approvalScore - (staleApprovals.length * 4));
      approvalReason = `${pendingApprovals.length} pending authorization(s) in queue (${staleApprovals.length} older than 48 hours).`;
    }

    const totalScore = Math.min(100, Math.max(0, pipelineScore + taskScore + followupScore + approvalScore));

    let status = 'OPTIMAL';
    if (totalScore < 40) status = 'CRITICAL';
    else if (totalScore < 60) status = 'ATTENTION_REQUIRED';
    else if (totalScore < 80) status = 'STABLE';

    return {
      score: totalScore,
      maxScore: 100,
      status,
      label: 'Operational Health Index',
      summary: `MEGATRON Operational Health Index calculated at ${totalScore}/100 (${status}).`,
      components: {
        pipelineVelocity: {
          score: pipelineScore,
          max_score: 25,
          reason: pipelineReason,
          raw_metrics: { totalLeads: allLeads.length, activeLeads: activeLeads.length, stalledLeads: stalledLeads.length }
        },
        taskSla: {
          score: taskScore,
          max_score: 25,
          reason: taskReason,
          raw_metrics: { openTasks: openTasks.length, overdueTasks: overdueTasks.length }
        },
        followupSla: {
          score: followupScore,
          max_score: 25,
          reason: followupReason,
          raw_metrics: { totalFollowups: leadsWithFollowup.length, overdueFollowups: overdueFollowups.length }
        },
        approvalBacklog: {
          score: approvalScore,
          max_score: 25,
          reason: approvalReason,
          raw_metrics: { pendingCount: pendingApprovals.length, staleCount: staleApprovals.length }
        }
      }
    };
  }

  /**
   * 2. OPPORTUNITY & RISK RADAR
   * Deterministic identification of business risks and high-velocity revenue opportunities.
   * 
   * @param {string} orgId 
   * @returns {Object} { risks: [], opportunities: [], summary: string }
   */
  detectOpportunitiesAndRisks(orgId) {
    const today = new Date().toISOString().slice(0, 10);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const allLeads = leadRepo.listByOrg(orgId, { limit: 200 });
    const allUsers = userRepo.listByOrg(orgId);
    const activeUserMap = new Map(allUsers.filter(u => u.is_active).map(u => [u.id, u.name]));

    const risks = [];
    const opportunities = [];

    for (const lead of allLeads) {
      if (['WON', 'LOST'].includes(lead.status)) continue;

      const isVip = this.isVipLead(lead);

      // Rule 1: RISK_STALLED_NEGOTIATION
      // Deals in Negotiation / Proposal with no update in > 5 days
      if (['NEGOTIATION', 'PROPOSAL'].includes(lead.status) && (lead.updated_at || lead.created_at) < fiveDaysAgo) {
        risks.push({
          lead_id: lead.id,
          customer_name: lead.name,
          company: lead.company || 'Direct Buyer',
          type: 'RISK_STALLED_NEGOTIATION',
          title: 'Stalled Commercial Negotiation',
          severity: isVip ? 'CRITICAL' : 'WARNING',
          reasons: [
            `Deal in ${lead.status} stage with no recorded activity for over 5 days.`,
            isVip ? 'VIP / High-value transaction requiring principal broker intervention.' : 'Active deal at risk of buyer drop-off.'
          ],
          evidence: {
            stage: lead.status,
            lastUpdated: lead.updated_at || lead.created_at,
            budget: lead.budget || `${lead.budget_min || 0}-${lead.budget_max || 0}`,
            isVip
          },
          next_action: `Schedule immediate executive review & contact ${lead.name} regarding contract terms.`
        });
      }

      // Rule 2: RISK_SLA_BREACH
      // Overdue follow-up on High or Urgent priority lead
      if (lead.next_followup && lead.next_followup < today && ['URGENT', 'HIGH'].includes(lead.priority)) {
        const daysOverdue = Math.max(1, Math.round((new Date(today) - new Date(lead.next_followup)) / (24 * 3600 * 1000)));
        risks.push({
          lead_id: lead.id,
          customer_name: lead.name,
          company: lead.company || 'Direct Buyer',
          type: 'RISK_SLA_BREACH',
          title: 'High-Priority Follow-up SLA Breach',
          severity: (daysOverdue > 2 || isVip) ? 'CRITICAL' : 'WARNING',
          reasons: [
            `Customer follow-up scheduled for ${lead.next_followup} is ${daysOverdue} day(s) overdue.`,
            `Lead priority is marked as ${lead.priority}.`
          ],
          evidence: {
            scheduledFollowup: lead.next_followup,
            daysOverdue,
            priority: lead.priority,
            assignedTo: lead.assigned_to_name || 'Unassigned'
          },
          next_action: `Call ${lead.name} immediately to address overdue touchpoint.`
        });
      }

      // Rule 3: RISK_UNASSIGNED_VIP
      // High-budget or Urgent lead without active agent assignment
      if (isVip && (!lead.assigned_to || !activeUserMap.has(lead.assigned_to))) {
        risks.push({
          lead_id: lead.id,
          customer_name: lead.name,
          company: lead.company || 'Direct Buyer',
          type: 'RISK_UNASSIGNED_VIP',
          title: 'Unassigned High-Value VIP Lead',
          severity: 'CRITICAL',
          reasons: [
            'High-value buyer inquiry currently has no active assigned broker.',
            'Risk of delayed initial response causing lead loss.'
          ],
          evidence: {
            budget: lead.budget || `${lead.budget_min || 0}-${lead.budget_max || 0}`,
            propertyType: lead.property_type || 'Residential/Commercial',
            createdAt: lead.created_at
          },
          next_action: `Assign VIP deal for ${lead.name} to Principal Broker or Senior Sales Manager.`
        });
      }

      // Rule 4: OPP_HIGH_VELOCITY_BUYER
      // Recent site visit within last 72 hours (or today) and qualified but no proposal sent yet
      if (lead.site_visit_date && lead.site_visit_date >= threeDaysAgo && lead.site_visit_date <= today && ['QUALIFIED', 'CONTACTED'].includes(lead.status)) {
        opportunities.push({
          lead_id: lead.id,
          customer_name: lead.name,
          company: lead.company || 'Direct Buyer',
          type: 'OPP_HIGH_VELOCITY_BUYER',
          title: 'Post-Site Visit Momentum Opportunity',
          severity: 'INFO',
          reasons: [
            `Site visit completed on ${lead.site_visit_date}; buyer is in active decision window.`,
            'No formal commercial proposal sent yet.'
          ],
          evidence: {
            siteVisitDate: lead.site_visit_date,
            propertyType: lead.property_type || 'Selected Inventory',
            stage: lead.status
          },
          next_action: `Prepare and dispatch tailored proposal & pricing sheet for ${lead.name}.`
        });
      }
    }

    // Sort risks by severity (CRITICAL first, then WARNING)
    risks.sort((a, b) => (a.severity === 'CRITICAL' ? -1 : 1));

    const summary = risks.length > 0 || opportunities.length > 0
      ? `Radar identified ${risks.length} operational risk(s) and ${opportunities.length} high-velocity opportunity(ies).`
      : 'Data unavailable or radar clear: Zero active operational risks detected.';

    return {
      risks,
      opportunities,
      summary
    };
  }

  /**
   * 3. DAILY EXECUTIVE ACTION PLAN
   * 4-Quadrant operational roadmap: REVENUE_PROTECTION, BOTTLENECK_REMOVAL, TEAM_DELEGATION, GOVERNANCE_REVIEW
   * 
   * @param {string} orgId 
   * @returns {Object} { quadrants: {}, summary: string }
   */
  getDailyExecutivePlan(orgId) {
    const today = new Date().toISOString().slice(0, 10);
    const { risks, opportunities } = this.detectOpportunitiesAndRisks(orgId);
    const allTasks = taskRepo.listByOrg(orgId, { limit: 100 });
    const pendingApprovals = approvalRepo.listByOrg(orgId, { status: 'PENDING', limit: 50 });
    const allUsers = userRepo.listByOrg(orgId);
    const defaultOwner = allUsers.find(u => u.role === 'OWNER')?.name || allUsers[0]?.name || 'Owner unavailable.';

    const quadrants = {
      revenueProtection: [],
      bottleneckRemoval: [],
      teamDelegation: [],
      governanceReview: []
    };

    // Quadrant 1: REVENUE_PROTECTION (From critical risks & high velocity opportunities)
    for (const r of risks.filter(r => r.type === 'RISK_STALLED_NEGOTIATION' || r.type === 'RISK_SLA_BREACH')) {
      quadrants.revenueProtection.push({
        id: `act_rev_${r.lead_id}`,
        title: `Protect Deal: ${r.customer_name}`,
        reason: r.reasons[0],
        lead_id: r.lead_id,
        customer_name: r.customer_name,
        priority: r.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
        recommended_owner: defaultOwner,
        deadline: today,
        next_action: r.next_action,
        requires_approval: false
      });
    }

    for (const opp of opportunities.slice(0, 3)) {
      quadrants.revenueProtection.push({
        id: `act_opp_${opp.lead_id}`,
        title: `Capitalize on Momentum: ${opp.customer_name}`,
        reason: opp.reasons[0],
        lead_id: opp.lead_id,
        customer_name: opp.customer_name,
        priority: 'HIGH',
        recommended_owner: defaultOwner,
        deadline: today,
        next_action: opp.next_action,
        requires_approval: true
      });
    }

    // Quadrant 2: BOTTLENECK_REMOVAL (Overdue urgent deliverables & blocked workflows)
    const overdueTasks = allTasks.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status) && t.due_date && t.due_date < today);
    for (const t of overdueTasks.slice(0, 5)) {
      quadrants.bottleneckRemoval.push({
        id: `act_btn_${t.id}`,
        title: `Resolve Overdue Task: ${t.title}`,
        reason: `Deliverable overdue since ${t.due_date}. Priority: ${t.priority}.`,
        task_id: t.id,
        priority: t.priority === 'URGENT' ? 'URGENT' : 'HIGH',
        recommended_owner: t.assigned_to_name || defaultOwner,
        deadline: today,
        next_action: `Expedite task completion or reassign deliverable.`
      });
    }

    // Quadrant 3: TEAM_DELEGATION (Unassigned VIP leads & workload assignments)
    for (const unassigned of risks.filter(r => r.type === 'RISK_UNASSIGNED_VIP')) {
      quadrants.teamDelegation.push({
        id: `act_del_${unassigned.lead_id}`,
        title: `Assign VIP Lead: ${unassigned.customer_name}`,
        reason: unassigned.reasons[0],
        lead_id: unassigned.lead_id,
        customer_name: unassigned.customer_name,
        priority: 'URGENT',
        recommended_owner: defaultOwner,
        deadline: today,
        next_action: unassigned.next_action
      });
    }

    // Quadrant 4: GOVERNANCE_REVIEW (Pending high-risk approvals)
    for (const appr of pendingApprovals.slice(0, 5)) {
      quadrants.governanceReview.push({
        id: `act_gov_${appr.id}`,
        title: `Authorize Communication: ${appr.payload?.recipientName || appr.payload?.customer_name || 'Customer Draft'}`,
        reason: appr.reason || 'Pending supervisory approval before external communication dispatch.',
        approval_id: appr.id,
        priority: appr.risk_level === 'HIGH' ? 'URGENT' : 'HIGH',
        recommended_owner: defaultOwner,
        deadline: today,
        next_action: `Review message draft in Approval Queue and authorize or reject dispatch.`,
        requires_approval: true
      });
    }

    const totalActions = quadrants.revenueProtection.length +
                         quadrants.bottleneckRemoval.length +
                         quadrants.teamDelegation.length +
                         quadrants.governanceReview.length;

    const summary = totalActions > 0
      ? `Daily Executive Action Plan synthesized with ${totalActions} operational priority item(s).`
      : 'Data unavailable or operations clear: Zero executive action items required today.';

    return {
      quadrants,
      metrics: {
        totalActions,
        revenueProtectionCount: quadrants.revenueProtection.length,
        bottleneckRemovalCount: quadrants.bottleneckRemoval.length,
        teamDelegationCount: quadrants.teamDelegation.length,
        governanceReviewCount: quadrants.governanceReview.length
      },
      summary
    };
  }

  /**
   * 4. PROACTIVE ALERTS
   * Real-time threshold-based operational warnings categorized by severity.
   * 
   * @param {string} orgId 
   * @returns {Array} List of alerts [{ type, severity, title, reason, evidence, recommended_action }]
   */
  getProactiveAlerts(orgId) {
    const alerts = [];
    const today = new Date().toISOString().slice(0, 10);
    const { risks, opportunities } = this.detectOpportunitiesAndRisks(orgId);
    const health = this.calculateOperationalHealth(orgId);
    const pendingApprovals = approvalRepo.listByOrg(orgId, { status: 'PENDING', limit: 20 });
    const siteVisitsToday = leadRepo.getSiteVisitsToday(orgId);

    // Alert: Critical Operational Health
    if (health.status === 'CRITICAL' || health.score < 40) {
      alerts.push({
        type: 'HEALTH_CRITICAL',
        severity: 'CRITICAL',
        title: 'Operational Health Critical',
        reason: `Agency Operational Health Index is ${health.score}/100 due to multiple unresolved SLA breaches and stalled deals.`,
        evidence: health.components,
        recommended_action: 'Review Bottleneck Removal quadrant and clear overdue follow-ups immediately.'
      });
    }

    // Alert: Critical Risks from Radar (Grouped by type to prevent spamming identical alerts)
    const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');
    const slaBreaches = criticalRisks.filter(r => r.type === 'RISK_SLA_BREACH');
    const stalledDeals = criticalRisks.filter(r => r.type === 'RISK_STALLED_NEGOTIATION');
    const unassignedVips = criticalRisks.filter(r => r.type === 'RISK_UNASSIGNED_VIP');

    if (slaBreaches.length > 0) {
      const sampleNames = slaBreaches.map(r => r.customer_name).slice(0, 3).join(', ');
      alerts.push({
        type: 'RISK_SLA_BREACH',
        severity: 'CRITICAL',
        title: slaBreaches.length === 1 ? 'High-Priority Follow-up SLA Breach' : `${slaBreaches.length} Follow-up SLA Breaches Detected`,
        reason: slaBreaches.length === 1
          ? slaBreaches[0].reasons[0]
          : `${slaBreaches.length} high-priority customer follow-up(s) are overdue (${sampleNames}${slaBreaches.length > 3 ? '...' : ''}).`,
        evidence: { count: slaBreaches.length, leads: slaBreaches.map(r => r.customer_name) },
        recommended_action: slaBreaches.length === 1 ? slaBreaches[0].next_action : 'Instruct sales team to contact overdue high-priority prospects immediately.'
      });
    }

    if (stalledDeals.length > 0) {
      const sampleNames = stalledDeals.map(r => r.customer_name).slice(0, 3).join(', ');
      alerts.push({
        type: 'RISK_STALLED_NEGOTIATION',
        severity: 'CRITICAL',
        title: stalledDeals.length === 1 ? 'Stalled Commercial Negotiation' : `${stalledDeals.length} Stalled Deals Detected`,
        reason: stalledDeals.length === 1
          ? stalledDeals[0].reasons[0]
          : `${stalledDeals.length} negotiation/proposal deal(s) have had no activity for over 5 days (${sampleNames}${stalledDeals.length > 3 ? '...' : ''}).`,
        evidence: { count: stalledDeals.length, leads: stalledDeals.map(r => r.customer_name) },
        recommended_action: 'Conduct executive deal review to unblock contract terms and prevent buyer drop-off.'
      });
    }

    if (unassignedVips.length > 0) {
      const sampleNames = unassignedVips.map(r => r.customer_name).slice(0, 3).join(', ');
      alerts.push({
        type: 'RISK_UNASSIGNED_VIP',
        severity: 'CRITICAL',
        title: unassignedVips.length === 1 ? 'Unassigned High-Value VIP Lead' : `${unassignedVips.length} Unassigned VIP Leads`,
        reason: unassignedVips.length === 1
          ? unassignedVips[0].reasons[0]
          : `${unassignedVips.length} high-value buyer inquiry/inquiries have no assigned broker (${sampleNames}${unassignedVips.length > 3 ? '...' : ''}).`,
        evidence: { count: unassignedVips.length, leads: unassignedVips.map(r => r.customer_name) },
        recommended_action: 'Assign senior agents to VIP leads immediately to secure buyer engagement.'
      });
    }

    // Alert: Pending Approval Backlog
    if (pendingApprovals.length >= 3) {
      alerts.push({
        type: 'APPROVAL_BACKLOG',
        severity: 'WARNING',
        title: 'Governance Backlog Pending',
        reason: `${pendingApprovals.length} communications awaiting broker authorization.`,
        evidence: { count: pendingApprovals.length },
        recommended_action: 'Open Approval Queue to authorize or reject pending message drafts.'
      });
    }

    // Alert: Site Visits Today
    if (siteVisitsToday.length > 0) {
      alerts.push({
        type: 'SITE_VISITS_TODAY',
        severity: 'INFO',
        title: 'Scheduled Property Walkthroughs Today',
        reason: `${siteVisitsToday.length} buyer site visit(s) scheduled for today (${siteVisitsToday.map(l => l.name).join(', ')}).`,
        evidence: { count: siteVisitsToday.length, leads: siteVisitsToday.map(l => l.name) },
        recommended_action: 'Ensure assigned agents have verified property key access and brochures.'
      });
    }

    return alerts;
  }

  /**
   * 5. CEO DAILY BRIEF
   * Comprehensive morning operational brief with ground-truth validation.
   * 
   * @param {string} orgId 
   * @param {Object} context 
   * @returns {Object} Full brief structure
   */
  async getCeoBrief(orgId, context = {}) {
    const health = this.calculateOperationalHealth(orgId);
    const { risks, opportunities } = this.detectOpportunitiesAndRisks(orgId);
    const plan = this.getDailyExecutivePlan(orgId);
    const alerts = this.getProactiveAlerts(orgId);
    const leadStats = leadRepo.getStats(orgId);
    const taskStats = taskRepo.getStats(orgId);
    const pendingApprovals = approvalRepo.listByOrg(orgId, { status: 'PENDING', limit: 20 });
    const siteVisitsToday = leadRepo.getSiteVisitsToday(orgId);

    // Ground-truth live snapshot
    const metrics = {
      healthScore: health.score,
      healthStatus: health.status,
      totalLeads: leadStats.total,
      negotiationsCount: leadStats.byStatus?.NEGOTIATION || 0,
      proposalsCount: leadStats.byStatus?.PROPOSAL || 0,
      qualifiedCount: leadStats.byStatus?.QUALIFIED || 0,
      wonDealsCount: leadStats.byStatus?.WON || 0,
      lostDealsCount: leadStats.byStatus?.LOST || 0,
      openTasksCount: taskStats.open || 0,
      overdueTasksCount: taskStats.overdue || 0,
      pendingApprovalsCount: pendingApprovals.length,
      siteVisitsTodayCount: siteVisitsToday.length,
      riskCount: risks.length,
      opportunityCount: opportunities.length
    };

    // Executive Narrative Synthesis
    let narrative = `Operational Health Index is ${health.score}/100 (${health.status}).`;
    if (risks.length > 0) {
      narrative += ` Attention required: ${risks.length} deal risk(s) identified including ${risks[0].title} for ${risks[0].customer_name}.`;
    }
    if (pendingApprovals.length > 0) {
      narrative += ` ${pendingApprovals.length} outbound communication draft(s) awaiting your authorization.`;
    }
    if (siteVisitsToday.length > 0) {
      narrative += ` ${siteVisitsToday.length} property walkthrough(s) scheduled today.`;
    }

    return {
      generatedAt: new Date().toISOString(),
      health,
      metrics,
      risks: risks.length > 0 ? risks : 'Data unavailable.',
      opportunities: opportunities.length > 0 ? opportunities : 'Data unavailable.',
      actionPlan: plan,
      alerts: alerts.length > 0 ? alerts : 'Data unavailable.',
      narrative
    };
  }

  /**
   * 6. CONVERSATIONAL EXECUTIVE EXPLANATION (Ollama + Deterministic Grounding)
   * 
   * @param {Object} params { query, orgId, user }
   * @returns {Object} { answer, facts, provider }
   */
  async explainOperations({ query = '', orgId, user = {} }) {
    if (!orgId) throw new Error('orgId is required for operations explanation');

    const health = this.calculateOperationalHealth(orgId);
    const { risks, opportunities } = this.detectOpportunitiesAndRisks(orgId);
    const plan = this.getDailyExecutivePlan(orgId);
    const alerts = this.getProactiveAlerts(orgId);
    const leadStats = leadRepo.getStats(orgId);

    // Live verified facts
    const verifiedFacts = {
      healthScore: health.score,
      healthStatus: health.status,
      components: {
        pipelineVelocity: `${health.components.pipelineVelocity.score}/25 - ${health.components.pipelineVelocity.reason}`,
        taskSla: `${health.components.taskSla.score}/25 - ${health.components.taskSla.reason}`,
        followupSla: `${health.components.followupSla.score}/25 - ${health.components.followupSla.reason}`,
        approvalBacklog: `${health.components.approvalBacklog.score}/25 - ${health.components.approvalBacklog.reason}`
      },
      topRisks: risks.slice(0, 3).map(r => `${r.title} (${r.customer_name}) - ${r.reasons[0]}`),
      topOpportunities: opportunities.slice(0, 2).map(o => `${o.title} (${o.customer_name}) - ${o.next_action}`),
      actionPlanSummary: plan.summary,
      totalLeads: leadStats.total
    };

    const prompt = `You are the MEGATRON AI Business Operations Manager for real estate agency executive leadership.
Answer the executive's question strictly using the verified live database facts below.
Never fabricate numbers, revenue, or customer details. If data is missing, state 'Data unavailable.'

Verified Live Agency Telemetry:
- Operational Health Index: ${verifiedFacts.healthScore}/100 (${verifiedFacts.healthStatus})
- Pipeline Velocity: ${verifiedFacts.components.pipelineVelocity}
- Task SLA: ${verifiedFacts.components.taskSla}
- Follow-up SLA: ${verifiedFacts.components.followupSla}
- Governance / Approvals: ${verifiedFacts.components.approvalBacklog}
- Top Operational Risks: ${verifiedFacts.topRisks.join('; ') || 'None'}
- Top Opportunities: ${verifiedFacts.topOpportunities.join('; ') || 'None'}
- Action Plan: ${verifiedFacts.actionPlanSummary}
- Total Active CRM Leads: ${verifiedFacts.totalLeads}

Executive Question: "${query || 'Provide an executive operations briefing for today.'}"

Provide a concise, direct, professional executive summary with clear next steps.`;

    try {
      const response = await this.run({
        prompt,
        systemPrompt: 'You are the MEGATRON AI Business Operations Manager. Provide factual, concise operational guidance strictly grounded in live database facts.',
        dataClassification: 'INTERNAL',
        context: { orgId, user },
      });

      if (!response.success || !response.content) {
        throw new Error('AI completion unavailable, activating deterministic response.');
      }

      return {
        answer: response.content,
        facts: verifiedFacts,
        provider: response.provider || 'ollama'
      };
    } catch (err) {
      logger.warn('AI executive explanation fallback to deterministic rules:', { error: err.message });
      return {
        answer: `Executive Operations Summary: MEGATRON Operational Health Index is ${health.score}/100 (${health.status}).\n\n` +
                `**Component Breakdown:**\n` +
                `• Pipeline Velocity: ${health.components.pipelineVelocity.score}/25 (${health.components.pipelineVelocity.reason})\n` +
                `• Task SLA: ${health.components.taskSla.score}/25 (${health.components.taskSla.reason})\n` +
                `• Follow-up SLA: ${health.components.followupSla.score}/25 (${health.components.followupSla.reason})\n` +
                `• Approval Backlog: ${health.components.approvalBacklog.score}/25 (${health.components.approvalBacklog.reason})\n\n` +
                `**Summary:** ${plan.summary} ${risks.length > 0 ? `\n\n**Key Attention Item:** ${risks[0].title} for ${risks[0].customer_name} (${risks[0].reasons[0]}).` : ''}`,
        facts: verifiedFacts,
        provider: 'deterministic_fallback'
      };
    }
  }
}

export const businessOperationsAgent = new BusinessOperationsAgent();
