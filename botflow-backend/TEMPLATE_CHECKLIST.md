# Template Creation Checklist

Use this checklist when creating new templates to ensure quality and consistency.

---

## Required Fields Section

### Structure
- [ ] 5-10 fields total (not too many, not too few)
- [ ] All fields have descriptive labels
- [ ] All fields have realistic placeholder examples
- [ ] Required fields marked with `"required": true`
- [ ] Optional fields marked with `"required": false`
- [ ] Field names use `snake_case` convention

### Text Fields
- [ ] Placeholders show South African formats (phone: "021 123 4567", "082 123 4567")
- [ ] Email fields use `.co.za` domain examples
- [ ] Address fields include SA city names (Cape Town, Johannesburg, Durban)

### Select Fields
- [ ] Options list is defined in `validation.options`
- [ ] Options are clear and distinct
- [ ] Number of options is under 8
- [ ] Options ordered logically (common first, alphabetical, or sequential)
- [ ] No overlapping or ambiguous choices

### Multiselect Fields
- [ ] Options list is defined in `validation.options`
- [ ] 5-15 options provided (not too few, not overwhelming)
- [ ] Related options grouped together
- [ ] Options use consistent formatting

### Number Fields
- [ ] Currency symbol in label (R for Rand)
- [ ] Reasonable min/max set if applicable
- [ ] Example value in placeholder
- [ ] Used only for actual numbers (not phone numbers)

### Help Text
- [ ] HelpText added for ambiguous fields
- [ ] HelpText is concise (under 50 characters)
- [ ] HelpText clarifies purpose or format

---

## Conversation Flow Section

### System Prompt
- [ ] Starts with clear role definition ("You are a [role] for {{business_name}}")
- [ ] Includes business type description
- [ ] Lists 3-5 main functions the bot performs
- [ ] Contains "Business Details:" section with all key variables
- [ ] Includes "IMPORTANT GUIDELINES:" or "GUIDELINES:" section
- [ ] Uses `{{variable}}` syntax for all dynamic content
- [ ] All variables referenced exist in `required_fields`
- [ ] Variables use exact field names (matching snake_case)
- [ ] Tone is appropriate for industry
- [ ] Length is 150-300 words

### Welcome Message
- [ ] Starts with friendly greeting
- [ ] Includes business name variable (`{{business_name}}` or similar)
- [ ] Lists 2-3 main capabilities
- [ ] Ends with open-ended question
- [ ] Uses appropriate emoji (👋 recommended)
- [ ] Tone matches industry (formal medical, casual salon, etc.)
- [ ] Length is 1-2 sentences

### Rules
- [ ] 5-8 rules defined
- [ ] Rules are specific and actionable
- [ ] Rules cover data collection requirements
- [ ] Rules include privacy/compliance if needed
- [ ] Rules mention tone and professionalism
- [ ] Rules define boundaries (what NOT to do)
- [ ] Rules formatted as complete sentences
- [ ] No redundant or overlapping rules

