import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';
import { leadRepo } from '../database/repositories/leadRepo.js';
import { taskRepo } from '../database/repositories/taskRepo.js';
import { auditRepo } from '../database/repositories/auditRepo.js';
import { logger } from '../core/logger.js';

export class SalesManagerAgent extends BaseAgent {
  constructor() {
    super(
      'SalesManagerAgent',
      'AI Sales Manager providing daily sales prioritization, deal velocity analysis, and next-best-actions based on live CRM state',
      TASK_TYPES.BUSINESS_ANALYSIS
    );
  }

  /**
   * Deterministic scoring calculation for a lead
   * 
   * Scoring Model:
   * - Stage: NEGOTIATION (+30), PROPOSAL (+20), QUALIFIED (+10), CONTACTED (+5), NEW (+5), LOST (-30), WON (-20)
   * - Overdue Task: +25
   * - Urgent/High Priority Task: +20
   * - Task Due Today: +10
   * - Site Visit Today: +25
   * - Upcoming Site Visit (Next 7 days): +15
   * - Overdue Follow-up Date: +15
   * - Follow-up Due Today: +10
   * - Lead Priority: URGENT (+20), HIGH (+15), MEDIUM (+5)
   * - Recent Activity (last 48 hours): +10
   * 
   * @param {Object} lead - The lead record
   * @param {Object} contextData - Associated tasks and audit context
   * @returns {Object} { score, priorityTier, reasons, leadTasks }
   */
  calculateLeadScore(lead, contextData = {}) {
    let score = 0;
    const reasons = [];
    const today = new Date().toISOString().slice(0, 10);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    // 1. Stage-based scoring
    switch (lead.status) {
      case 'NEGOTIATION':
        score += 30;
        reasons.push('Negotiation stage (+30)');
        break;
      case 'PROPOSAL':
        score += 20;
        reasons.push('Proposal stage (+20)');
        break;
      case 'QUALIFIED':
        score += 10;
        reasons.push('Qualified buyer stage (+10)');
        break;
      case 'CONTACTED':
        score += 5;
        reasons.push('Contacted lead (+5)');
        break;
      case 'NEW':
        score += 5;
        reasons.push('New inbound lead (+5)');
        break;
      case 'LOST':
        score -= 30;
        reasons.push('Lost deal (-30)');
        break;
      case 'WON':
        score -= 20;
        reasons.push('Won deal / Closed (-20)');
        break;
      default:
        break;
    }

    // 2. Task-based scoring
    const leadTasks = contextData.leadTaskMap?.[lead.id] || [];
    const hasOverdueTask = leadTasks.some(t => t.due_date && t.due_date < today && !['COMPLETED', 'CANCELLED'].includes(t.status));
    const hasUrgentTask = leadTasks.some(t => (t.priority === 'URGENT' || t.priority === 'HIGH') && !['COMPLETED', 'CANCELLED'].includes(t.status));
    const hasDueTodayTask = leadTasks.some(t => t.due_date === today && !['COMPLETED', 'CANCELLED'].includes(t.status));

    if (hasOverdueTask) {
      score += 25;
      reasons.push('Overdue task pending (+25)');
    }
    if (hasUrgentTask) {
      score += 20;
      reasons.push('High-priority / urgent task assigned (+20)');
    }
    if (hasDueTodayTask && !hasOverdueTask) {
      score += 10;
      reasons.push('Task due today (+10)');
    }

    // 3. Site visit & follow-up urgency
    if (lead.site_visit_date) {
      if (lead.site_visit_date === today) {
        score += 25;
        reasons.push('Site visit scheduled today (+25)');
      } else if (lead.site_visit_date > today) {
        score += 15;
        reasons.push('Upcoming scheduled site visit (+15)');
      }
    }

    if (lead.next_followup && lead.next_followup < today && !['WON', 'LOST'].includes(lead.status)) {
      score += 15;
      reasons.push('Overdue follow-up contact (+15)');
    } else if (lead.next_followup && lead.next_followup === today && !['WON', 'LOST'].includes(lead.status)) {
      score += 10;
      reasons.push('Follow-up scheduled today (+10)');
    }

    // 4. Lead priority
    if (lead.priority === 'URGENT') {
      score += 20;
      reasons.push('Urgent priority lead (+20)');
    } else if (lead.priority === 'HIGH') {
      score += 15;
      reasons.push('High priority lead (+15)');
    } else if (lead.priority === 'MEDIUM') {
      score += 5;
      reasons.push('Medium priority lead (+5)');
    }

    // 5. Recent Activity
    const lastActive = lead.updated_at || lead.created_at;
    if (lastActive && lastActive >= fortyEightHoursAgo) {
      score += 10;
      reasons.push('Recent activity in last 48 hours (+10)');
    }

    // Determine Priority Category
    let priorityTier = 'LOW';
    if (lead.status === 'LOST' || lead.status === 'WON') {
      priorityTier = 'LOW';
    } else if (score >= 60) {
      priorityTier = 'URGENT';
    } else if (score >= 40) {
      priorityTier = 'HIGH';
    } else if (score >= 20) {
      priorityTier = 'MEDIUM';
    } else {
      priorityTier = 'LOW';
    }

    return {
      score,
      priorityTier,
      reasons,
      leadTasks,
    };
  }

