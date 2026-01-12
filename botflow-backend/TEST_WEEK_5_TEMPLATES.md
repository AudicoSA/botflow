# Week 5 Template Testing

## Medical Template Tests

### Test 1: Appointment Booking
**Customer:** "I need to book an appointment"

**Expected:**
- Bot asks for name, contact, reason, preferred date/time
- Consultation fee mentioned
- Medical aid status confirmed

**Verify:**
- Intent: `book_appointment` triggered
- All required information collected
- Professional and empathetic tone

### Test 2: Emergency Detection
**Customer:** "I have severe chest pain"

**Expected:**
- Bot immediately provides emergency numbers (10177 or 112)
- Emergency contact provided if configured
- Clear urgency in response

**Verify:**
- Intent: `emergency` triggered
- Handoff condition triggered
- No delay in providing emergency info
- Does not attempt to diagnose

### Test 3: Medical Aid Question
**Customer:** "Do you accept Discovery medical aid?"

**Expected:**
- Bot confirms medical aid policy
- Asks customer to bring membership card
- Clarifies which schemes accepted

**Verify:**
- Intent: `medical_aid` triggered
- Clear response about acceptance policy
- Professional handling

### Test 4: Operating Hours
**Customer:** "What time do you open?"

**Expected:**
- Bot provides operating hours
- Mentions closed on public holidays

**Verify:**
- Intent: `check_hours` triggered
- Hours clearly stated
- Additional relevant info provided

### Test 5: Consultation Fees
**Customer:** "How much does a consultation cost?"

**Expected:**
- Bot provides consultation fee
- Mentions medical aid acceptance
- Clarifies specialist services may vary

**Verify:**
- Intent: `get_fees` triggered
- Clear pricing information
- Medical aid context provided

---

## Real Estate Template Tests

### Test 6: Property Search
**Customer:** "I'm looking for a 2-bedroom apartment in Camps Bay"

**Expected:**
- Bot qualifies budget, timeline, specific needs
- Shows enthusiasm and professionalism
- Offers to send listings

**Verify:**
- Intent: `property_search` triggered
- Budget qualification attempted
- Timeline asked
- Rapport building language used

### Test 7: Viewing Booking
**Customer:** "Can I view the property on Saturday?"

**Expected:**
- Bot collects name, contact, time preference
- Confirms viewing details
- Asks which property they want to see

**Verify:**
- Intent: `book_viewing` triggered
- All booking details collected
- Professional confirmation

### Test 8: Budget Qualification
**Customer:** "What can I get for R2 million?"

**Expected:**
- Bot confirms budget range
- Offers to send listings in that range
- Tries to move toward viewing

**Verify:**
- Intent: `budget_question` triggered
- Enthusiastic response
- Next steps proposed

### Test 9: Area Question
**Customer:** "Do you have properties near good schools?"

**Expected:**
- Bot asks about preferred areas
- Discusses lifestyle needs
- Matches to service areas

**Verify:**
- Intent: `area_question` triggered
- Consultative approach
- Service area alignment

### Test 10: Property Details
**Customer:** "What's the price and how many bedrooms?"

**Expected:**
- Bot provides details if known
- Offers to send full listing
- Tries to book viewing

**Verify:**
- Intent: `property_details` triggered
- Helpful response
- Viewing suggestion included

---

## E-commerce Template Tests

### Test 11: Order Tracking
**Customer:** "Where is my order #12345?"

**Expected:**
- Bot asks for confirmation details (name/email)
- Privacy protection measures
- Clear explanation of process

**Verify:**
- Intent: `track_order` triggered
- Identity verification attempted
- Order number captured

### Test 12: Product Inquiry
**Customer:** "Do you have Nike shoes in size 10?"

**Expected:**
- Bot asks for more details
- Directs to website
- Offers to help find alternatives

**Verify:**
- Intent: `product_inquiry` triggered
- Website reference provided
- Helpful and solution-oriented

### Test 13: Return Request
**Customer:** "I want to return my order"

**Expected:**
- Bot explains return policy
- Asks for order number
- Clear return instructions

**Verify:**
- Intent: `return_inquiry` triggered
- Return policy stated
- Process explained clearly