**Standard Rules to Consider:**
- Data collection (name, contact for bookings)
- Privacy protection (don't share other customers' info)
- Tone guidance (professional, empathetic, etc.)
- Boundary setting (stay in scope, don't provide advice outside expertise)
- Confirmation requirements (confirm details before finalizing)
- Escalation triggers (when to handoff)

### Intents
- [ ] 5-7 intents defined
- [ ] Intent names use `snake_case`
- [ ] Each intent has 5-10 trigger words/phrases
- [ ] Triggers cover variations and synonyms
- [ ] Response field provides clear instructions to AI
- [ ] Responses use imperative voice ("Collect:", "Ask:", "Provide:")
- [ ] Responses are concise (1-3 sentences)
- [ ] Covers main use cases for the vertical

**Standard Intents to Consider:**
- Booking/scheduling
- Inquiry/information
- Pricing/fees
- Status tracking
- Hours/availability
- Location/directions
- Cancellation/modification
- Emergency (if applicable)

### Handoff Conditions
- [ ] 3-6 handoff conditions defined
- [ ] Covers angry/frustrated customers
- [ ] Includes complex requests beyond bot capability
- [ ] Mentions edge cases specific to vertical
- [ ] Formatted as complete sentences
- [ ] Clear and specific (not vague)

**Standard Handoffs to Consider:**
- Customer anger or frustration
- Requests outside standard capabilities
- System or technical issues
- Legal, contractual, or compliance questions
- Payment disputes or refunds
- Special accommodations
- Emergency situations (if applicable)

---

## Metadata Section

### Required Metadata
- [ ] `name` is clear and descriptive
- [ ] `name` includes vertical type (e.g., "Medical & Dental Practice")
- [ ] `vertical` uses `snake_case` identifier
- [ ] `vertical` is unique (not conflicting with other templates)
- [ ] `tier` is correct (1, 2, or 3)
- [ ] `description` is compelling and under 100 characters
- [ ] `description` mentions key benefit
- [ ] `tagline` is catchy and under 50 characters
- [ ] `icon` emoji is relevant to vertical
- [ ] `is_published` is set (true for production, false for testing)
- [ ] `version` starts at 1

### Example Prompts
- [ ] 3-4 example prompts provided
- [ ] Examples cover different intents
- [ ] Examples use natural language
- [ ] Examples are realistic for the vertical
- [ ] Examples show variety of use cases

### Integrations
- [ ] Integrations list includes relevant systems
- [ ] Standard options: "calendar", "maps", "payment", "crm", "ecommerce_platform", "shipping"
- [ ] Only includes integrations that make sense for vertical

---

## Quality Checks

### JSON Validity
- [ ] Valid JSON syntax (no missing commas, brackets, quotes)
- [ ] All strings properly escaped
- [ ] No trailing commas
- [ ] Consistent indentation (2 spaces)

### Variable Consistency
- [ ] All `{{variables}}` in systemPrompt exist in required_fields
- [ ] All `{{variables}}` in welcomeMessage exist in required_fields
- [ ] Variable names match exactly (case-sensitive)
- [ ] No unused fields in required_fields

### Language & Tone
- [ ] No typos in triggers, responses, or prompts
- [ ] Grammar is correct throughout
- [ ] Tone matches industry standards
- [ ] South African context considered (ZA terminology, locations)
- [ ] Respectful and culturally sensitive language

### Privacy & Compliance
- [ ] Privacy protection mentioned in rules (if handling sensitive data)
- [ ] POPIA compliance noted (for medical, financial, personal data)
- [ ] Emergency handling defined (if applicable)
- [ ] Identity verification mentioned (for status checks, order tracking)

### Completeness
- [ ] All sections present (required_fields, conversation_flow, metadata)
- [ ] No placeholder text left (e.g., "[TODO]")
- [ ] All arrays have at least 3-5 items
- [ ] No empty objects or arrays

---

## Testing Checklist

### Pre-Testing
- [ ] Template validates with validation script
- [ ] Template seeds to database without errors
- [ ] Bot creates successfully from template in frontend
- [ ] All required fields render in onboarding form

### Variable Replacement
- [ ] All variables replace in welcome message
- [ ] All variables replace in system prompt
- [ ] Multiselect fields display as comma-separated lists
- [ ] No `{{variable}}` placeholders remain in bot responses

### Intent Matching
- [ ] Test all intent triggers (5-10 per intent)
- [ ] Intents trigger correctly in conversation
- [ ] AI follows response instructions
- [ ] No false positives (wrong intent triggered)
- [ ] No false negatives (intent not triggered when should)

### Rules Adherence
- [ ] AI follows all defined rules
- [ ] Tone is appropriate
- [ ] Data collection happens as specified
- [ ] Privacy rules respected
- [ ] Boundaries maintained (stays in scope)

### Handoff Detection
- [ ] All handoff conditions trigger correctly
- [ ] Handoff message is clear and helpful
- [ ] Customer context preserved during handoff
- [ ] False positives minimized

### Edge Cases
- [ ] Bot handles greetings appropriately
- [ ] Bot responds to thank yous
- [ ] Bot handles off-topic questions gracefully
- [ ] Bot detects angry/frustrated customers
- [ ] Bot handles typos and misspellings

---

## Documentation Checklist

### Template File
- [ ] Filename follows pattern: `[vertical]-template.json`
- [ ] File stored in `botflow-backend/src/data/`
- [ ] File copied to `botflow-backend/dist/data/` for deployment

### Code Comments
- [ ] Complex logic explained (if any)
- [ ] Unusual choices documented (if any)

### Test Documentation
- [ ] Test scenarios documented (in TEST_WEEK_5_TEMPLATES.md or similar)
- [ ] Expected behaviors defined
- [ ] Edge cases listed

---

## Deployment Checklist

### Database
- [ ] Template seeds successfully to `bot_templates` table
- [ ] Template ID generated correctly
- [ ] All JSONB fields stored properly
- [ ] RLS policies allow public read for published templates

### Frontend
- [ ] Template appears in template gallery
- [ ] Template icon renders correctly
- [ ] Template description displays
- [ ] Onboarding form renders all fields
- [ ] Form validation works (required fields, select options)

### Backend
- [ ] Template instantiation works
- [ ] Bot created with correct configuration
- [ ] Variables replaced in bot config
- [ ] Bot saved to database correctly

### End-to-End
- [ ] User can select template
- [ ] User can fill in onboarding form
- [ ] User can create bot from template
- [ ] Bot receives WhatsApp messages
- [ ] Bot responds according to template
- [ ] Intents match correctly
- [ ] Handoffs work as expected

---

## Common Issues & Solutions

### Issue: Variables not replacing
**Solution:**
- Check variable names match exactly (case-sensitive)
- Ensure variables exist in `required_fields`
- Verify syntax: `{{variable_name}}` not `{variable_name}` or `{{variableName}}`

### Issue: Intent not triggering
**Solution:**
- Add more trigger variations
- Check for typos in triggers
- Test with exact phrases from example prompts
- Check logs for intent matching results

### Issue: Handoff not triggering
**Solution:**
- Make handoff conditions more specific
- Test with explicit phrases
- Check logs for handoff detection
- Verify handoff conditions in database

### Issue: Template validation fails
**Solution:**
- Check JSON syntax (use JSON validator)
- Verify all required fields present
- Check for trailing commas
- Ensure arrays have at least one item

### Issue: Form fields not rendering
**Solution:**
- Check field type is valid ("text", "select", "multiselect", "number")
- Verify select/multiselect have validation.options
- Ensure field names use snake_case
- Check all required properties present

---

## Review Checklist

Before submitting template for review:

### Self-Review
- [ ] Read through entire template fresh
- [ ] Check for typos and grammar
- [ ] Verify all checklist items above
- [ ] Test at least 10 conversation scenarios
- [ ] Document any known limitations

### Peer Review (if applicable)
- [ ] Another developer reviews template JSON
- [ ] Industry expert reviews conversation flow
- [ ] QA tests template end-to-end
- [ ] All feedback addressed

### Final Sign-Off
- [ ] Template meets all quality standards
- [ ] Testing complete with 95%+ success rate
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## Template Approval Criteria

For a template to be approved for production:

1. **Functionality:** ✅ All intents work, variables replace, handoffs trigger
2. **Quality:** ✅ No typos, proper grammar, appropriate tone
3. **Completeness:** ✅ All sections filled, no placeholders
4. **Testing:** ✅ 10+ scenarios tested, 95%+ success rate
5. **Documentation:** ✅ Test scenarios documented
6. **Compliance:** ✅ Privacy and legal considerations addressed
7. **Performance:** ✅ Response time under 3 seconds
8. **User Experience:** ✅ Natural conversation flow, helpful responses

---

## Continuous Improvement

After template is live:

### Monitor
- [ ] Track usage metrics (how many bots created)
- [ ] Monitor conversation quality
- [ ] Review handoff frequency
- [ ] Collect user feedback

### Iterate
- [ ] Add new intents based on common questions
- [ ] Refine triggers for better matching
- [ ] Update rules based on learnings
- [ ] Adjust tone if needed

### Version Control
- [ ] Increment version number for updates
- [ ] Document changes in changelog
- [ ] Test updates before deployment
- [ ] Migrate existing bots if needed

---

## Quick Reference

### Tier Guidelines
- **Tier 1:** High-impact, common businesses (taxi, medical, restaurant, salon, real estate, ecommerce)
- **Tier 2:** Specialized, medium-demand (hotel, gym, retail, plumber, car rental)
- **Tier 3:** Niche or complex (lawyer, accountant, tutor, cleaning, travel)

### Field Count Guidelines
- **Minimum:** 5 fields
- **Sweet Spot:** 7-8 fields
- **Maximum:** 10 fields

### Intent Count Guidelines
- **Minimum:** 5 intents
- **Sweet Spot:** 6-7 intents
- **Maximum:** 10 intents

### Rule Count Guidelines
- **Minimum:** 5 rules
- **Sweet Spot:** 6-8 rules
- **Maximum:** 10 rules

### System Prompt Length
- **Minimum:** 150 words
- **Sweet Spot:** 200-250 words
- **Maximum:** 300 words

---

**Use this checklist for every new template to maintain quality and consistency across all 20 BotFlow verticals.**
