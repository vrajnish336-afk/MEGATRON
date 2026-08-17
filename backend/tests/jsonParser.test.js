import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonSafely, repairJsonStructure } from '../utils/jsonParser.js';
import { LeadAgent } from '../agents/leadAgent.js';
import { OllamaProvider } from '../ai/providers/ollamaProvider.js';

test('JSON Parser Regression 1: English structured Ollama JSON parsing', () => {
  const englishJson = `
  {
    "priority": "HIGH",
    "requirement": "3BHK Apartment",
    "propertyType": "Apartment",
    "budget": "80 Lakh",
    "location": "Jaipur",
    "bedrooms": 3,
    "purpose": "Self-use",
    "buyOrRent": "Buy",
    "siteVisitIntent": "This weekend",
    "missingInfo": ["Preferred contact time"],
    "nextAction": "Schedule site visit",
    "suggestedFollowupDays": 1,
    "summary": "Qualified buyer looking for 3BHK in Jaipur with 80 Lakh budget."
  }
  `;

  const parsed = parseJsonSafely(englishJson);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.priority, 'HIGH');
  assert.equal(parsed.data.requirement, '3BHK Apartment');
  assert.equal(parsed.data.location, 'Jaipur');
  assert.equal(parsed.data.bedrooms, 3);
  assert.equal(parsed.data.summary, 'Qualified buyer looking for 3BHK in Jaipur with 80 Lakh budget.');
});

test('JSON Parser Regression 2: Hindi Unicode structured JSON (Devanagari characters & digits)', () => {
  const hindiJson = `
  {
    "priority": "HIGH",
    "requirement": "3 बीएचके फ्लैट",
    "propertyType": "Apartment",
    "budget": "80 लाख",
    "location": "जयपुर",
    "bedrooms": 3,
    "purpose": "खुद के रहने के लिए",
    "buyOrRent": "खरीदना",
    "siteVisitIntent": "शनिवार",
    "missingInfo": ["संपर्क का सही समय"],
    "nextAction": "प्रॉपर्टी ब्रोशर साझा करें और साइट विजिट तय करें",
    "suggestedFollowupDays": 1,
    "summary": "ग्राहक जयपुर में 80 लाख के बजट में 3 बीएचके फ्लैट खरीदना चाहता है।"
  }
  `;

  const parsed = parseJsonSafely(hindiJson);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.priority, 'HIGH');
  assert.equal(parsed.data.requirement, '3 बीएचके फ्लैट');
  assert.equal(parsed.data.location, 'जयपुर');
  assert.equal(parsed.data.budget, '80 लाख');
  assert.ok(parsed.data.summary.includes('जयपुर'));
});

test('JSON Parser Regression 3: Hinglish structured JSON parsing', () => {
  const hinglishJson = `
  {
    "priority": "HIGH",
    "requirement": "3BHK Flat in Jaipur",
    "propertyType": "Apartment",
    "budget": "80 lakh",
    "location": "Jaipur",
    "bedrooms": 3,
    "purpose": "Self-use",
    "buyOrRent": "Buy",
    "siteVisitIntent": "Weekend me visit karna chahte hain",
    "missingInfo": ["Exact possession date"],
    "nextAction": "Call customer to confirm weekend site visit timing",
    "suggestedFollowupDays": 1,
    "summary": "Client Jaipur me 3BHK flat buy karna chahta hai budget 80 lakh ke sath."
  }
  `;

  const parsed = parseJsonSafely(hinglishJson);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.priority, 'HIGH');
  assert.equal(parsed.data.siteVisitIntent, 'Weekend me visit karna chahte hain');
  assert.ok(parsed.data.summary.includes('3BHK'));
});

