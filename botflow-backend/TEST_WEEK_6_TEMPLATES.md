# Week 6 Template Testing Guide
## Restaurant, Salon & Gym Templates

**Created:** January 11, 2026
**Templates Tested:** Restaurant (restaurant), Salon (salon), Gym (gym)
**Total Test Scenarios:** 21

---

## Test Overview

This guide provides comprehensive testing scenarios for the 3 new Tier-1 templates created in Week 6. All scenarios should be tested to ensure intent matching, variable replacement, and handoff conditions work correctly.

### Success Criteria
- **Intent Matching:** 95%+ accuracy (20/21 tests pass)
- **Variable Replacement:** 100% (all `{{variables}}` replaced correctly)
- **Handoff Detection:** 100% (all conditions trigger appropriately)
- **Tone Appropriateness:** Each template maintains its industry-specific tone
- **Context Maintenance:** Bot remembers conversation context
- **Rules Adherence:** AI follows all defined rules

---

## Restaurant Template Tests (7 scenarios)

### Test 1: Basic Table Reservation
**User Message:** "I'd like to book a table for 4 on Saturday night"

**Expected:**
- Intent: `book_table`
- Bot collects: party size (4), date (Saturday), time (night - should ask specific time)
- Bot asks for: name, contact number
- Bot asks: Any special occasion?
- Confirms all details before finalizing

**Variable Checks:**
- Restaurant name appears in response
- Operating hours mentioned if relevant

### Test 2: Dietary Requirements Inquiry
**User Message:** "Do you have vegetarian options?"

**Expected:**
- Intent: `dietary_requirements`
- Bot confirms available dietary options from `{{dietary_options}}`
- Bot asks about specific allergies
- Bot reassures accommodation is possible
- Bot encourages making a reservation

### Test 3: Menu Inquiry
**User Message:** "What's on the menu?"

**Expected:**
- Intent: `menu_inquiry`
- Bot describes cuisine type from `{{cuisine_type}}`
- Bot highlights signature dishes
- Bot offers to send full menu
- Bot encourages reservation

### Test 4: Special Occasion Booking
**User Message:** "I want to book for my anniversary"

**Expected:**
- Intent: `special_occasion` or `book_table`
- Bot shows excitement and congratulations
- Bot asks for party size, date, time
- Bot mentions can arrange special setup
- Bot makes the occasion feel special

### Test 5: Pricing Question
**User Message:** "How much does it cost to eat there?"

**Expected:**
- Intent: `pricing_question`
- Bot provides `{{average_price_range}}`
- Bot mentions it's great value for quality
- Bot highlights what makes restaurant special

### Test 6: Location & Hours
**User Message:** "Where are you located and when are you open?"

**Expected:**
- Intent: `location_hours`
- Bot provides `{{location}}`
- Bot provides `{{operating_hours}}`
- Bot mentions parking if available
- Bot encourages visit

### Test 7: Cancellation Request (Handoff)
**User Message:** "I need to cancel my reservation for tonight"

**Expected:**
- Intent: `cancel_modify`
- Bot asks for reservation details
- Bot mentions cancellation policy if applicable
- Bot triggers handoff to staff
- **Handoff Condition:** "Guest wants to cancel or modify existing reservation"

---

## Salon Template Tests (7 scenarios)

### Test 8: Basic Appointment Booking
**User Message:** "I need a haircut on Friday"

**Expected:**
- Intent: `book_appointment`
- Bot collects: service (haircut), date (Friday)
- Bot asks for: specific time preference, name, contact
- Bot asks about hair type/texture
- Warm and pampering tone

**Variable Checks:**
- Salon name appears in welcome
- Services offered mentioned when relevant

### Test 9: Hair Type Question
**User Message:** "Do you work with natural African hair?"

**Expected:**
- Intent: `hair_type_question`
- Bot confirms specializations from `{{specializations}}`
- Bot reassures expertise
- Bot encourages booking
- Shows cultural sensitivity

### Test 10: Pricing Inquiry
**User Message:** "How much is hair coloring?"

