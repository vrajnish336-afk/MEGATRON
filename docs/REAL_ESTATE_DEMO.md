# MEGADRONE Real Estate OS — 5-Minute Demonstration Script

This step-by-step walkthrough is designed for demonstrating MEGADRONE Business OS to real estate brokers, agency owners, and sales team leaders.

---

## Demo Overview & Target Audience
- **Target Customer**: Real Estate Brokers, Agency Owners, Lead Managers, and Property Consultants.
- **Key Value Proposition**: *"Never Miss a Lead. Never Lose Track of Follow-ups."*
- **Total Demo Duration**: 5 Minutes.

---

## 1. The Business Problem (Minute 0:00 – 0:45)
**Narrative to Share**:
> *"Real estate agencies invest heavily in portal ads, social media, and billboards. But the biggest revenue loss happens after the lead arrives. Inquiries get scattered across agent phones, site visit dates get missed, and buyers go cold when follow-ups are delayed by 48 hours. Generic chatbots can't be trusted because they hallucinate pricing or send unauthorized messages. MEGADRONE solves this with a governed, AI-powered operating layer."*

---

## 2. Executive Dashboard: Today's Real Estate Brief (Minute 0:45 – 1:30)
**Action**:
1. Open `http://localhost:5000` and click **"Principal Broker"** to log in as `rajnish.verma@apexrealty.demo`.
2. Notice the **Good morning, Rajnish** greeting and **TODAY'S BUSINESS BRIEF**:
   - Live verified counts of: **New Inbound Leads**, **Hot Leads**, **Site Visits Today**, **Overdue Follow-ups**, **Negotiations**, and **Won Deals**.
   - Zero hallucinated numbers: every number reflects active database records.
3. Review the **"Executive AI Assessment & Priorities"** highlighting urgent site visits and closing negotiations for the day.

---

## 3. Lead Management & AI Qualification (Minute 1:30 – 2:30)
**Action**:
1. Click **Leads CRM** in the sidebar.
2. Observe real estate specific fields: **Property Type** (3BHK, Villa, Commercial), **Budget (Min-Max)**, **Preferred Location**, and **Site Visit Date**.
3. Click the purple **"AI Lead Qualifier"** button in the top right.
4. Click **"Sample 1 (Jaipur 3BHK)"** to paste:
   > *"Customer wants 3BHK in Jaipur, budget 80 lakh, wants to visit this weekend."*
5. Click **"Extract Requirements & Classify Priority"**:
   - Watch MEGADRONE extract:
     - **Priority**: `HIGH`
     - **Requirement**: `3BHK Apartment`
     - **Budget**: `80 lakh`
     - **Location**: `Jaipur`
     - **Next Action**: `Schedule site visit for 3BHK in Jaipur`
     - **Missing Info**: Identifies unprovided fields (e.g. preferred contact time).
6. Click **"Save as New CRM Lead"** to immediately add it to the live CRM.

---

## 4. Follow-up Intelligence & Draft Generation (Minute 2:30 – 3:30)
**Action**:
1. Return to the **Executive Dashboard** and look at the **"Follow-ups Needing Attention"** card.
2. Notice how leads are intelligently ranked:
   1. **Overdue buyers** (e.g., Rajesh Khandelwal - Commercial Negotiation)
   2. **High-priority prospects** (e.g., Devika Choudhary - 4BHK Villa)
   3. **Upcoming site visits**
3. Click **"Generate Draft"** next to **Rajesh Khandelwal**.
4. Select the scenario: *"Customer hasn't replied for 3 days"* or *"Follow up on price negotiation"*.
5. Click **"Regenerate Draft"**:
   - A tailored, professional message is generated referencing the specific property and negotiation context.
   - Highlight the banner: **"Human-in-the-Loop Governance: MEGADRONE will not dispatch messages automatically. Review before dispatch."**

---

## 5. Mandatory Human Approval Queue (Minute 3:30 – 4:15)
**Action**:
1. Navigate to **Approvals Queue** in the sidebar.
2. Show the pending high-risk action (Commercial Proposal Outreach for Rajesh Khandelwal).
3. Demonstrate safety transparency:
   - Risk level: `HIGH RISK`
   - Interception Reason: *"Outbound commercial agreement with pricing concessions requires broker authorization before dispatch."*
   - Full JSON payload inspector showing exactly what would be sent.
4. Click **"Authorize & Execute"** to demonstrate supervisor sign-off and audit logging.

---

## 6. Business Impact & Multilingual AI Operations (Minute 4:15 – 5:00)
**Action**:
1. Navigate to **AI Assistant** in the sidebar.
2. Click the quick chip: **"आज मेरे सबसे important customers कौन हैं?"** (or type a custom command).
3. Show how the assistant queries the live CRM database and returns verified top leads without speculating.
4. Navigate to the **Business Impact** section on the Dashboard or Reports page to show live throughput metrics (Leads managed, tasks completed, drafts generated, approval actions).
5. Open the **Security & Audit Trail** to demonstrate secret redaction and complete accountability.

---

## Key Takeaway for the Customer
> *"MEGADRONE gives your brokerage a structured operating system where leads never slip through the cracks, AI generates your team's follow-ups, and brokers maintain 100% human control."*
