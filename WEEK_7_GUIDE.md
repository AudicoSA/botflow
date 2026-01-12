# Week 7 Implementation Guide
## Tier-2 Templates: Retail, Hotel, Car Rental, Plumber & Doctor - RAPID DEVELOPMENT!

**Week:** 7 of 13
**Phase:** 2 - Core Templates (Final Week)
**Duration:** 5-7 days
**Focus:** Tier-2 templates using proven Tier-1 patterns

---

## Week Overview

Week 7 is **Tier-2 rapid development week**! With all Tier-1 templates complete and patterns proven, we'll leverage copy-paste-modify to build 5 Tier-2 templates in 5 days. The foundation is rock solid - now it's time to scale!

### What You'll Build

1. **Retail Store Template** - Product inquiries, store hours, inventory questions
2. **Hotel & Guesthouse Template** - Room bookings, check-in/out, amenities
3. **Car Rental Template** - Vehicle reservations, rental terms, pricing
4. **Plumber & Home Services Template** - Emergency calls, scheduling, quotes
5. **Doctor & Clinic Template** - Specialized medical practice variant

### Success Criteria

By end of week, you should be able to:
- ✅ Create bots for retail stores handling customer inquiries
- ✅ Create bots for hotels managing room bookings
- ✅ Create bots for car rentals processing reservations
- ✅ Create bots for plumbers scheduling service calls
- ✅ Create bots for doctors managing appointments
- ✅ All 5 templates published and tested
- ✅ **12 of 20 total templates complete (60%)**
- ✅ Tier-2 templates establish new pattern categories

---

## Quick Links

**Schedule:** [WEEK_SCHEDULE.md](./WEEK_SCHEDULE.md)
**Build Plan:** [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md)
**Previous Week:** [WEEK_6_SUMMARY.md](./WEEK_6_SUMMARY.md) ✅ Tier-1 Complete!
**Patterns Library:** [TEMPLATE_PATTERNS.md](./botflow-backend/TEMPLATE_PATTERNS.md)
**Quality Checklist:** [TEMPLATE_CHECKLIST.md](./botflow-backend/TEMPLATE_CHECKLIST.md)

---

## Prerequisites

Before starting Week 7, ensure:

### Required from Week 6
- ✅ All 7 Tier-1 templates complete and published
- ✅ Template patterns library established
- ✅ Testing framework operational
- ✅ Dynamic seeding working perfectly
- ✅ Validation scripts ready

### Verify Current System

```bash
# 1. Check backend is running
curl http://localhost:3001/health

# 2. Verify all 7 Tier-1 templates
curl http://localhost:3001/api/templates | grep -o '"name"' | wc -l
# Should return 7 (or 8 with test template)

# 3. Test seeding
cd botflow-backend
node dist/scripts/run-seed.js

# 4. Verify validation
node dist/scripts/run-validate.js
```

---

## Architecture Overview

### Tier-2 Template Categories

Tier-2 templates fall into new pattern categories:

**Product/Inventory Focus:**
- Retail Store - Stock inquiries, product info

**Accommodation Booking:**
- Hotel & Guesthouse - Room availability, check-in/out

**Vehicle/Equipment Rental:**
- Car Rental - Vehicle types, rental periods, insurance

**Emergency Services:**
- Plumber & Home Services - Urgent vs scheduled, quotes

**Specialized Medical:**
- Doctor & Clinic - Similar to Medical template but more focused

### Pattern Reuse Strategy

Each Tier-2 template will reuse patterns from Tier-1:

- **Retail Store** ← E-commerce (product inquiries, customer service)
- **Hotel & Guesthouse** ← Restaurant (booking flow, special requests)
- **Car Rental** ← Taxi (vehicle booking, pickup/dropoff)
- **Plumber & Home Services** ← Medical (emergency detection, scheduling)
- **Doctor & Clinic** ← Medical (appointment booking, professional tone)

---

## Day-by-Day Breakdown

### Day 1: Retail Store Template

**Goal:** Complete retail store template for brick-and-mortar shops

**Pattern Source:** E-commerce + Restaurant (customer service + hours/location)

#### Step 1.1: Define Required Fields