  /**
   * Deterministic next best action based on actual CRM / task state
   * 
   * @param {Object} lead 
   * @param {Object} params { leadTasks, score, priorityTier, reasons }
   * @returns {string} One actionable recommendation
   */
  determineNextAction(lead, { leadTasks = [], score, priorityTier, reasons = [] } = {}) {
    const today = new Date().toISOString().slice(0, 10);

    if (lead.status === 'LOST') {
      return 'Archive deal and record loss reason';
    }
    if (lead.status === 'WON') {
      return 'Initiate post-sale onboarding & documentation';
    }

    // 1. Overdue task takes top precedence
    const overdueTask = leadTasks.find(t => t.due_date && t.due_date < today && !['COMPLETED', 'CANCELLED'].includes(t.status));
    if (overdueTask) {
      return `Complete overdue task: ${overdueTask.title}`;
    }

    // 2. Site visit scheduled for today
    if (lead.site_visit_date === today) {
      return `Conduct property walkthrough at ${lead.preferred_location || lead.property_type || 'scheduled site'}`;
    }

    // 3. Upcoming site visit
    if (lead.site_visit_date && lead.site_visit_date > today) {
      return `Confirm site visit appointment for ${lead.property_type || 'property'} with buyer`;
    }

    // 4. Negotiation stage
    if (lead.status === 'NEGOTIATION') {
      return 'Prepare negotiation sheet & finalize pricing/payment terms';
    }

    // 5. Proposal stage
    if (lead.status === 'PROPOSAL') {
      return 'Follow up on formal commercial proposal & contract review';
    }

    // 6. Overdue follow-up
    if (lead.next_followup && lead.next_followup < today) {
      return 'Call customer immediately to address overdue follow-up';
    }

    // 7. Follow-up due today
    if (lead.next_followup && lead.next_followup === today) {
      return 'Send follow-up message draft & schedule call';
    }

    // 8. Qualified stage
    if (lead.status === 'QUALIFIED') {
      return 'Schedule dedicated site visit & share curated inventory shortlist';
    }

    // 9. New / Contacted stage
    if (lead.status === 'NEW' || lead.status === 'CONTACTED') {
      return 'Call customer for requirement discovery and budget qualification';
    }

    return 'Review lead engagement context and schedule next outreach';
  }

