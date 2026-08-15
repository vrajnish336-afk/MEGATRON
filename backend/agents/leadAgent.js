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
   * Deterministic pattern matcher for real estate lead qualification (supports English, Hindi, Hinglish)
   */
  fallbackQualificationExtractor(text) {
    const raw = text || '';
    const lower = raw.toLowerCase();

    // Check if completely unrelated text (e.g. recipe, generic chit-chat)
    const reKeywords = [
      'bhk', 'flat', 'apartment', 'villa', 'house', 'plot', 'land', 'commercial', 'office', 'shop',
      'budget', 'lakh', 'lac', 'cr', 'crore', 'visit', 'rent', 'buy', 'lease', 'jaipur', 'gurgaon',
      'gurugram', 'noida', 'delhi', 'mumbai', 'bangalore', 'pune', 'property',
      // Hindi / Devanagari keywords
      'बीएचके', 'फ्लैट', 'विला', 'प्लॉट', 'दुकान', 'घर', 'मकान', 'कमर्शियल', 'जमीन', 'लाख', 'करोड़',
      'जयपुर', 'गुड़गांव', 'गुरुग्राम', 'नोएडा', 'दिल्ली', 'मुंबई', 'पुणे', 'बैंगलोर', 'विजिट', 'दिखाओ', 'किराया', 'खरीदना'
    ];

    const hasRealEstateContext = reKeywords.some(kw => lower.includes(kw) || raw.includes(kw));

    if (!hasRealEstateContext && raw.trim().length > 0) {
      return {
        priority: 'LOW',
        requirement: 'Not provided.',
        propertyType: 'Not provided.',
        budget: 'Not provided.',
        location: 'Not provided.',
        bedrooms: null,
        purpose: 'Not provided.',
        buyOrRent: 'Not provided.',
        siteVisitIntent: 'Not provided.',
        missingInfo: ['Property type', 'Budget range', 'Preferred locality', 'Contact preference'],
        nextAction: 'Contact lead to verify property inquiry details.',
        suggestedFollowupDays: 3,
        summary: 'Inquiry does not contain identifiable real estate property requirements.',
      };
    }

    // Bedroom / property type detection
    let requirement = 'Not provided.';
    let propertyType = 'Not provided.';
    let bedrooms = null;
    if (lower.includes('1bhk') || lower.includes('1 bhk') || raw.includes('1 बीएचके') || raw.includes('1बीएचके')) { requirement = '1BHK'; propertyType = 'Apartment'; bedrooms = 1; }
    else if (lower.includes('2bhk') || lower.includes('2 bhk') || raw.includes('2 बीएचके') || raw.includes('2बीएचके')) { requirement = '2BHK'; propertyType = 'Apartment'; bedrooms = 2; }
    else if (lower.includes('3bhk') || lower.includes('3 bhk') || raw.includes('3 बीएचके') || raw.includes('3बीएचके')) { requirement = '3BHK'; propertyType = 'Apartment'; bedrooms = 3; }
    else if (lower.includes('4bhk') || lower.includes('4 bhk') || raw.includes('4 बीएचके') || raw.includes('4बीएचके')) { requirement = '4BHK'; propertyType = 'Luxury Apartment'; bedrooms = 4; }
    else if (lower.includes('villa') || raw.includes('विला')) { requirement = 'Villa / Independent House'; propertyType = 'Villa'; }
    else if (lower.includes('plot') || lower.includes('land') || raw.includes('प्लॉट') || raw.includes('जमीन')) { requirement = 'Residential Plot'; propertyType = 'Plot'; }
    else if (lower.includes('commercial') || lower.includes('office') || lower.includes('shop') || raw.includes('कमर्शियल') || raw.includes('दुकान')) { requirement = 'Commercial Property'; propertyType = 'Commercial'; }
    else if (lower.includes('flat') || lower.includes('apartment') || raw.includes('फ्लैट')) { requirement = 'Apartment / Flat'; propertyType = 'Apartment'; }
    else if (lower.includes('property') || lower.includes('home') || lower.includes('house') || raw.includes('मकान') || raw.includes('घर')) { requirement = 'Residential Property'; propertyType = 'Residential'; }

    // Budget detection (English + Hindi lakh/crore)
    let budget = 'Not provided.';
    const budgetMatch = raw.match(/(\d+(\.\d+)?)\s*(lakh|lac|cr|crore|k|thousand|लाख|करोड़)/i);
    if (budgetMatch) {
      budget = budgetMatch[0];
    }

    // Location detection
    let location = 'Not provided.';
    const locationMap = [
      { key: 'jaipur', label: 'Jaipur' }, { key: 'जयपुर', label: 'Jaipur' },
      { key: 'gurgaon', label: 'Gurugram' }, { key: 'gurugram', label: 'Gurugram' }, { key: 'गुड़गांव', label: 'Gurugram' }, { key: 'गुरुग्राम', label: 'Gurugram' },
      { key: 'mumbai', label: 'Mumbai' }, { key: 'मुंबई', label: 'Mumbai' },
      { key: 'bangalore', label: 'Bangalore' }, { key: 'bengaluru', label: 'Bangalore' }, { key: 'बैंगलोर', label: 'Bangalore' },
      { key: 'delhi', label: 'Delhi' }, { key: 'दिल्ली', label: 'Delhi' },
      { key: 'noida', label: 'Noida' }, { key: 'नोएडा', label: 'Noida' },
      { key: 'pune', label: 'Pune' }, { key: 'पुणे', label: 'Pune' },
      { key: 'vaishali nagar', label: 'Vaishali Nagar, Jaipur' },
      { key: 'mansarovar', label: 'Mansarovar, Jaipur' },
      { key: 'jagatpura', label: 'Jagatpura, Jaipur' },
      { key: 'golf course road', label: 'Golf Course Road, Gurugram' },
      { key: 'bandra', label: 'Bandra, Mumbai' },
      { key: 'whitefield', label: 'Whitefield, Bangalore' },
    ];

    for (const item of locationMap) {
      if (lower.includes(item.key) || raw.includes(item.key)) {
        location = item.label;
        break;
      }
    }

    // Buy vs Rent
    const buyOrRent = (lower.includes('rent') || lower.includes('lease') || raw.includes('किराया')) ? 'Rent' : ((lower.includes('buy') || lower.includes('purchase') || raw.includes('खरीद') || budget !== 'Not provided.') ? 'Buy' : 'Not provided.');

    // Purpose
    const purpose = (lower.includes('invest') || raw.includes('निवेश')) ? 'Investment' : ((lower.includes('family') || lower.includes('shift') || lower.includes('self') || raw.includes('रहने')) ? 'Self-use' : 'Not provided.');

    // Site visit intent (English + Hindi Saturday/Sunday/Weekend/Tomorrow)
    const hasSiteVisit = lower.includes('visit') || lower.includes('see property') || lower.includes('site') || lower.includes('weekend') ||
                         lower.includes('saturday') || lower.includes('sunday') || lower.includes('tomorrow') ||
                         raw.includes('विजिट') || raw.includes('दिखाओ') || raw.includes('शनिवार') || raw.includes('रविवार') || raw.includes('वीकेंड') || raw.includes('कल');

    let siteVisitIntent = 'Not provided.';
    if (hasSiteVisit) {
      if (lower.includes('saturday') || raw.includes('शनिवार')) siteVisitIntent = 'Saturday';
      else if (lower.includes('sunday') || raw.includes('रविवार')) siteVisitIntent = 'Sunday';
      else if (lower.includes('weekend') || raw.includes('वीकेंड')) siteVisitIntent = 'This weekend';
      else if (lower.includes('tomorrow') || raw.includes('कल')) siteVisitIntent = 'Tomorrow';
      else siteVisitIntent = 'Requested';
    }

    // Priority
    let priority = 'MEDIUM';
    if (hasSiteVisit || lower.includes('urgent') || lower.includes('ready') || raw.includes('जल्दी') || raw.includes('तुरंत')) {
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