Create: `botflow-backend/src/data/retail-template.json`

**Key Fields:**
- store_name (text)
- store_type (select: Clothing, Electronics, Furniture, General, etc.)
- operating_hours (text)
- location (text)
- contact_number (text)
- products_sold (multiselect)
- price_range (select)
- payment_methods (multiselect: Cash, Card, EFT, etc.)
- services_offered (multiselect: Layaway, Gift Wrapping, Repairs, etc.)
- return_policy (text, optional)

**Total Fields:** 10

#### Step 1.2: Build Conversation Flow

**System Prompt Focus:**
- Helpful store assistant
- Product location assistance
- Store policy information
- Professional and friendly tone

**Key Intents:**
- product_inquiry - "Do you have [product]?"
- store_hours - "What time do you close?"
- location_directions - "Where are you located?"
- pricing_question - "How much is [product]?"
- payment_methods - "Do you take card?"
- return_policy - "What's your return policy?"
- special_services - "Do you offer layaway?"

**Handoff Conditions:**
- Product not in stock questions
- Pricing disputes
- Return/exchange requests
- Complex orders
- Customer complaints

**South African Context:**
- Load shedding impact on store hours
- Cash vs card preferences (many SA customers prefer cash)
- Layaway popularity
- Public holiday trading hours

---

### Day 2: Hotel & Guesthouse Template

**Goal:** Complete hotel template for accommodation bookings

**Pattern Source:** Restaurant (booking flow) + Salon (special requests)

#### Step 2.1: Define Required Fields

Create: `botflow-backend/src/data/hotel-template.json`

**Key Fields:**
- property_name (text)
- property_type (select: Hotel, Guesthouse, B&B, Lodge, etc.)
- location (text)
- contact_number (text)
- email_address (text)
- room_types (multiselect: Single, Double, Suite, Family, etc.)
- price_per_night (text: "from R500")
- amenities (multiselect: WiFi, Pool, Parking, Breakfast, etc.)
- check_in_time (text: "2pm")
- check_out_time (text: "10am")
- cancellation_policy (text)

**Total Fields:** 11

#### Step 2.2: Build Conversation Flow

**System Prompt Focus:**
- Welcoming hotel receptionist
- Room availability inquiries
- Booking assistance
- Amenity information
- Warm and hospitable tone

**Key Intents:**
- book_room - "I need a room for this weekend"
- availability_check - "Do you have rooms available?"
- room_types - "What types of rooms do you have?"
- pricing_inquiry - "How much per night?"
- amenities_question - "Do you have WiFi/pool/parking?"
- check_in_out - "What time is check-in?"
- special_requests - "Can I get an early check-in?"
- cancel_modify - "I need to change my booking"

**Handoff Conditions:**
- Booking modifications
- Group bookings (5+ rooms)
- Event hosting inquiries
- Complaints about stay
- Special accommodation needs
- Payment issues

**South African Context:**
- Safety and security mentions (important for tourists)
- Load shedding backup power
- Nearby attractions (beaches, game reserves, etc.)
- Breakfast included (very common in SA)

---

### Day 3: Car Rental Template

**Goal:** Complete car rental template for vehicle reservations

**Pattern Source:** Taxi (vehicle booking) + E-commerce (terms & conditions)

#### Step 3.1: Define Required Fields

Create: `botflow-backend/src/data/car-rental-template.json`

**Key Fields:**
- company_name (text)
- location (text: "main branch")
- contact_number (text)
- email_address (text)
- vehicle_types (multiselect: Economy, Sedan, SUV, Bakkie, Luxury, etc.)
- daily_rates (text: "from R250/day")
- age_requirement (number: "21")
- license_requirement (text: "valid SA license or international")
- insurance_options (multiselect: Basic, Comprehensive, Excess Waiver, etc.)
- additional_services (multiselect: GPS, Child Seat, Additional Driver, etc.)
- terms_conditions (text: key rental terms)

**Total Fields:** 11

#### Step 3.2: Build Conversation Flow

**System Prompt Focus:**
- Professional rental agent
- Vehicle availability
- Rental terms clarity
- Insurance explanation
- Helpful and informative tone