  /**
   * Retrieves deterministic customer prioritization list for the tenant organization
   * 
   * @param {string} orgId 
   * @param {Object} options { limit }
   * @returns {Promise<Object>}
   */
  async getPriorities(orgId, { limit = 50 } = {}) {
    const leads = leadRepo.listByOrg(orgId, { limit: 200 });
    if (!leads || leads.length === 0) {
      return {
        total: 0,
        priorities: [],
        topPriorities: [],
        summary: 'Data unavailable.',
      };
    }

    const allTasks = taskRepo.listByOrg(orgId, { limit: 500 });
    const leadTaskMap = {};
    for (const t of allTasks) {
      if (t.lead_id) {
        if (!leadTaskMap[t.lead_id]) leadTaskMap[t.lead_id] = [];
        leadTaskMap[t.lead_id].push(t);
      }
    }

    const contextData = { leadTaskMap };

    const scoredLeads = leads.map(lead => {
      const { score, priorityTier, reasons, leadTasks } = this.calculateLeadScore(lead, contextData);
      const nextAction = this.determineNextAction(lead, { leadTasks, score, priorityTier, reasons });

      return {
        customer_name: lead.name,
        customerName: lead.name,
        lead_id: lead.id,
        leadId: lead.id,
        score,
        priority: priorityTier,
        reasons,
        next_action: nextAction,
        nextAction,
        company: lead.company || '',
        property_type: lead.property_type || '',
        budget: lead.budget_max ? `₹${lead.budget_max}` : (lead.budget_min ? `₹${lead.budget_min}` : null),
        stage: lead.status,
        status: lead.status,
        assigned_to_name: lead.assigned_to_name || 'Unassigned',
        site_visit_date: lead.site_visit_date,
        next_followup: lead.next_followup,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      };
    });

    // Sort: score DESC, priority tier weight DESC, created_at DESC
    const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    scoredLeads.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return {
      total: leads.length,
      priorities: scoredLeads.slice(0, limit),
      topPriorities: scoredLeads.slice(0, 3),
    };
  }

  /**
   * Retrieves a specific lead's priority score and breakdown
   * 
   * @param {string} leadId 
   * @param {string} orgId 
   */
  async getLeadPriority(leadId, orgId) {
    const lead = leadRepo.findById(leadId, orgId);
    if (!lead) return null;

    const allTasks = taskRepo.listByOrg(orgId, { leadId });
    const leadTaskMap = { [lead.id]: allTasks };
    const contextData = { leadTaskMap };

    const { score, priorityTier, reasons, leadTasks } = this.calculateLeadScore(lead, contextData);
    const nextAction = this.determineNextAction(lead, { leadTasks, score, priorityTier, reasons });

    return {
      customer_name: lead.name,
      customerName: lead.name,
      lead_id: lead.id,
      leadId: lead.id,
      score,
      priority: priorityTier,
      reasons,
      next_action: nextAction,
      nextAction,
      company: lead.company || '',
      property_type: lead.property_type || '',
      budget: lead.budget_max ? `₹${lead.budget_max}` : (lead.budget_min ? `₹${lead.budget_min}` : null),
      stage: lead.status,
      status: lead.status,
      assigned_to_name: lead.assigned_to_name || 'Unassigned',
      site_visit_date: lead.site_visit_date,
      next_followup: lead.next_followup,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    };
  }

  /**
   * Generates a Sales Team Daily Plan grouped by priority tier
   * 
   * @param {string} orgId 
   */
  async getDailyPlan(orgId) {
    const priorityResult = await this.getPriorities(orgId, { limit: 100 });
    if (priorityResult.total === 0) {
      return {
        total: 0,
        plan: {
          URGENT: [],
          HIGH: [],
          MEDIUM: [],
          LOW: [],
        },
        metrics: {
          totalPriorities: 0,
          urgentCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
        },
        summary: 'Data unavailable.',
      };
    }

    const priorities = priorityResult.priorities;
    const plan = {
      URGENT: priorities.filter(p => p.priority === 'URGENT'),
      HIGH: priorities.filter(p => p.priority === 'HIGH'),
      MEDIUM: priorities.filter(p => p.priority === 'MEDIUM'),
      LOW: priorities.filter(p => p.priority === 'LOW'),
    };

    const metrics = {
      totalPriorities: priorities.length,
      urgentCount: plan.URGENT.length,
      highCount: plan.HIGH.length,
      mediumCount: plan.MEDIUM.length,
      lowCount: plan.LOW.length,
    };

    return {
      total: priorities.length,
      plan,
      metrics,
      summary: `Sales plan generated for ${priorities.length} buyer(s) across ${metrics.urgentCount} urgent and ${metrics.highCount} high priority deals.`,
    };
  }