test('JSON Parser Regression 4: Markdown-wrapped code block with preamble and conversational text', () => {
  const markdownWrapped = `
  Here is the structured real estate qualification result:
  \`\`\`json
  {
    "priority": "URGENT",
    "requirement": "Commercial Office Space",
    "propertyType": "Commercial",
    "budget": "2.5 Cr",
    "location": "Gurugram",
    "bedrooms": null,
    "purpose": "Investment",
    "buyOrRent": "Buy",
    "siteVisitIntent": "Immediate",
    "missingInfo": [],
    "nextAction": "Dispatch commercial proposal sheet",
    "suggestedFollowupDays": 0,
    "summary": "High-intent investor seeking commercial property in Gurugram."
  }
  \`\`\`
  Let me know if you need any additional insights!
  `;

  const parsed = parseJsonSafely(markdownWrapped);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.priority, 'URGENT');
  assert.equal(parsed.data.location, 'Gurugram');
  assert.equal(parsed.data.budget, '2.5 Cr');
});

test('JSON Parser Regression 5: Truncated JSON structural auto-repair (Missing closing brace & quotes)', () => {
  // Case A: Truncated without closing brace (the exact pattern observed in earlier log)
  const truncatedNoBrace = '{\n' +
    '  "priority": "LOW",\n' +
    '  "requirement": "3 बीएचके फ्लैट",\n' +
    '  "propertyType": "Apartment",\n' +
    '  "budget": "80 लाख",\n' +
    '  "location": "Jaipur",\n' +
    '  "bedrooms": null,\n' +
    '  "purpose": "Not provided.",\n' +
    '  "buyOrRent": "Buy",\n' +
    '  "siteVisitIntent": "Not provided.",\n' +
    '  "missingInfo": ["Exact budget range", "Preferred contact time"],\n' +
    '  "nextAction": "Share project brochure & floor plan",\n' +
    '  "suggestedFollowupDays": 0,\n' +
    '  "summary": "Client is looking for a 3BHK apartment in Jaipur with a budget of 80 lakh."';

  const parsedA = parseJsonSafely(truncatedNoBrace);
  assert.equal(parsedA.success, true);
  assert.equal(parsedA.data.priority, 'LOW');
  assert.equal(parsedA.data.requirement, '3 बीएचके फ्लैट');
  assert.equal(parsedA.data.summary, 'Client is looking for a 3BHK apartment in Jaipur with a budget of 80 lakh.');

  // Case B: Truncated mid-string with unclosed quote and unclosed brace
  const truncatedMidString = '{"priority": "HIGH", "budget": "1.5 Cr", "summary": "Looking for luxury villa in Jaipur';
  const parsedB = parseJsonSafely(truncatedMidString);
  assert.equal(parsedB.success, true);
  assert.equal(parsedB.data.priority, 'HIGH');
  assert.equal(parsedB.data.budget, '1.5 Cr');
  assert.equal(parsedB.data.summary, 'Looking for luxury villa in Jaipur');

  // Case C: Trailing comma before closing brace
  const trailingCommaJson = '{"priority": "MEDIUM", "location": "Jaipur", "missingInfo": ["Budget", ], }';
  const parsedC = parseJsonSafely(trailingCommaJson);
  assert.equal(parsedC.success, true);
  assert.equal(parsedC.data.priority, 'MEDIUM');
  assert.equal(parsedC.data.missingInfo.length, 1);
});

test('JSON Parser Regression 6: Genuinely malformed text safely falls back without crash or fabrication', () => {
  const gibberish = 'I cannot process this request because I am an AI and have no property data.';
  const result = parseJsonSafely(gibberish);
  assert.equal(result.success, false);
  assert.equal(result.data, null);
  assert.ok(result.error);

  // When LeadAgent receives unparseable input, it uses deterministic heuristic fallback without inventing fields
  const agent = new LeadAgent();
  const fallback = agent.fallbackQualificationExtractor('What is the recipe for chocolate cake?');
  assert.equal(fallback.priority, 'LOW');
  assert.equal(fallback.requirement, 'Not provided.');
  assert.equal(fallback.budget, 'Not provided.');
  assert.equal(fallback.location, 'Not provided.');
  assert.ok(fallback.summary.includes('does not contain identifiable'));
});