**Key Intents:**
- book_vehicle - "I need to rent a car"
- availability_check - "Do you have SUVs available?"
- pricing_inquiry - "How much for 3 days?"
- vehicle_types - "What cars do you have?"
- insurance_question - "What insurance do I need?"
- requirements - "What documents do I need?"
- additional_services - "Can I add a GPS?"
- pickup_dropoff - "Can I collect at the airport?"
- cancel_modify - "I need to change my booking"

**Handoff Conditions:**
- Booking modifications
- Insurance claims or damage reports
- Long-term rental inquiries (30+ days)
- Corporate fleet inquiries
- Cross-border rentals
- Payment disputes

**South African Context:**
- "Bakkie" (pickup truck) very popular
- Left-hand drive clarification for tourists
- Popular routes (Garden Route, Kruger, Cape Town)
- Long-distance rental considerations
- Load shedding impact on office hours

---

### Day 4: Plumber & Home Services Template

**Goal:** Complete plumber template for emergency and scheduled services

**Pattern Source:** Medical (emergency detection) + Gym (consultation booking)

#### Step 4.1: Define Required Fields

Create: `botflow-backend/src/data/plumber-template.json`

**Key Fields:**
- business_name (text)
- service_type (select: Plumber, Electrician, Handyman, HVAC, etc.)
- coverage_areas (text: "Northern Suburbs, CBD")
- contact_number (text)
- emergency_number (text: may be different)
- operating_hours (text)
- services_offered (multiselect: Emergency, Installations, Repairs, Maintenance, etc.)
- emergency_callout_fee (number)
- standard_hourly_rate (number)
- response_time (text: "within 2 hours for emergencies")

**Total Fields:** 10

#### Step 4.2: Build Conversation Flow

**System Prompt Focus:**
- Responsive and professional
- Emergency triage (urgent vs scheduled)
- Service description
- Pricing transparency
- Reassuring and capable tone

**Key Intents:**
- emergency_service - "I have a burst pipe!" (HIGH PRIORITY)
- schedule_service - "Can you come next week?"
- service_inquiry - "Do you do geyser installations?"
- pricing_question - "How much do you charge?"
- coverage_area - "Do you service [area]?"
- availability - "When can you come?"
- quote_request - "Can you give me a quote?"

**Handoff Conditions:**
- TRUE EMERGENCIES (burst pipes, electrical fires, gas leaks)
- Complex jobs requiring assessment
- Pricing disputes
- Service complaints
- Jobs outside coverage area
- Customer is distressed

**South African Context:**
- Load shedding electrical issues (surge damage, geyser timers)
- Geyser replacements very common
- Borehole maintenance
- COC (Certificate of Compliance) mentions
- Municipal connection issues

---

### Day 5: Doctor & Clinic Template (Specialized)

**Goal:** Complete specialized doctor/GP template variant

**Pattern Source:** Medical template (already built in Week 5) with GP focus

#### Step 5.1: Define Required Fields

Create: `botflow-backend/src/data/doctor-template.json`

**Key Fields:**
- practice_name (text)
- doctor_name (text: "Dr. Smith")
- specialization (select: General Practitioner, Pediatrician, Gynecologist, etc.)
- location (text)
- contact_number (text)
- emergency_contact (text, optional)
- operating_hours (text)
- consultation_fee (number)
- medical_aid_accepted (select: All Schemes, Selected Schemes, Cash Only)
- medical_aid_schemes (text: if selected schemes)
- services_offered (multiselect: Consultations, Vaccinations, Scripts, Minor Surgery, etc.)

**Total Fields:** 11

#### Step 5.2: Build Conversation Flow

**System Prompt Focus:**
- Professional medical receptionist
- Appointment scheduling
- Emergency triage (similar to Medical template)
- POPIA compliance
- Empathetic and professional tone

**Key Intents:**
- book_appointment - "I need to see the doctor"
- emergency - "This is urgent!" (HIGH PRIORITY)
- hours_inquiry - "When are you open?"
- fees_inquiry - "How much is a consultation?"
- medical_aid - "Do you take Discovery?"
- services_question - "Can the doctor do vaccinations?"
- prescription_renewal - "I need a repeat script"
- cancel_reschedule - "I need to change my appointment"