  /**
   * AI-powered conversational sales explanation grounded strictly in live database records
   * 
   * @param {Object} params { query, leadId, orgId, user }
   */
  async explainPriorities({ query = '', leadId = null, orgId, user } = {}) {
    const priorityResult = await this.getPriorities(orgId, { limit: 50 });
    if (priorityResult.total === 0) {
      return {
        success: true,
        answer: 'Data unavailable. No leads or operational tasks exist in the database for your organization.',
        groundTruth: null,
      };
    }

    const priorities = priorityResult.priorities;
    let targetLead = null;
    if (leadId) {
      targetLead = priorities.find(p => p.lead_id === leadId);
    } else if (query) {
      const qLower = query.toLowerCase();
      targetLead = priorities.find(p => p.customer_name && qLower.includes(p.customer_name.toLowerCase().split(' ')[0]));
    }

    // Build verified ground-truth context
    const topLeadsContext = priorities.slice(0, 5).map((p, idx) => 
      `${idx + 1}. ${p.customer_name} (${p.company || 'Individual'}) - Stage: ${p.stage}, Score: ${p.score}, Priority: ${p.priority}. Reasons: ${p.reasons.join(', ')}. Next Action: ${p.next_action}`
    ).join('\n');

    let specificLeadContext = '';
    if (targetLead) {
      specificLeadContext = `Target Lead Focus:\n- Name: ${targetLead.customer_name}\n- Stage: ${targetLead.stage}\n- Score: ${targetLead.score} (${targetLead.priority})\n- Score Breakdown: ${targetLead.reasons.join('; ')}\n- Recommended Action: ${targetLead.next_action}\n`;
    }

    const prompt = `You are the AI Sales Manager for MEGADRONE Business OS.
Answer the user's question with precise, actionable guidance based strictly on the verified live CRM telemetry below.

User Query: "${query || 'Who should the sales team focus on today?'}"

Verified Live Sales Telemetry:
Total Active Leads: ${priorities.length}
${specificLeadContext}
Top Prioritized Leads:
${topLeadsContext}

Strict Instructions:
1. Ground your response ONLY on the provided telemetry above.
2. Clearly explain WHO to focus on, their priority score/stage, WHY they are prioritized, and the EXACT NEXT ACTION.
3. Keep the response concise, professional, and directly actionable for sales brokers.
4. Do NOT invent customer names, scores, or facts.`;

    const aiResult = await this.run({
      prompt,
      systemPrompt: 'You are an executive AI Sales Manager. Provide factual, concise priority explanations based strictly on live CRM data.',
      dataClassification: 'INTERNAL',
      context: { orgId, user },
    });

    let answer = aiResult.content;

    // Fallback deterministic response if AI is unavailable or returns empty
    if (!aiResult.success || !answer) {
      if (targetLead) {
        answer = `${targetLead.customer_name} is ranked as **${targetLead.priority}** priority (Score: ${targetLead.score}) in the **${targetLead.stage}** stage.\n\n` +
          `**Key Factors:**\n${targetLead.reasons.map(r => `• ${r}`).join('\n')}\n\n` +
          `**Recommended Next Action:**\n${targetLead.next_action}`;
      } else {
        const top1 = priorities[0];
        answer = `Based on live CRM scoring, your top sales priority today is **${top1.customer_name}** (Score: ${top1.score}, Stage: ${top1.stage}, Priority: ${top1.priority}).\n\n` +
          `**Why:** ${top1.reasons.join(', ')}.\n\n` +
          `**Recommended Next Action:** ${top1.next_action}.\n\n` +
          `**Top Focus Customers:**\n` +
          priorities.slice(0, 3).map((p, i) => `${i + 1}. **${p.customer_name}** (Score: ${p.score}) — ${p.next_action}`).join('\n');
      }
    }

    return {
      success: true,
      answer,
      lead: targetLead || priorities[0] || null,
      topPriorities: priorities.slice(0, 3),
      provider: aiResult.provider || 'deterministic_fallback',
    };
  }
}

export const salesManagerAgent = new SalesManagerAgent();
