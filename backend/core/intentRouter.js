/**
 * MEGATRON Intent Router
 * Phase 6.1
 *
 * Responsible for:
 * - Understanding user request category
 * - Selecting correct AI agent
 * - Safe routing (no direct execution)
 */

export class IntentRouter {

    constructor() {
        this.intents = {
            LEAD_QUERY: "LeadAgent",
            SALES_QUERY: "SalesManagerAgent",
            OPERATIONS_QUERY: "BusinessOperationsAgent",
            FOLLOWUP_REQUEST: "LeadAgent",
            GENERAL_QUERY: "LocalAI"
        };
    }


    /**
     * Detect user intent
     * Priority: FOLLOWUP_REQUEST -> SALES_QUERY -> OPERATIONS_QUERY -> LEAD_QUERY -> GENERAL_QUERY
     */
    detectIntent(message = "") {
        if (!message || typeof message !== "string") {
            return "GENERAL_QUERY";
        }

        const text = message.toLowerCase().trim();

        // 1. Follow-up generation (Outreach drafting)
        if (
            text.includes("whatsapp") ||
            text.includes("message") ||
            text.includes("draft") ||
            text.includes("email") ||
            text.includes("follow-up draft") ||
            text.includes("followup draft") ||
            text.includes("follow up draft")
        ) {
            return "FOLLOWUP_REQUEST";
        }

        // 2. Sales queries & prioritizations (Hindi / Hinglish / English)
        if (
            text.includes("priority") ||
            text.includes("priorities") ||
            text.includes("call first") ||
            text.includes("who should we call") ||
            text.includes("who should i call") ||
            text.includes("who should my team call") ||
            text.includes("who to call") ||
            text.includes("whom to call") ||
            text.includes("whom should we call") ||
            text.includes("who do we call") ||
            text.includes("kisko call") ||
            text.includes("kise call") ||
            text.includes("kis customer ko call") ||
            text.includes("kis lead ko call") ||
            text.includes("kis client ko call") ||
            text.includes("call karna") ||
            text.includes("call karni") ||
            text.includes("call karu") ||
            text.includes("call kare") ||
            text.includes("call karein") ||
            text.includes("focus karna") ||
            text.includes("focus kare") ||
            text.includes("focus karein") ||
            text.includes("par focus") ||
            text.includes("sales team") ||
            text.includes("sales plan") ||
            text.includes("daily plan") ||
            text.includes("calling list") ||
            text.includes("call list") ||
            text.includes("sales") ||
            text.includes("follow up") ||
            text.includes("followup") ||
            text.includes("follow-up")
        ) {
            return "SALES_QUERY";
        }

        // 3. Operations queries
        if (
            text.includes("health") ||
            text.includes("risk") ||
            text.includes("operational") ||
            text.includes("operation") ||
            text.includes("operations") ||
            text.includes("agency") ||
            text.includes("business") ||
            text.includes("kpi") ||
            text.includes("kpis") ||
            text.includes("radar") ||
            text.includes("executive plan") ||
            text.includes("brief")
        ) {
            return "OPERATIONS_QUERY";
        }

        // 4. Lead related queries (Generic customer / lead queries)
        if (
            text.includes("lead") ||
            text.includes("leads") ||
            text.includes("customer") ||
            text.includes("customers") ||
            text.includes("buyer") ||
            text.includes("buyers") ||
            text.includes("client") ||
            text.includes("clients") ||
            text.includes("deal status") ||
            text.includes("deal") ||
            text.includes("deals") ||
            text.includes("prospect") ||
            text.includes("prospects") ||
            text.includes("details") ||
            text.includes("qualification") ||
            text.includes("qualify")
        ) {
            return "LEAD_QUERY";
        }

        // 5. General fallback query
        return "GENERAL_QUERY";
    }



    /**
     * Return responsible agent
     */
    getAgent(intent) {

        return this.intents[intent] || "LocalAI";

    }



    /**
     * Complete routing
     */
    route(message) {

        const intent = this.detectIntent(message);

        return {
            intent,
            agent: this.getAgent(intent)
        };

    }

}


export const intentRouter = new IntentRouter();