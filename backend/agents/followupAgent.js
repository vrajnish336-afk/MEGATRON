import { BaseAgent } from './baseAgent.js';
import { TASK_TYPES } from '../ai/router.js';
import { leadRepo } from '../database/repositories/leadRepo.js';

export class FollowupAgent extends BaseAgent {
  constructor() {
    super(
      'FollowupAgent',
      'Generates context-aware, multi-language customer follow-up message drafts with strict human approval governance',
      TASK_TYPES.COMMUNICATION_DRAFT
    );
  }

  /**
   * Generates a customer follow-up message draft
   * 
   * @param {Object} input
   * @param {string} input.lead_id - Optional or required Lead ID
   * @param {string} input.customer_name - Customer / Lead name
   * @param {string} input.company - Company or organization name
   * @param {string} input.requirement - Property or service requirement
   * @param {string} input.lead_stage - Current stage (e.g. NEW, QUALIFIED, PROPOSAL, NEGOTIATION)
   * @param {string} input.last_activity - Last recorded activity or date
   * @param {string} input.reason_for_followup - Reason / Context (e.g. No response, Home loan sanction pending)
   * @param {string} input.language - Language: 'English' | 'Hindi' | 'Hinglish' (default: English)
   * @param {string} input.tone - Tone: 'professional' | 'friendly' | 'urgent' | 'formal' (default: professional)
   * @param {Object} context - Execution context { orgId, user }
   */
  async generateDraft(input = {}, context = {}) {
    // 1. Normalize input parameters (supporting snake_case and camelCase)
    const leadId = input.lead_id || input.leadId || null;
    let customerName = input.customer_name || input.customerName || input.name || '';
    let company = input.company || '';
    let requirement = input.requirement || input.property_type || input.propertyType || '';
    let leadStage = input.lead_stage || input.leadStage || input.status || 'QUALIFIED';
    let lastActivity = input.last_activity || input.lastActivity || 'Recent interaction';
    let reason = input.reason_for_followup || input.reasonForFollowup || input.reason || input.context || 'General update';
    let language = this.normalizeLanguage(input.language || input.lang || '');
    let tone = input.tone || 'professional';

    // 2. Enrich from DB if leadId is provided and fields are missing
    if (leadId && context.orgId) {
      try {
        const lead = leadRepo.findById(leadId, context.orgId);
        if (lead) {
          customerName = customerName || lead.name;
          company = company || lead.company || '';
          const reqFromLead = lead.property_type || (lead.bedrooms ? `${lead.bedrooms}BHK ${lead.property_type || 'Apartment'}` : '');
          requirement = requirement || reqFromLead || lead.company || 'Property requirement';
          leadStage = lead.status || leadStage;
          lastActivity = lead.updated_at || lead.created_at || lastActivity;
        }
      } catch (err) {
        // Fallback to provided fields if DB lookup fails
      }
    }

    if (!customerName) {
      customerName = 'Valued Customer';
    }

    // 3. Auto-detect language if not explicitly set
    if (!input.language && !input.lang) {
      language = this.detectLanguageFromText(`${reason} ${customerName} ${requirement}`);
    }

    // 4. Construct AI Prompt
    const prompt = `You are a professional business communication assistant for MEGADRONE Business OS.
Generate a concise, polite, high-converting customer follow-up message draft.

Lead Details:
- Customer Name: ${customerName}
- Company / Account: ${company || 'Individual Client'}
- Requirement / Context: ${requirement || 'Business Services'}
- Current Pipeline Stage: ${leadStage}
- Last Recorded Activity: ${lastActivity}
- Reason for Follow-up: "${reason}"

Draft Requirements:
1. Target Format: Professional WhatsApp / Direct Business Message.
2. Target Language: ${language} ${language === 'Hinglish' ? '(Roman script conversational Hindi mixed with English business terms)' : (language === 'Hindi' ? '(Devanagari script Hindi)' : '(English)')}.
3. Tone: ${tone}.
4. Length: 2 to 4 concise sentences with a clear, low-friction call-to-action.
5. NEVER pretend the message was already sent. Do not include fake timestamps.
6. Return STRICT JSON format:
{
  "draft_message": "string (The complete ready-to-review follow-up message text)",
  "language": "${language}",
  "tone": "${tone}",
  "status": "PENDING_APPROVAL"
}`;

    // 5. Execute via AI Provider abstraction
    const result = await this.runStructured({
      prompt,
      systemPrompt: 'You are an executive customer relations and sales follow-up intelligence agent.',
      taskType: TASK_TYPES.COMMUNICATION_DRAFT,
      context,
    });

    if (result.success && result.data && result.data.draft_message) {
      return {
        draft_message: result.data.draft_message.trim(),
        language: result.data.language || language,
        tone: result.data.tone || tone,
        status: 'PENDING_APPROVAL',
        provider: result.provider,
        model: result.model,
      };
    }

    // 6. Deterministic Fallback Engine (High-quality multi-language templates)
    return this.generateDeterministicDraft({
      customerName,
      company,
      requirement,
      leadStage,
      reason,
      language,
      tone,
      user: context.user,
    });
  }