**Expected:**
- Intent: `pricing_question`
- Bot provides `{{price_range}}`
- Bot explains it varies by service and stylist
- Bot offers to book consultation
- Enthusiastic tone

### Test 11: Service Inquiry
**User Message:** "What services do you offer?"

**Expected:**
- Intent: `service_inquiry`
- Bot lists `{{services_offered}}`
- Bot mentions `{{price_range}}`
- Bot highlights `{{specializations}}`
- Bot encourages booking

### Test 12: Stylist Preference
**User Message:** "Who's the best stylist for curly hair?"

**Expected:**
- Intent: `stylist_preference`
- Bot mentions experienced stylists
- Bot asks about specific needs
- Bot offers booking with specialist
- Personal and helpful tone

### Test 13: Bridal/Special Event
**User Message:** "I need hair and makeup for my wedding"

**Expected:**
- Intent: `special_event`
- Bot shows excitement and congratulations
- Bot mentions special event styling
- Bot asks for details (date, style preferences)
- Bot suggests in-person consultation
- May trigger handoff for complex bridal package

### Test 14: Cancellation (Handoff)
**User Message:** "I need to reschedule my appointment"

**Expected:**
- Intent: `cancel_reschedule`
- Bot asks for appointment details
- Bot mentions cancellation policy
- Bot triggers handoff to staff
- **Handoff Condition:** "Client wants to cancel or modify existing appointment"

---

## Gym Template Tests (7 scenarios)

### Test 15: Membership Inquiry
**User Message:** "I want to join the gym, what are your prices?"

**Expected:**
- Intent: `membership_inquiry`
- Bot asks about fitness goals first
- Bot explains `{{membership_types}}`
- Bot provides `{{monthly_membership_fee}}`
- Bot highlights `{{facilities}}` and `{{fitness_offerings}}`
- Motivating and energetic tone

**Variable Checks:**
- Gym name appears
- Monthly fee displayed correctly

### Test 16: Class Booking
**User Message:** "Can I book a yoga class?"

**Expected:**
- Intent: `book_class`
- Bot collects: name, contact, preferred day/time
- Bot asks about fitness level (beginner, intermediate, advanced)
- Bot confirms yoga is offered in `{{fitness_offerings}}`
- Encouraging tone

### Test 17: Personal Training Inquiry
**User Message:** "Do you have personal trainers?"

**Expected:**
- Intent: `personal_training`
- Bot asks about fitness goals
- Bot explains personal training options
- Bot mentions can arrange consultation
- Bot collects contact info
- Supportive tone

### Test 18: Fitness Goals Discussion
**User Message:** "I want to lose weight, what do you recommend?"

**Expected:**
- Intent: `fitness_goals`
- Bot is supportive and positive
- Bot asks for more details (current fitness level, timeline)
- Bot recommends relevant programs from `{{specializations}}`
- Bot encourages joining
- Motivational tone

### Test 19: Facility Inquiry
**User Message:** "What facilities do you have?"

**Expected:**
- Intent: `facility_inquiry`
- Bot describes `{{facilities}}` enthusiastically
- Bot mentions what makes gym special
- Bot encourages visit or membership
- Excited tone

### Test 20: Trial Visit Request
**User Message:** "Can I come try it out first?"

**Expected:**
- Intent: `trial_visit`
- Bot offers day pass or trial
- Bot collects name and contact
- Bot schedules visit
- Bot builds excitement about seeing the gym

### Test 21: Membership Cancellation (Handoff)
**User Message:** "I need to cancel my membership"

**Expected:**
- Intent: `cancel_reschedule`
- Bot asks for membership details
- Bot triggers handoff to staff for account modifications
- **Handoff Condition:** "Member wants to cancel or freeze membership"
- Maintains supportive tone even during cancellation

---

## Cross-Template Universal Tests

### Test 22: Greeting (All Templates)
**User Message:** "Hello" / "Hi" / "Hey"

**Expected (All):**
- Welcoming greeting response
- Brief introduction of services
- Call to action (ask what they need)
- Industry-appropriate tone:
  - Restaurant: Warm and hospitable
  - Salon: Personal and pampering
  - Gym: Energetic and motivating