**Handoff Conditions:**
- Medical emergencies (refer to 10177 or 112)
- Complex medical questions
- Prescription requests
- Medical aid queries
- Appointment cancellations
- Patient complaints

**South African Context:**
- Medical aid schemes (Discovery, Bonitas, Fedhealth, etc.)
- POPIA compliance critical
- After-hours GP services
- Emergency numbers (10177, 112)
- Chronic medication scripts

---

### Day 6: Validation, Seeding & Testing

**Goal:** Deploy all 5 Tier-2 templates and verify functionality

#### Step 6.1: Validate All Templates

```bash
cd botflow-backend

# 1. Build TypeScript
npm run build

# 2. Copy templates to dist
cp src/data/retail-template.json dist/data/
cp src/data/hotel-template.json dist/data/
cp src/data/car-rental-template.json dist/data/
cp src/data/plumber-template.json dist/data/
cp src/data/doctor-template.json dist/data/

# 3. Validate all templates
node dist/scripts/run-validate.js

# Expected: All 12 templates validate successfully
```

#### Step 6.2: Seed to Database

```bash
# Seed all templates (should now find 12 templates)
node dist/scripts/run-seed.js

# Verify in Supabase
# Check bot_templates table: should have 12 published templates
```

#### Step 6.3: Test Each Template

**Quick Test Scenarios:**

**Retail Store:**
1. "Do you have [popular product]?"
2. "What time do you close?"
3. "What's your return policy?"

**Hotel & Guesthouse:**
1. "I need a room for this weekend"
2. "Do you have WiFi?"
3. "What time is check-in?"

**Car Rental:**
1. "I need to rent a car for 3 days"
2. "What insurance do you offer?"
3. "How much is a bakkie?"

**Plumber:**
1. "I have a burst pipe!" (EMERGENCY)
2. "Can you install a geyser?"
3. "Do you service [area]?"

**Doctor:**
1. "I need to see the doctor"
2. "Do you take medical aid?"
3. "How much is a consultation?"

---

### Day 7: Documentation & Week 7 Celebration

**Goal:** Document completion and prepare for Week 8

#### Step 7.1: Create Week 7 Summary

Create: `WEEK_7_SUMMARY.md`

Include:
- 5 templates completed (Retail, Hotel, Car Rental, Plumber, Doctor)
- **12 of 20 templates complete (60%)**
- Tier-2 patterns established
- Testing results
- Ready for Tier-3 final push

#### Step 7.2: Update Documentation

Update:
- `CLAUDE.md` - Add Week 7 templates
- `WEEK_SCHEDULE.md` - Mark Week 7 complete
- `TEMPLATE_PATTERNS.md` - Add Tier-2 patterns
- `BUILD_PLAN_2025.md` - Update progress

---

## Template Quick Reference

### Template Comparison Matrix

| Template | Fields | Intents | Booking? | Emergency? | Pattern Source |
|----------|--------|---------|----------|------------|----------------|
| Retail Store | 10 | 7 | No | No | E-commerce |
| Hotel & Guesthouse | 11 | 8 | Yes | No | Restaurant |
| Car Rental | 11 | 9 | Yes | No | Taxi |
| Plumber & Home Services | 10 | 7 | Yes | Yes | Medical |
| Doctor & Clinic | 11 | 8 | Yes | Yes | Medical |

### Field Count Target: 10-11 fields per template

### Intent Count Target: 7-9 intents per template

---

## Tier-2 Unique Characteristics

### Retail Store
- **Focus:** Product availability and customer service
- **Unique:** Store hours more important than booking
- **Tone:** Helpful and knowledgeable
- **Challenge:** Can't check real inventory

### Hotel & Guesthouse
- **Focus:** Room booking and amenities
- **Unique:** Check-in/out times, cancellation policy
- **Tone:** Welcoming and hospitable
- **Challenge:** Real-time availability

### Car Rental
- **Focus:** Vehicle availability and rental terms
- **Unique:** Insurance, age requirements, documentation
- **Tone:** Professional and informative
- **Challenge:** Complex terms and conditions

