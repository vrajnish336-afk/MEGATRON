import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';
import { leadRepo } from '../database/repositories/leadRepo.js';

export class LeadAgent extends BaseAgent {
  constructor() {
    super('LeadAgent', 'Real Estate Lead Qualification, Requirement Extraction, and Follow-up Intelligence', TASK_TYPES.CLASSIFICATION);
  }

  /**
   * Parses natural language property requirements and extracts structured real estate lead metadata
   */
  async qualifyAndExtractRequirements(inputText, context = {}) {
    const prompt = `Analyze this customer inquiry for a real estate agency and extract structured information.

Input Text: "${inputText}"

Rules:
1. Do not invent information. If an attribute is missing or unknown from the text, write "Not provided."
2. Determine Priority: "URGENT" (immediate site visit/ready cash buyer), "HIGH" (clear budget + location + active timeline), "MEDIUM" (exploratory buyer), or "LOW" (vague/unqualified).
3. Suggest the immediate Next Action (e.g. "Schedule site visit", "Share project brochure & floor plan", "Qualify budget range").

Return JSON format:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "requirement": "string (e.g. 3BHK Apartment, Commercial Office, 4BHK Villa, or 'Not provided.')",
  "propertyType": "string (e.g. 3BHK, Villa, Apartment, Plot, or 'Not provided.')",
  "budget": "string (e.g. 80 Lakh, 1.5 Cr, or 'Not provided.')",
  "location": "string (e.g. Jaipur, Vaishali Nagar, Gurugram, or 'Not provided.')",
  "bedrooms": number | null,
  "purpose": "Self-use" | "Investment" | "Not provided.",
  "buyOrRent": "Buy" | "Rent" | "Not provided.",
  "siteVisitIntent": "string (e.g. This weekend, Tomorrow, or 'Not provided.')",
  "missingInfo": ["string (list of key unprovided fields needed for next step, e.g. 'Exact budget range', 'Preferred contact time')"],
  "nextAction": "string",
  "suggestedFollowupDays": number,
  "summary": "string (1-2 sentence executive overview)"
}`;

    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are an expert Real Estate Lead Intelligence & CRM Qualification Agent for MEGADRONE Business OS.',
      taskType: TASK_TYPES.CLASSIFICATION,
      context,
    });

    if (result.success && result.data) {
      return result.data;
    }

    // Heuristic deterministic extractor fallback
    return this.fallbackQualificationExtractor(inputText);
  }

  /**
   * Deterministic pattern matcher for real estate lead qualification
   */
  fallbackQualificationExtractor(text) {
    const lower = text.toLowerCase();

    // Bedroom / property type detection
    let requirement = 'Not provided.';
    let propertyType = 'Not provided.';
    let bedrooms = null;
    if (lower.includes('1bhk') || lower.includes('1 bhk')) { requirement = '1BHK'; propertyType = 'Apartment'; bedrooms = 1; }
    else if (lower.includes('2bhk') || lower.includes('2 bhk')) { requirement = '2BHK'; propertyType = 'Apartment'; bedrooms = 2; }
    else if (lower.includes('3bhk') || lower.includes('3 bhk')) { requirement = '3BHK'; propertyType = 'Apartment'; bedrooms = 3; }
    else if (lower.includes('4bhk') || lower.includes('4 bhk')) { requirement = '4BHK'; propertyType = 'Luxury Apartment'; bedrooms = 4; }
    else if (lower.includes('villa')) { requirement = 'Villa / Independent House'; propertyType = 'Villa'; }
    else if (lower.includes('plot') || lower.includes('land')) { requirement = 'Residential Plot'; propertyType = 'Plot'; }
    else if (lower.includes('commercial') || lower.includes('office') || lower.includes('shop')) { requirement = 'Commercial Property'; propertyType = 'Commercial'; }

    // Budget detection
    let budget = 'Not provided.';
    const budgetMatch = text.match(/(\d+(\.\d+)?)\s*(lakh|lac|cr|crore|k|thousand)/i);
    if (budgetMatch) {
      budget = budgetMatch[0];
    }

    // Location detection
    let location = 'Not provided.';
    const cities = ['Jaipur', 'Gurugram', 'Gurgaon', 'Mumbai', 'Bangalore', 'Bengaluru', 'Delhi', 'Noida', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Vaishali Nagar', 'Mansarovar', 'Jagatpura', 'Bandra', 'Whitefield', 'Indiranagar', 'Cyber City', 'Golf Course Road'];
    for (const city of cities) {
      if (lower.includes(city.toLowerCase())) {
        location = city;
        break;
      }
    }

    // Buy vs Rent
    const buyOrRent = lower.includes('rent') || lower.includes('lease') ? 'Rent' : (lower.includes('buy') || lower.includes('purchase') || budget !== 'Not provided.' ? 'Buy' : 'Not provided.');

    // Purpose
    const purpose = lower.includes('invest') ? 'Investment' : (lower.includes('family') || lower.includes('shift') || lower.includes('self') ? 'Self-use' : 'Not provided.');

    // Site visit intent
    const hasSiteVisit = lower.includes('visit') || lower.includes('see property') || lower.includes('site') || lower.includes('weekend');
    const siteVisitIntent = hasSiteVisit ? (lower.includes('weekend') ? 'This weekend' : (lower.includes('tomorrow') ? 'Tomorrow' : 'Requested')) : 'Not provided.';

    // Priority
    let priority = 'MEDIUM';
    if (hasSiteVisit || lower.includes('urgent') || lower.includes('ready')) {
      priority = 'HIGH';
    } else if (requirement !== 'Not provided.' && budget !== 'Not provided.') {
      priority = 'HIGH';
    }

    // Missing info check
    const missingInfo = [];
    if (budget === 'Not provided.') missingInfo.push('Budget range');
    if (location === 'Not provided.') missingInfo.push('Preferred locality');
    if (requirement === 'Not provided.') missingInfo.push('Configuration / Property type');

    // Next action
    let nextAction = 'Call to qualify property preferences and budget';
    if (hasSiteVisit) {
      nextAction = `Schedule site visit for ${requirement !== 'Not provided.' ? requirement : 'selected properties'} in ${location !== 'Not provided.' ? location : 'target area'}`;
    } else if (requirement !== 'Not provided.' && location !== 'Not provided.') {
      nextAction = `Share shortlist of matching ${requirement} listings in ${location}`;
    }

    return {
      priority,
      requirement,
      propertyType,
      budget,
      location,
      bedrooms,
      purpose,
      buyOrRent,
      siteVisitIntent,
      missingInfo: missingInfo.length > 0 ? missingInfo : ['Preferred contact time'],
      nextAction,
      suggestedFollowupDays: priority === 'HIGH' ? 1 : 2,
      summary: `Customer inquiring about ${requirement} in ${location}. Budget: ${budget}. Next step: ${nextAction}.`,
    };
  }

  /**
   * Generates a personalized real estate customer follow-up message draft
   */
  async generateRealEstateFollowupDraft(leadId, { customIntent = null } = {}, context = {}) {
    const lead = leadRepo.findById(leadId, context.orgId);
    if (!lead) return { error: 'Lead not found' };

    const reqDesc = lead.property_type || lead.bedrooms ? `${lead.bedrooms ? `${lead.bedrooms}BHK ` : ''}${lead.property_type || 'Property'}` : 'property';
    const locDesc = lead.preferred_location || 'your preferred area';
    const budgetDesc = lead.budget_max ? `within ${lead.budget_max} Lakhs` : '';

    const prompt = `Write a polite, professional, and high-converting real estate follow-up message for a prospective property buyer/tenant:

Client Name: ${lead.name}
Phone: ${lead.phone || 'Not provided'}
Property Requirement: ${reqDesc}
Preferred Location: ${locDesc}
Budget Range: ${budgetDesc || 'Not specified'}
Current Pipeline Stage: ${lead.status}
Scheduled Site Visit Date: ${lead.site_visit_date || 'None'}
Specific Follow-up Scenario / Intent: "${customIntent || 'Routine check-in on shortlisted properties'}"
Notes / History: ${lead.notes || 'Customer showed interest in recent listings.'}

Requirements:
- Keep the message warm, concise, and focused on helping them find their ideal property or confirming their site visit.
- Include a clear call to action (e.g. confirming visit time, sharing 2-3 shortlisted property photos/brochures).
- Return JSON:
{
  "subject": "string",
  "body": "string",
  "channel": "WhatsApp / Email / SMS",
  "scenario": "string"
}`;

    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are an executive real estate sales and client relations specialist.',
      taskType: TASK_TYPES.COMMUNICATION_DRAFT,
      context,
    });

    if (result.success && result.data) {
      return {
        ...result.data,
        leadId: lead.id,
        leadName: lead.name,
        requiresHumanApproval: true,
        dispatched: false,
        statusNote: 'Draft generated. No communication provider configured for automatic sending without human review.',
      };
    }

    // Deterministic fallback draft
    return {
      subject: `Shortlisted ${reqDesc} options in ${locDesc} - Follow up`,
      body: `Hello ${lead.name},\n\nI hope you are doing well.\n\nFollowing up regarding your interest in ${reqDesc} properties in ${locDesc}${budgetDesc ? ` (${budgetDesc})` : ''}. We have 2 verified properties that closely match your criteria.\n\nWould you be available for a brief 15-minute site visit this week, or should I send over the detailed floor plans and pricing brochure?\n\nBest regards,\n${context.user?.name || 'Apex Realty Advisors'}`,
      channel: 'WhatsApp / Email',
      scenario: customIntent || 'Property shortlist follow-up',
      leadId: lead.id,
      leadName: lead.name,
      requiresHumanApproval: true,
      dispatched: false,
      statusNote: 'Draft generated. No communication provider configured for automatic sending without human review.',
    };
  }
}

export const leadAgent = new LeadAgent();