  /**
   * Deterministic draft generator supporting English, Devanagari Hindi, and Hinglish
   */
  generateDeterministicDraft({ customerName, company, requirement, leadStage, reason, language, tone, user }) {
    const senderName = user?.name || 'MEGADRONE Team';
    const cleanReason = (reason || '').toLowerCase();
    let draftMessage = '';

    if (language === 'Hindi') {
      if (cleanReason.includes('loan') || cleanReason.includes('home loan') || cleanReason.includes('sanction') || cleanReason.includes('ऋण')) {
        draftMessage = `नमस्ते ${customerName} जी,\n\nआशा है आप सकुशल होंगे। आपके होम लोन स्वीकृति (Home Loan Sanction) की स्थिति के संबंध में यह संदेश भेज रहे हैं।\n\nयदि प्रक्रिया को आगे बढ़ाने के लिए हमारी ओर से किसी अतिरिक्त दस्तावेज़ या सहायता की आवश्यकता हो, तो कृपया हमें बताएं।\n\nसादर,\n${senderName}`;
      } else if (cleanReason.includes('no response') || cleanReason.includes('उत्तर नहीं') || cleanReason.includes('reply') || cleanReason.includes('replied')) {
        draftMessage = `नमस्ते ${customerName} जी,\n\nआशा है आप सकुशल हैं। आपके ${requirement || 'प्रॉपर्टी आवश्यकता'} के संदर्भ में हमारे पिछले संवाद पर फॉलो-अप कर रहे थे।\n\nयदि आपको कोई और विवरण चाहिए या कोई प्रश्न हो, तो कृपया हमें बताएं। जब भी समय मिले, हमें अवश्य सूचित करें।\n\nसादर,\n${senderName}`;
      } else if (cleanReason.includes('site visit') || cleanReason.includes('visit') || cleanReason.includes('विजिट') || cleanReason.includes('देखना')) {
        draftMessage = `नमस्ते ${customerName} जी,\n\nआपकी आगामी साइट विजिट (Site Visit) के संबंध में यह एक छोटा सा रिमाइंडर है।\n\nयदि आपको लोकेशन या समय में कोई बदलाव करना हो, तो कृपया हमें बताएं। हम आपकी विजिट के लिए पूरी तरह तैयार हैं।\n\nसादर,\n${senderName}`;
      } else if (cleanReason.includes('document') || cleanReason.includes('doc') || cleanReason.includes('दस्तावेज़') || cleanReason.includes('कागजात')) {
        draftMessage = `नमस्ते ${customerName} जी,\n\nआपके आवेदन और प्रक्रिया को आगे बढ़ाने के लिए आवश्यक दस्तावेज़ों के संबंध में संपर्क कर रहे हैं।\n\nकृपया सुविधा अनुसार आवश्यक दस्तावेज़ साझा करें ताकि हम अगली प्रक्रिया तुरंत शुरू कर सकें।\n\nसादर,\n${senderName}`;
      } else if (cleanReason.includes('negotiation') || cleanReason.includes('price') || cleanReason.includes('discount') || cleanReason.includes('मोलभाव')) {
        draftMessage = `नमस्ते ${customerName} जी,\n\nप्रॉपर्टी के मूल्य और शर्तों पर हुई हालिया चर्चा के संबंध में फॉलो-अप कर रहे हैं।\n\nहम इस प्रक्रिया को आपके अनुकूल अंतिम रूप देने के लिए तत्पर हैं। कृपया बताएं कि हम कब संक्षिप्त चर्चा कर सकते हैं।\n\nसादर,\n${senderName}`;
      } else {
        draftMessage = `नमस्ते ${customerName} जी,\n\nआशा है आपका दिन शुभ हो। आपके ${requirement || 'अनुरोध'} के संबंध में फॉलो-अप कर रहे हैं (${reason})।\n\nकृपया बताएं कि हम आपकी किस प्रकार आगे सहायता कर सकते हैं।\n\nसादर,\n${senderName}`;
      }
    } else if (language === 'Hinglish') {
      if (cleanReason.includes('loan') || cleanReason.includes('home loan') || cleanReason.includes('sanction')) {
        draftMessage = `Namaste ${customerName} ji,\n\nUmmeed hai aap acche honge. Aapke home loan sanction status ke regarding follow-up kar rahe the.\n\nAgar process ko complete karne ke liye hamari taraf se koi additional documents ya verification required ho, to please hume batayein.\n\nWarm regards,\n${senderName}`;
      } else if (cleanReason.includes('no response') || cleanReason.includes('reply') || cleanReason.includes('replied')) {
        draftMessage = `Namaste ${customerName} ji,\n\nHope you are having a good week. Humare previous conversation regarding ${requirement || 'your requirement'} par touch base kar rahe the.\n\nAgar aapko koi aur details chahiye ya koi question ho to please batayein. Looking forward to hearing from you!\n\nWarm regards,\n${senderName}`;
      } else if (cleanReason.includes('site visit') || cleanReason.includes('visit')) {
        draftMessage = `Namaste ${customerName} ji,\n\nAapki scheduled site visit ke regarding gentle reminder hai. Agar aapko location direction ya timing adjust karni ho to please let us know. We are happy to coordinate!\n\nWarm regards,\n${senderName}`;
      } else if (cleanReason.includes('document') || cleanReason.includes('doc')) {
        draftMessage = `Namaste ${customerName} ji,\n\nAapke application process ko aage badhane ke liye required documents ka gentle reminder tha. Please jab bhi convenient ho, pending documents share kar dijiye.\n\nWarm regards,\n${senderName}`;
      } else if (cleanReason.includes('negotiation') || cleanReason.includes('price') || cleanReason.includes('discount')) {
        draftMessage = `Namaste ${customerName} ji,\n\nProperty pricing aur terms par discuss karne ke liye follow-up kar rahe the. Deal finalize karne ke liye hum kab connect kar sakte hain?\n\nWarm regards,\n${senderName}`;
      } else {
        draftMessage = `Namaste ${customerName} ji,\n\nHope you are doing well. Aapke ${requirement || 'requirement'} ke updates share karne ke liye reach out kar rahe the (${reason}).\n\nPlease let us know how we can assist you further.\n\nWarm regards,\n${senderName}`;
      }
    } else {
      // Default: English
      if (cleanReason.includes('loan') || cleanReason.includes('home loan') || cleanReason.includes('sanction')) {
        draftMessage = `Hello ${customerName},\n\nI hope this message finds you well.\n\nI am following up regarding your home loan sanction status for your ${requirement || 'property requirement'}. Please let us know if any additional paperwork or verification is needed from our side to expedite the approval.\n\nBest regards,\n${senderName}`;
      } else if (cleanReason.includes('no response') || cleanReason.includes('reply') || cleanReason.includes('replied')) {
        draftMessage = `Hello ${customerName},\n\nI hope you're having a productive week. Following up on our previous conversation regarding ${requirement || 'your requirement'}.\n\nPlease let us know if you have any questions or would like additional information. Looking forward to connecting when convenient.\n\nBest regards,\n${senderName}`;
      } else if (cleanReason.includes('site visit') || cleanReason.includes('visit')) {
        draftMessage = `Hello ${customerName},\n\nThis is a quick reminder regarding your upcoming scheduled property site visit. Please let us know if you need location directions or would like to adjust the time.\n\nLooking forward to showing you the property!\n\nBest regards,\n${senderName}`;
      } else if (cleanReason.includes('document') || cleanReason.includes('doc')) {
        draftMessage = `Hello ${customerName},\n\nFollowing up to request the pending documentation required to proceed with your application. Please share the files at your earliest convenience so we can advance to the next step.\n\nBest regards,\n${senderName}`;
      } else if (cleanReason.includes('negotiation') || cleanReason.includes('price') || cleanReason.includes('discount')) {
        draftMessage = `Hello ${customerName},\n\nFollowing up on our recent discussion regarding property pricing and terms. We are keen to help finalize the agreement smoothly. Please let us know when you are available for a brief discussion.\n\nBest regards,\n${senderName}`;
      } else {
        draftMessage = `Hello ${customerName},\n\nI hope you are doing well. Touching base regarding ${requirement || 'your account'} (${reason}).\n\nPlease let us know how we can best assist you with your next steps.\n\nBest regards,\n${senderName}`;
      }
    }

    return {
      draft_message: draftMessage,
      language,
      tone,
      status: 'PENDING_APPROVAL',
      provider: 'deterministic_fallback',
      model: 'rule_based_engine',
    };
  }

  normalizeLanguage(lang) {
    const l = (lang || '').trim().toLowerCase();
    if (l === 'hindi' || l === 'hi' || l === 'हिन्दी' || l === 'हिंदी') return 'Hindi';
    if (l === 'hinglish' || l === 'roman_hindi' || l === 'en-in') return 'Hinglish';
    return 'English';
  }

  detectLanguageFromText(text) {
    if (!text) return 'English';
    // Devanagari Unicode range: \u0900-\u097F
    if (/[\u0900-\u097F]/.test(text)) {
      return 'Hindi';
    }
    // Check Hinglish patterns
    const hinglishMarkers = ['karna', 'chahiye', 'karein', 'kare', 'hum', 'aap', 'ji', 'hai', 'hain', 'batayein', 'bhejo', 'acche', 'karenge', 'baat'];
    const lower = text.toLowerCase();
    const isHinglish = hinglishMarkers.some(m => new RegExp(`\\b${m}\\b`, 'i').test(lower));
    if (isHinglish) return 'Hinglish';

    return 'English';
  }
}

export const followupAgent = new FollowupAgent();
