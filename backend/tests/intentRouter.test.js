import test from 'node:test';
import assert from 'node:assert/strict';
import { intentRouter, IntentRouter } from '../core/intentRouter.js';

test('Intent Router: 1. LEAD_QUERY Routing', () => {
  const router = new IntentRouter();

  // Required test cases
  const case1 = router.route('Rajesh Khandelwal ka deal status batao');
  assert.equal(case1.intent, 'LEAD_QUERY');
  assert.equal(case1.agent, 'LeadAgent');

  const case2 = router.route("Show me this customer's details");
  assert.equal(case2.intent, 'LEAD_QUERY');
  assert.equal(case2.agent, 'LeadAgent');

  // Additional lead queries
  const case3 = router.route('Show all qualified leads');
  assert.equal(case3.intent, 'LEAD_QUERY');
  assert.equal(case3.agent, 'LeadAgent');

  const case4 = router.route('Client contact information');
  assert.equal(case4.intent, 'LEAD_QUERY');
  assert.equal(case4.agent, 'LeadAgent');
});

test('Intent Router: 2. SALES_QUERY Routing (Hindi / Hinglish / English)', () => {
  const router = new IntentRouter();

  // Required test cases
  const case1 = router.route('aaj kis customer ko call karna chahiye');
  assert.equal(case1.intent, 'SALES_QUERY');
  assert.equal(case1.agent, 'SalesManagerAgent');

  const case2 = router.route('kisko call karna chahiye');
  assert.equal(case2.intent, 'SALES_QUERY');
  assert.equal(case2.agent, 'SalesManagerAgent');

  const case3 = router.route('aaj kis lead par focus karna hai');
  assert.equal(case3.intent, 'SALES_QUERY');
  assert.equal(case3.agent, 'SalesManagerAgent');

  const case4 = router.route('Who should we call first today?');
  assert.equal(case4.intent, 'SALES_QUERY');
  assert.equal(case4.agent, 'SalesManagerAgent');

  // Additional Hinglish / Hindi & English sales phrases
  const case5 = router.route('kis customer ko call karu');
  assert.equal(case5.intent, 'SALES_QUERY');
  assert.equal(case5.agent, 'SalesManagerAgent');

  const case6 = router.route('kis lead ko call karu');
  assert.equal(case6.intent, 'SALES_QUERY');
  assert.equal(case6.agent, 'SalesManagerAgent');

  const case7 = router.route('sales team ko kya karna chahiye');
  assert.equal(case7.intent, 'SALES_QUERY');
  assert.equal(case7.agent, 'SalesManagerAgent');

  const case8 = router.route('who should we call first');
  assert.equal(case8.intent, 'SALES_QUERY');
  assert.equal(case8.agent, 'SalesManagerAgent');

  const case9 = router.route('who should my team call first');
  assert.equal(case9.intent, 'SALES_QUERY');
  assert.equal(case9.agent, 'SalesManagerAgent');
});

test('Intent Router: 3. OPERATIONS_QUERY Routing', () => {
  const router = new IntentRouter();

  // Required test cases
  const case1 = router.route('meri agency ka health score batao');
  assert.equal(case1.intent, 'OPERATIONS_QUERY');
  assert.equal(case1.agent, 'BusinessOperationsAgent');

  const case2 = router.route("what are today's operational risks?");
  assert.equal(case2.intent, 'OPERATIONS_QUERY');
  assert.equal(case2.agent, 'BusinessOperationsAgent');

  // Additional operations queries
  const case3 = router.route('Show business KPI dashboard');
  assert.equal(case3.intent, 'OPERATIONS_QUERY');
  assert.equal(case3.agent, 'BusinessOperationsAgent');

  const case4 = router.route('Daily executive brief');
  assert.equal(case4.intent, 'OPERATIONS_QUERY');
  assert.equal(case4.agent, 'BusinessOperationsAgent');
});

test('Intent Router: 4. FOLLOWUP_REQUEST Routing', () => {
  const router = new IntentRouter();

  // Required test cases
  const case1 = router.route('Rajesh ko WhatsApp message bana do');
  assert.equal(case1.intent, 'FOLLOWUP_REQUEST');
  assert.equal(case1.agent, 'LeadAgent');

  const case2 = router.route('create a follow-up draft for Rajesh');
  assert.equal(case2.intent, 'FOLLOWUP_REQUEST');
  assert.equal(case2.agent, 'LeadAgent');

  // Additional follow-up drafting queries
  const case3 = router.route('Draft an email response for client Vikram');
  assert.equal(case3.intent, 'FOLLOWUP_REQUEST');
  assert.equal(case3.agent, 'LeadAgent');

  const case4 = router.route('Prepare WhatsApp message for lead Ananya');
  assert.equal(case4.intent, 'FOLLOWUP_REQUEST');
  assert.equal(case4.agent, 'LeadAgent');
});

test('Intent Router: 5. GENERAL_QUERY Routing', () => {
  const router = new IntentRouter();

  // Required test cases
  const case1 = router.route('hello');
  assert.equal(case1.intent, 'GENERAL_QUERY');
  assert.equal(case1.agent, 'LocalAI');

  const case2 = router.route('good morning');
  assert.equal(case2.intent, 'GENERAL_QUERY');
  assert.equal(case2.agent, 'LocalAI');

  // Additional general queries / edge cases
  const case3 = router.route('');
  assert.equal(case3.intent, 'GENERAL_QUERY');
  assert.equal(case3.agent, 'LocalAI');

  const case4 = router.route(null);
  assert.equal(case4.intent, 'GENERAL_QUERY');
  assert.equal(case4.agent, 'LocalAI');
});

test('Intent Router: 6. Priority Order Precedence (Specific before Generic)', () => {
  // 1. FOLLOWUP_REQUEST has priority over generic customer/lead words
  const followupWithLead = intentRouter.route('create a WhatsApp message for lead Priya');
  assert.equal(followupWithLead.intent, 'FOLLOWUP_REQUEST');

  // 2. SALES_QUERY has priority over generic customer/lead words
  const salesWithCustomer = intentRouter.route('aaj kis customer ko call karna chahiye');
  assert.equal(salesWithCustomer.intent, 'SALES_QUERY');

  // 3. OPERATIONS_QUERY has priority over generic words
  const opsQuery = intentRouter.route('agency health and business risks');
  assert.equal(opsQuery.intent, 'OPERATIONS_QUERY');

  // 4. Pure LEAD_QUERY without sales/ops/drafting intent routes to LEAD_QUERY
  const leadQuery = intentRouter.route('Show customer details for Vikram');
  assert.equal(leadQuery.intent, 'LEAD_QUERY');
});

test('Intent Router: 7. Deterministic Routing (No Randomness or External Calls)', () => {
  const query = 'aaj kis customer ko call karna chahiye';
  for (let i = 0; i < 100; i++) {
    const result = intentRouter.route(query);
    assert.equal(result.intent, 'SALES_QUERY');
    assert.equal(result.agent, 'SalesManagerAgent');
  }
});