### Test 14: Shipping Question
**Customer:** "How long does delivery take?"

**Expected:**
- Bot provides delivery time, areas, and fees
- Mentions free delivery threshold if applicable

**Verify:**
- Intent: `shipping_question` triggered
- Complete delivery information
- Clear and accurate

### Test 15: Payment Question
**Customer:** "What payment methods do you accept?"

**Expected:**
- Bot lists accepted payment methods
- Clear and comprehensive

**Verify:**
- Intent: `payment_question` triggered
- All payment options listed

### Test 16: Product Availability
**Customer:** "Is this item in stock?"

**Expected:**
- Bot asks for product details
- Directs to website for real-time stock
- Offers alternatives

**Verify:**
- Intent: `product_inquiry` triggered
- Website direction provided
- Helpful response

### Test 17: Complaint Handling
**Customer:** "My order arrived damaged"

**Expected:**
- Bot shows empathy
- Asks for order number and details
- Offers solution or escalates

**Verify:**
- Intent: `complaint` triggered
- Empathetic response
- Solution-oriented approach
- Handoff condition may trigger

### Test 18: Promotion Question
**Customer:** "Do you have any sales right now?"

**Expected:**
- Bot mentions current promotions
- Directs to website for full deals

**Verify:**
- Intent: `promo_question` triggered
- Helpful response
- Website reference

---

## Cross-Template Tests

### Test 19: Angry Customer (All Templates)
**Customer:** "This is ridiculous! I'm very unhappy!"

**Expected (All):**
- Bot shows empathy
- Handoff condition triggered
- Professional handling before escalation

**Verify:**
- Handoff condition detected
- Appropriate tone maintained
- Escalation to human support

### Test 20: Out of Scope Question (All Templates)
**Customer:** "What's the weather like today?"

**Expected (All):**
- Bot politely stays in scope
- Redirects to business services
- Professional boundary setting

**Verify:**
- Bot doesn't answer off-topic
- Maintains focus on business
- Polite redirection

### Test 21: Greeting (All Templates)
**Customer:** "Hello"

**Expected (All):**
- Welcome message sent
- Clear service offerings stated
- Inviting tone

**Verify:**
- Welcome message matches template
- Business name included (variable replaced)
- Professional and friendly

### Test 22: Thank You (All Templates)
**Customer:** "Thank you for your help"

**Expected (All):**
- Polite acknowledgment
- Offers further assistance
- Professional closing

**Verify:**
- Appropriate response
- Maintains engagement
- Professional tone

---

## Variable Replacement Tests

### Test 23: Medical Template Variables
**Verify in responses:**
- `{{practice_name}}` → Actual practice name
- `{{practice_type}}` → Correct type
- `{{consultation_fee}}` → Correct fee
- `{{operating_hours}}` → Correct hours
- `{{location}}` → Correct address
- `{{accepts_medical_aid}}` → Correct policy

### Test 24: Real Estate Template Variables
**Verify in responses:**
- `{{agent_name}}` → Actual agent name
- `{{service_areas}}` → Correct areas
- `{{property_types}}` → Correct types (comma-separated)
- `{{specialization}}` → Correct specialization
- `{{contact_number}}` → Correct phone
- `{{email}}` → Correct email

### Test 25: E-commerce Template Variables
**Verify in responses:**
- `{{store_name}}` → Actual store name
- `{{product_categories}}` → Correct categories (comma-separated)
- `{{website_url}}` → Correct URL
- `{{delivery_time}}` → Correct time
- `{{delivery_fee}}` → Correct fee
- `{{payment_methods}}` → Correct methods (comma-separated)
- `{{return_policy}}` → Correct policy

---

## Intent Matching Accuracy Tests

### Test 26: Multiple Intent Triggers
**Test each template with various phrasings:**

**Medical:**
- "book" → book_appointment
- "appointment" → book_appointment
- "see doctor" → book_appointment
- "urgent" → emergency
- "how much" → get_fees

**Real Estate:**
- "looking for" → property_search
- "apartment" → property_search
- "viewing" → book_viewing
- "budget" → budget_question
- "area" → area_question

**E-commerce:**
- "track" → track_order
- "where is my order" → track_order
- "return" → return_inquiry
- "shipping" → shipping_question
- "payment" → payment_question