### Plumber & Home Services
- **Focus:** Emergency vs scheduled service
- **Unique:** Emergency triage is critical
- **Tone:** Reassuring and responsive
- **Challenge:** Urgent situations require fast handoff

### Doctor & Clinic
- **Focus:** Appointment booking and medical aid
- **Unique:** Similar to Medical but more GP-focused
- **Tone:** Professional and empathetic
- **Challenge:** POPIA compliance, emergency triage

---

## South African Localization Checklist

For each template, ensure:

### Currency & Pricing
- ✅ Use Rand (R) for all pricing
- ✅ Typical SA price ranges
- ✅ Payment methods common in SA (Cash, Card, EFT, SnapScan)

### Contact Information
- ✅ SA phone formats (021, 011, 031, etc.)
- ✅ Area codes match regions

### Cultural Context
- ✅ Load shedding mentions where relevant
- ✅ Public holidays (Heritage Day, Freedom Day, etc.)
- ✅ Local terminology (bakkie, geyser, braai, etc.)

### Business Practices
- ✅ Medical aid (not insurance) for healthcare
- ✅ Layaway for retail
- ✅ COC for electrical/plumbing work
- ✅ Safety and security considerations

### Regulatory
- ✅ POPIA compliance for medical/personal data
- ✅ COC (Certificate of Compliance) for trades
- ✅ Medical aid scheme names

---

## Rapid Development Strategy

### Copy-Paste-Modify Approach

**Step 1: Choose Source Template**
- Identify which Tier-1 template is most similar
- Copy entire JSON structure

**Step 2: Update Metadata**
- Change name, vertical, description, tagline, icon
- Update tier (set to 2)

**Step 3: Modify Required Fields**
- Keep similar fields (name, location, hours, contact)
- Add industry-specific fields
- Adjust multiselect options

**Step 4: Adapt Conversation Flow**
- Update system prompt with new business context
- Modify welcome message
- Adjust intents for new vertical
- Update handoff conditions

**Step 5: Customize South African Context**
- Add relevant local terminology
- Include industry-specific SA considerations
- Adjust pricing ranges

**Time per template: 60-90 minutes (vs 2-3 hours from scratch)**

---

## Testing Strategy

### Automated Testing

Create: `botflow-backend/src/scripts/test-tier2-templates.ts`

Similar to Week 6 testing but focused on Tier-2 scenarios:
- 5 tests per template (25 total)
- Variable replacement checks
- Intent matching verification
- Handoff condition testing

### Manual Testing

For each template:
1. Create test bot via API
2. Send 3-5 test messages
3. Verify intent matching
4. Check variable replacement
5. Test handoff conditions

### Success Criteria

- **Intent Matching:** 95%+ accuracy
- **Variable Replacement:** 100%
- **Handoff Triggers:** 100%
- **Tone Consistency:** Industry-appropriate
- **SA Context:** Present and accurate

---

## Common Issues & Solutions

### Issue: Template Too Similar to Source

**Problem:** Tier-2 template feels like copy-paste
**Solution:**
- Emphasize unique intents
- Adjust tone significantly
- Add 2-3 industry-specific fields
- Customize welcome message

### Issue: Too Many Fields

**Problem:** Template has 15+ fields, too complex
**Solution:**
- Make non-critical fields optional
- Combine related fields
- Remove "nice-to-have" fields
- Target 10-11 fields maximum

### Issue: Emergency Detection Unclear

**Problem:** Plumber template not catching emergencies
**Solution:**
- Add explicit emergency intent with high priority
- Use clear trigger words: "burst", "leak", "emergency", "urgent", "help"
- Mention emergency in system prompt prominently
- Test thoroughly

### Issue: Booking Flow Too Complex

**Problem:** Hotel booking requires too many steps
**Solution:**
- Simplify data collection
- Focus on essentials: dates, room type, guest count
- Offer to email detailed requirements
- Handoff for complex bookings

---

## Week 7 Success Checklist

Before moving to Week 8, verify:

### Template Functionality ✅
- [ ] Retail Store template creates bots successfully
- [ ] Hotel & Guesthouse template creates bots successfully
- [ ] Car Rental template creates bots successfully
- [ ] Plumber & Home Services template creates bots successfully
- [ ] Doctor & Clinic template creates bots successfully
- [ ] All 12 templates seed without errors
- [ ] Intent matching works for all templates
- [ ] Variables replace correctly

### Documentation ✅
- [ ] WEEK_7_SUMMARY.md created
- [ ] CLAUDE.md updated with Week 7 templates
- [ ] WEEK_SCHEDULE.md shows progress
- [ ] TEST_WEEK_7_TEMPLATES.md created (optional)

### Quality ✅
- [ ] All JSON validates without errors
- [ ] Consistent formatting across all templates
- [ ] South African context included
- [ ] No typos in prompts or triggers
- [ ] Field count 10-11 per template
- [ ] Intent count 7-9 per template

### Testing ✅
- [ ] 3-5 test scenarios per template (15-25 total)
- [ ] Variable replacement verified
- [ ] Intent matching tested
- [ ] Handoff conditions working

---

## Tier-2 Completion Metrics

### Templates (5 of 7 Tier-2 - 71%)

By end of Week 7:
- ✅ Retail Store
- ✅ Hotel & Guesthouse
- ✅ Car Rental
- ✅ Plumber & Home Services
- ✅ Doctor & Clinic (specialized)
- ⏳ [2 more Tier-2 templates for Week 8-9]

### Total Progress (End of Week 7)
- **Total Templates:** 12 of 20 (60%)
- **Total Fields:** ~120 configuration fields
- **Total Intents:** ~80 unique intents
- **Total Rules:** ~95 behavioral rules
- **Total Lines of JSON:** ~6,000 lines

---

## Week 8 Preview: Integrations & Final Templates

With 12 templates complete (60%), Week 8 focuses on:

**Remaining Templates (8 templates - Tier 2 & 3):**
- 2 more Tier-2 templates (if needed)
- 6 Tier-3 templates (Lawyer, Accountant, Travel, Cleaning, Tutor, etc.)

**Integration Development:**
- Calendar integration (for all booking templates)
- Payment integration (Stripe for memberships/deposits)
- CRM integration (lead tracking and customer data)

**Target:** Complete all 20 templates by end of Week 8, start integrations

---

## Resources

**Tier-1 Templates (for reference):**
- [Taxi Template](./botflow-backend/src/data/example-taxi-template.json)
- [Medical Template](./botflow-backend/src/data/medical-template.json)
- [Real Estate Template](./botflow-backend/src/data/real-estate-template.json)
- [E-commerce Template](./botflow-backend/src/data/ecommerce-template.json)
- [Restaurant Template](./botflow-backend/src/data/restaurant-template.json)
- [Salon Template](./botflow-backend/src/data/salon-template.json)
- [Gym Template](./botflow-backend/src/data/gym-template.json)

**Documentation:**
- [Template Patterns](./botflow-backend/TEMPLATE_PATTERNS.md)
- [Quality Checklist](./botflow-backend/TEMPLATE_CHECKLIST.md)
- [Week 6 Summary](./WEEK_6_SUMMARY.md)

**Industry References:**
- Retail: [Takealot](https://www.takealot.com/) - SA's largest online retailer
- Hotels: [Booking.com South Africa](https://www.booking.com/country/za.html)
- Car Rental: [Avis South Africa](https://www.avis.co.za/)
- Home Services: [ServiceMaster South Africa](https://www.servicemaster.co.za/)

---

## Week 7 Ready! 🚀

**Achievement Target: Rapid Template Development**

You're about to leverage 6 weeks of pattern development to build 5 templates in 5 days. The foundation is rock solid - now it's time to scale efficiently!

**Key Strategy:**
- Copy-paste-modify from Tier-1 templates
- Focus on unique industry characteristics
- Maintain quality with checklist
- Test thoroughly but quickly

**Expected Outcome:**
- 60% total progress (12 of 20 templates)
- Tier-2 patterns established
- Clear path to 100% completion
- Integration planning ready

---

**Ready to build 5 templates in 5 days? Let's dominate Tier-2! 💪**