### Test 23: Frustrated Customer (All Templates)
**User Message:** "This is ridiculous, I'm very upset about [issue]"

**Expected (All):**
- Empathetic response
- Apology and acknowledgment of frustration
- Trigger handoff to human staff
- **Handoff Condition:** Customer is frustrated or upset
- Professional handling

### Test 24: Operating Hours (All Templates)
**User Message:** "What time do you open?"

**Expected (All):**
- Intent: `location_hours` or `hours_location`
- Bot provides `{{operating_hours}}`
- Additional relevant info (location if asked)
- Encouraging response

---

## Variable Replacement Tests

### Test 25: Restaurant Variables
Create a test bot with:
- restaurant_name: "Test Bistro"
- cuisine_type: ["Italian", "Mediterranean"]
- seating_capacity: 50
- location: "123 Main St, Cape Town"

**Check:**
- Welcome message shows "Test Bistro"
- System prompt includes "Italian, Mediterranean"
- Capacity mentioned as "50 guests"
- Location provided correctly

### Test 26: Salon Variables
Create a test bot with:
- salon_name: "Glamour Studio"
- services_offered: ["Haircut & Styling", "Hair Coloring", "Braids & Weaves"]
- price_range: "Mid-Range (R300-R600)"

**Check:**
- Welcome message shows "Glamour Studio"
- Services list as comma-separated
- Price range displayed correctly

### Test 27: Gym Variables
Create a test bot with:
- gym_name: "PowerFit"
- monthly_membership_fee: 450
- facilities: ["Locker Rooms & Showers", "Sauna & Steam Room"]

**Check:**
- Welcome message shows "PowerFit"
- Fee shows "R450"
- Facilities list correctly

---

## Intent Matching Accuracy Test

### Test 28: Synonym Variations (Per Template)

**Restaurant:**
- "reserve a table" → book_table
- "what's your menu" → menu_inquiry
- "I'm allergic to nuts" → dietary_requirements

**Salon:**
- "I need a haircut" → book_appointment
- "how much for highlights" → pricing_question
- "my wedding is coming up" → special_event

**Gym:**
- "how do I become a member" → membership_inquiry
- "I want to get in shape" → fitness_goals
- "can I see the gym first" → trial_visit

**Expected:** All variations correctly match their intents

---

## Handoff Condition Tests

### Test 29: Restaurant Handoffs
1. Large group (10+): "I want to book for 12 people"
2. Complaint: "The food was terrible last time"
3. Private dining: "Do you have a private room for 20 people?"

**Expected:** All trigger appropriate handoff conditions

### Test 30: Salon Handoffs
1. Bridal consultation: "I need full bridal hair and makeup"
2. Complaint: "My stylist messed up my hair last week"
3. Complex treatment: "I need keratin treatment and balayage"

**Expected:** All trigger appropriate handoff conditions

### Test 31: Gym Handoffs
1. Medical concern: "I have a bad knee, can I still join?"
2. Billing issue: "I was charged twice this month"
3. Cancellation: "I want to freeze my membership"

**Expected:** All trigger appropriate handoff conditions

---

## Edge Cases & Stress Tests

### Test 32: Multi-Intent Messages
**User Message:** "Hi, I want to book a table for 4 on Saturday and I'm vegetarian"

**Expected:**
- Bot handles both booking and dietary inquiry
- Prioritizes booking flow
- Remembers dietary requirement
- Smooth conversation flow

### Test 33: Vague Requests
**User Message:** "I need help"

**Expected:**
- Bot asks clarifying question
- Offers menu of services
- Maintains friendly tone
- Guides conversation

### Test 34: Out-of-Scope Questions
**User Message:** "What's the weather like today?"

**Expected:**
- Bot politely redirects to services offered
- Doesn't attempt to answer unrelated questions
- Maintains professional tone

---

## South African Context Tests

### Test 35: Restaurant - Halal Inquiry
**User Message:** "Is your food halal?"

**Expected:**
- Bot confirms if halal in `{{dietary_options}}`
- Professional and respectful response
- No assumptions about customer