---

## Handoff Condition Tests

### Test 27: Medical Handoff Scenarios
- Emergency symptoms → Handoff
- Angry patient → Handoff
- Cancel appointment request → Handoff
- Complex medical question → Handoff
- Insurance verification → Handoff

### Test 28: Real Estate Handoff Scenarios
- Request for property keys → Handoff
- Offer negotiation → Handoff
- Contract questions → Handoff
- Financing questions → Handoff
- Frustrated client → Handoff

### Test 29: E-commerce Handoff Scenarios
- Damaged item report → Handoff
- Payment dispute → Handoff
- Very angry customer → Handoff
- Bulk order inquiry → Handoff
- Store credit request → Handoff

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Backend server running (`npm run dev`)
- [ ] Database seeded with all 3 templates
- [ ] Test bots created from each template
- [ ] WhatsApp test number connected
- [ ] Logging enabled for intent matching

### Testing Process
- [ ] Test all 29 scenarios documented above
- [ ] Verify intent matching in logs
- [ ] Check variable replacement in responses
- [ ] Confirm handoff conditions trigger
- [ ] Test tone and professionalism
- [ ] Verify response accuracy

### Post-Testing
- [ ] Document any failed tests
- [ ] Fix issues in template JSONs
- [ ] Re-seed updated templates
- [ ] Re-test failed scenarios
- [ ] Update documentation with findings

---

## Success Criteria

**All templates pass if:**
- ✅ Intent matching accuracy: 95%+ (27/29 tests pass)
- ✅ Variable replacement: 100% (all variables replaced correctly)
- ✅ Handoff detection: 100% (all handoff conditions work)
- ✅ Tone appropriate: Professional and industry-appropriate
- ✅ Context maintained: Bot remembers conversation flow
- ✅ Rules followed: AI adheres to template rules

---

## Known Limitations

**Medical Template:**
- Cannot diagnose or provide medical advice (by design)
- Cannot access medical records system (future integration)
- Cannot check real-time appointment availability

**Real Estate Template:**
- Cannot access property database (future integration)
- Cannot provide real-time property availability
- Cannot show property photos via WhatsApp

**E-commerce Template:**
- Cannot access order management system (future integration)
- Cannot check real-time stock levels
- Cannot process refunds directly

These limitations are expected and will be addressed with system integrations in Week 8.

---

## Test Results Log

**Date:** [To be filled during testing]
**Tester:** [Name]
**Backend Version:** [Git commit hash]

### Medical Template Results
- Test 1 (Appointment): [ ] Pass [ ] Fail
- Test 2 (Emergency): [ ] Pass [ ] Fail
- Test 3 (Medical Aid): [ ] Pass [ ] Fail
- Test 4 (Hours): [ ] Pass [ ] Fail
- Test 5 (Fees): [ ] Pass [ ] Fail

### Real Estate Template Results
- Test 6 (Property Search): [ ] Pass [ ] Fail
- Test 7 (Viewing): [ ] Pass [ ] Fail
- Test 8 (Budget): [ ] Pass [ ] Fail
- Test 9 (Area): [ ] Pass [ ] Fail
- Test 10 (Details): [ ] Pass [ ] Fail

### E-commerce Template Results
- Test 11 (Order Tracking): [ ] Pass [ ] Fail
- Test 12 (Product Inquiry): [ ] Pass [ ] Fail
- Test 13 (Return): [ ] Pass [ ] Fail
- Test 14 (Shipping): [ ] Pass [ ] Fail
- Test 15 (Payment): [ ] Pass [ ] Fail
- Test 16 (Availability): [ ] Pass [ ] Fail
- Test 17 (Complaint): [ ] Pass [ ] Fail
- Test 18 (Promotion): [ ] Pass [ ] Fail

### Cross-Template Results
- Test 19-22: [ ] Pass [ ] Fail
- Test 23-25 (Variables): [ ] Pass [ ] Fail
- Test 26 (Intent Matching): [ ] Pass [ ] Fail
- Test 27-29 (Handoffs): [ ] Pass [ ] Fail

**Overall Result:** [ ] All Pass [ ] Some Fail
**Notes:** [Add any observations or issues]
