// Live Runtime Verification for Phase 6.2 Orchestrator Integration

async function main() {
  const baseUrl = 'http://127.0.0.1:5000';
  console.log('--- 1. Authenticating with Demo User ---');
  
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rajnish.verma@apexrealty.demo',
      password: 'megadrone123'
    })
  });

  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.data?.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }

  const token = loginData.data.token;
  console.log(`Authenticated successfully as: ${loginData.data.user.name} (${loginData.data.user.role})`);

  async function queryAssistant(queryText) {
    console.log(`\n==================================================`);
    console.log(`Query: "${queryText}"`);
    console.log(`==================================================`);

    const res = await fetch(`${baseUrl}/api/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: queryText })
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Result Intent:', data.intent);
    console.log('Target Agent:', data.agent);
    console.log('Message:', data.message);
    console.log('Approval Required:', data.approvalRequired);
    console.log('Dispatched:', data.dispatched);
    if (data.data) {
      console.log('Data Preview:', JSON.stringify(data.data, null, 2).slice(0, 300) + '...');
    }
    return data;
  }

  // 1. LEAD_QUERY
  const q1 = await queryAssistant('Rajesh Khandelwal ka deal status batao');
  if (q1.intent !== 'LEAD_QUERY' || q1.agent !== 'LeadAgent') {
    throw new Error(`Test 1 Failed: Expected LEAD_QUERY / LeadAgent, got ${q1.intent} / ${q1.agent}`);
  }

  // 2. SALES_QUERY
  const q2 = await queryAssistant('Aaj kis customer ko call karna chahiye');
  if (q2.intent !== 'SALES_QUERY' || q2.agent !== 'SalesManagerAgent') {
    throw new Error(`Test 2 Failed: Expected SALES_QUERY / SalesManagerAgent, got ${q2.intent} / ${q2.agent}`);
  }

  // 3. OPERATIONS_QUERY
  const q3 = await queryAssistant('Meri agency ka health score batao');
  if (q3.intent !== 'OPERATIONS_QUERY' || q3.agent !== 'BusinessOperationsAgent') {
    throw new Error(`Test 3 Failed: Expected OPERATIONS_QUERY / BusinessOperationsAgent, got ${q3.intent} / ${q3.agent}`);
  }

  // 4. FOLLOWUP_REQUEST
  const q4 = await queryAssistant('Rajesh ko WhatsApp follow-up message bana do');
  if (q4.intent !== 'FOLLOWUP_REQUEST' || q4.agent !== 'LeadAgent' || !q4.approvalRequired || q4.dispatched) {
    throw new Error(`Test 4 Failed: Expected FOLLOWUP_REQUEST / LeadAgent with approvalRequired=true & dispatched=false, got ${q4.intent} / ${q4.agent}`);
  }

  // 5. GENERAL_QUERY
  const q5 = await queryAssistant('Hello');
  if (q5.intent !== 'GENERAL_QUERY' || q5.agent !== 'LocalAI') {
    throw new Error(`Test 5 Failed: Expected GENERAL_QUERY / LocalAI, got ${q5.intent} / ${q5.agent}`);
  }

  console.log('\n==================================================');
  console.log('ALL 5 LIVE RUNTIME TESTS PASSED ON RUNNING SERVER!');
  console.log('==================================================');
}

main().catch(err => {
  console.error('Runtime Verification Error:', err);
  process.exit(1);
});