### Test 36: Salon - African Hair Expertise
**User Message:** "Can you handle 4C hair?"

**Expected:**
- Bot confirms expertise in African hair textures
- Reassuring and confident response
- Mentions specializations

### Test 37: Gym - Load Shedding Concern
**User Message:** "Are you affected by load shedding?"

**Expected:**
- Bot acknowledges concern
- Mentions backup power if applicable
- Provides operating hours
- May handoff for detailed info

---

## Testing Workflow

### Pre-Testing Setup
1. ✅ Backend running on localhost:3001
2. ✅ Templates seeded to database
3. ✅ Test bots created for each vertical
4. ✅ WhatsApp webhook configured

### Individual Scenario Testing
1. Send test message via WhatsApp or API
2. Record bot response
3. Check intent matching (bot logs)
4. Verify variable replacement
5. Confirm tone appropriateness
6. Document any issues

### Log Analysis
```bash
# Check bot logs for intent matching
tail -f botflow-backend/logs/app.log | grep intent

# Check for variable replacement
tail -f botflow-backend/logs/app.log | grep "{{.*}}"
```

### Results Documentation
Create test results log:
```markdown
## Test Results - [Date]

### Restaurant Template
- Test 1: ✅ Pass
- Test 2: ✅ Pass
- Test 3: ❌ Fail - [describe issue]
...

### Issues Found
1. [Issue description] - [Severity: High/Medium/Low]
2. ...

### Success Rate
- Restaurant: 6/7 (86%)
- Salon: 7/7 (100%)
- Gym: 7/7 (100%)
- Overall: 20/21 (95%)
```

---

## Common Issues & Solutions

### Issue: Intent Not Matching
**Cause:** Trigger words not comprehensive enough
**Solution:** Add more synonyms to intent triggers

### Issue: Variables Not Replaced
**Cause:** Typo in variable name or missing field
**Solution:** Check field_values match required_fields exactly

### Issue: Tone Inconsistency
**Cause:** System prompt not specific enough
**Solution:** Enhance system prompt guidelines

### Issue: Handoff Not Triggering
**Cause:** Condition not clear in system prompt
**Solution:** Make handoffConditions more explicit

---

## Template Quality Scorecard

### Restaurant Template
- [ ] All 7 tests pass
- [ ] Variables replaced correctly
- [ ] Tone is warm and hospitable
- [ ] Booking flow smooth
- [ ] Dietary options handled well
- [ ] Handoffs trigger correctly

### Salon Template
- [ ] All 7 tests pass
- [ ] Variables replaced correctly
- [ ] Tone is personal and pampering
- [ ] Hair type sensitivity appropriate
- [ ] Bridal inquiries handled well
- [ ] Handoffs trigger correctly

### Gym Template
- [ ] All 7 tests pass
- [ ] Variables replaced correctly
- [ ] Tone is energetic and motivating
- [ ] Fitness goals prioritized
- [ ] Trial/tour flow smooth
- [ ] Handoffs trigger correctly

---

## Next Steps After Testing

### If Tests Pass (95%+)
1. Mark templates as production-ready
2. Create user documentation
3. Prepare for beta testing
4. Move to Week 7 (Tier-2 templates)

### If Tests Fail (<95%)
1. Document all failures
2. Identify root causes
3. Update templates
4. Re-seed to database
5. Re-test failed scenarios
6. Iterate until 95%+ pass rate

---

## Week 6 Testing Complete!

Once all tests pass, you'll have:
- ✅ 7 of 7 Tier-1 templates (100% complete)
- ✅ All templates production-ready
- ✅ Comprehensive testing documentation
- ✅ Ready for Tier-2 rapid development

**Total Templates Tested:** 7 (Taxi, Medical, Real Estate, E-commerce, Restaurant, Salon, Gym)
**Total Test Scenarios:** 37 (across all templates)
**Success Criteria:** 95%+ intent matching, 100% variable replacement

---

**Testing Status:** Ready for execution
**Templates:** Restaurant (restaurant), Salon (salon), Gym (gym)
**Next:** Execute tests and document results
