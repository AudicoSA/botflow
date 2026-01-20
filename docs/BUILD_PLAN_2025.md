# BotFlow Build Plan 2025
## Twilio Migration + 20 Vertical Templates

**Document Version:** 1.0
**Last Updated:** January 11, 2026
**Status:** Ready for Execution

---

## Executive Summary

This plan aligns with the PRD strategy to:
1. **Migrate from Bird → Twilio** for true multi-tenant SaaS architecture
2. **Launch 20 vertical templates** enabling 10-minute onboarding
3. **Achieve product-market fit** in South African SMB market

**Timeline:** 13 weeks (3.25 months) - Twilio migration already complete!
**Launch Target:** Mid-April 2026

---

## Strategic Alignment

### Why I Agree with This Roadmap

✅ **Twilio Migration is Critical**
- Proper subaccount isolation per customer
- Clean billing (no cross-contamination)
- Meta-compliant WhatsApp onboarding
- Better long-term scalability

✅ **Template-First Approach**
- Solves "blank canvas" problem
- Dramatically reduces onboarding time
- Clear value demonstration
- Higher activation rates

✅ **Vertical Focus**
- Clear ICP targeting
- Easier marketing and sales
- Industry-specific language
- Proven playbooks per vertical

✅ **Ralph Integration**
- Reduces support burden
- Assists with template generation
- Helps debug customer issues
- Internal force multiplier

---

## Phase Breakdown

### ✅ Phase 0: COMPLETED - Twilio Migration
**Status:** Already migrated from Bird to Twilio

### Phase 1: Template Infrastructure (Weeks 1-3)
**Goal:** Build template system foundation and onboarding flows

### Phase 2: Core Templates (Weeks 4-7)
**Goal:** Build and test 7 Tier-1 vertical templates

### Phase 3: Expansion Templates (Weeks 8-11)
**Goal:** Complete remaining 13 templates, polish UX

### Phase 4: Launch Preparation (Weeks 12-13)
**Goal:** Testing, documentation, go-to-market prep

---

## Detailed Timeline

### ✅ PHASE 0: TWILIO MIGRATION - COMPLETED!

**What's Already Done:**
- ✅ Twilio integration implemented
- ✅ WhatsApp message sending/receiving functional
- ✅ Webhook handler working
- ✅ Multi-tenant architecture in place

**Current Status:** Ready to build template system on top of working Twilio foundation

---

### PHASE 1: TEMPLATE INFRASTRUCTURE (Weeks 1-3)

#### Week 1: Template Data Model & API
**Backend Tasks:**
- [ ] Create `bot_templates` table schema
- [ ] Define template JSON structure (conversation_flow, required_fields, integrations)
- [ ] Create `/api/templates` CRUD endpoints
- [ ] Implement template → bot instantiation logic
- [ ] Add template validation and versioning

**Database Schema:**
```sql
CREATE TABLE bot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vertical TEXT NOT NULL, -- 'taxi', 'restaurant', 'salon', etc.
  tier INTEGER NOT NULL, -- 1, 2, or 3
  description TEXT,
  icon TEXT,
  required_fields JSONB NOT NULL, -- { field: { type, label, validation, placeholder } }
  conversation_flow JSONB NOT NULL, -- AI instructions, prompts, flows
  example_prompts TEXT[],
  integrations TEXT[], -- ['maps', 'calendar', 'payment']
  is_published BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_vertical ON bot_templates(vertical);
CREATE INDEX idx_templates_published ON bot_templates(is_published);
```

**Testing:**
- [ ] Test template CRUD operations
- [ ] Verify JSON schema validation
- [ ] Test versioning logic

---

#### Week 2: Template Onboarding Flow (Frontend)
**Frontend Tasks:**
- [ ] Build vertical selection screen (20 cards with icons)
- [ ] Create template preview component (show example conversation)
- [ ] Build dynamic form generator from template.required_fields
- [ ] Implement multi-step onboarding wizard
- [ ] Add form validation and error states
- [ ] Show progress indicator

**UX Flow:**
1. Select vertical → 2. Preview template → 3. Fill onboarding form → 4. Review & activate → 5. Success!

**Backend Tasks:**
- [ ] Create `/api/bots/create-from-template` endpoint
- [ ] Validate onboarding data against template schema
- [ ] Generate bot configuration from template + user data
- [ ] Auto-activate bot after creation

**Testing:**
- [ ] Test form generation for various field types
- [ ] Verify validation works properly
- [ ] Test bot creation end-to-end

---

#### Week 3: AI Template Execution Engine
**Backend Tasks:**
- [ ] Update message queue worker to handle template-based bots
- [ ] Implement conversation flow executor
- [ ] Add template-specific prompt injection
- [ ] Build context manager for template variables
- [ ] Add integration hooks (maps, calendar, etc.)

**Template Execution Logic:**
```typescript
// When message arrives:
1. Load bot template
2. Load conversation context
3. Inject template-specific system prompt
4. Apply conversation flow rules
5. Call GPT-4 with enriched context
6. Execute any integration calls
7. Return formatted response
```

**Testing:**
- [ ] Test with mock template
- [ ] Verify variable substitution works
- [ ] Test integration hooks

---

### PHASE 2: CORE TEMPLATES (Weeks 4-7)

#### Week 4: Tier-1 Templates (Part 1)

**Template 1: Taxi & Shuttle Services**
- [ ] Define required fields (service area, vehicle types, pricing)
- [ ] Build conversation flow (booking, quoting, confirmation)
- [ ] Add Maps integration for distance calculation
- [ ] Create calendar availability logic
- [ ] Test with real taxi business

**Template 2: Restaurants (Takeaway/Delivery)**
- [ ] Define menu structure (categories, items, prices)
- [ ] Build order taking flow
- [ ] Add pickup/delivery selection
- [ ] Implement order confirmation
- [ ] Add payment link generation

**Template 3: Hair & Beauty Salons**
- [ ] Define services and pricing
- [ ] Build appointment booking flow
- [ ] Add staff assignment logic
- [ ] Implement reminder system
- [ ] Test cancellation/reschedule

---

#### Week 5: Tier-1 Templates (Part 2)

**Template 4: Medical Clinics / Dentists**
- [ ] Build appointment booking (HIPAA-aware messaging)
- [ ] Add patient intake questions
- [ ] Implement insurance verification prompts
- [ ] Create appointment reminder logic
- [ ] Test with clinic compliance requirements

**Template 5: Real Estate Agents**
- [ ] Define property listing structure
- [ ] Build property inquiry flow
- [ ] Add viewing schedule logic
- [ ] Implement lead qualification
- [ ] Create CRM data export

**Template 6: E-commerce Stores**
- [ ] Build product catalog structure
- [ ] Add order status tracking
- [ ] Implement returns/exchanges flow
- [ ] Create shipping inquiry handling
- [ ] Test with Shopify integration

---

#### Week 6: Tier-1 Templates (Part 3)

**Template 7: Gyms & Fitness Studios**
- [ ] Build class schedule system
- [ ] Add membership inquiry flow
- [ ] Implement trial booking
- [ ] Create attendance tracking prompts
- [ ] Test cancellation policies

**Cross-Template Work:**
- [ ] Standardize template UX patterns
- [ ] Create reusable conversation components
- [ ] Build template testing framework
- [ ] Document template creation process

---

#### Week 7: Template Marketplace UI

**Frontend Tasks:**
- [ ] Build template browse/search page
- [ ] Add vertical category filtering
- [ ] Show template preview with example conversations
- [ ] Implement "Use Template" flow
- [ ] Add template ratings/reviews (future)

**Backend Tasks:**
- [ ] Create template recommendation engine
- [ ] Add template usage analytics
- [ ] Implement template cloning for customization

**Testing:**
- [ ] Test all 7 Tier-1 templates end-to-end
- [ ] Get beta customer feedback
- [ ] Iterate based on real usage

---

### PHASE 3: EXPANSION TEMPLATES (Weeks 8-11)

#### Week 8: Tier-2 Templates (Hotels to Home Services)

**Template 8: Hotels & Guesthouses**
- [ ] Build booking inquiry flow
- [ ] Add availability checking
- [ ] Implement check-in/check-out info
- [ ] Create guest services FAQ

**Template 9: Property Management (Airbnb)**
- [ ] Build guest communication flow
- [ ] Add check-in instructions automation
- [ ] Implement maintenance request handling
- [ ] Create house rules enforcement

**Template 10: Auto Repair & Mechanics**
- [ ] Build service booking flow
- [ ] Add quote request handling
- [ ] Implement job status updates
- [ ] Create vehicle history tracking

**Template 11: Law Firms (Intake)**
- [ ] Build client intake flow
- [ ] Add consultation booking
- [ ] Implement case type qualification
- [ ] Create confidentiality notices

**Template 12: Accounting Firms**
- [ ] Build tax season inquiry handling
- [ ] Add document request automation
- [ ] Implement appointment scheduling
- [ ] Create deadline reminders

**Template 13: Cleaning Services**
- [ ] Build quote request flow
- [ ] Add service frequency selection
- [ ] Implement booking confirmation
- [ ] Create feedback collection

**Template 14: Home Services (Plumbing, Electrical)**
- [ ] Build emergency vs scheduled booking
- [ ] Add quote generation
- [ ] Implement arrival time updates
- [ ] Create photo-based issue assessment

---

#### Week 9: Tier-3 Templates (Schools to Retail)

**Template 15: Schools & Training Centers**
- [ ] Build enrollment inquiry flow
- [ ] Add course information automation
- [ ] Implement registration guidance
- [ ] Create parent communication templates

**Template 16: Event Venues**
- [ ] Build availability inquiry flow
- [ ] Add capacity and pricing info
- [ ] Implement booking process
- [ ] Create event planning assistance

**Template 17: Recruitment Agencies**
- [ ] Build candidate intake flow
- [ ] Add job matching logic
- [ ] Implement interview scheduling
- [ ] Create application status updates

**Template 18: Insurance Brokers**
- [ ] Build quote request flow
- [ ] Add coverage comparison
- [ ] Implement claim guidance
- [ ] Create policy renewal reminders

**Template 19: Travel Agencies**
- [ ] Build trip inquiry flow
- [ ] Add destination recommendations
- [ ] Implement booking assistance
- [ ] Create itinerary management

**Template 20: Local Retail Stores**
- [ ] Build product inquiry flow
- [ ] Add inventory checking
- [ ] Implement in-store pickup coordination
- [ ] Create loyalty program info

---

#### Week 10: Template Quality & Polish

**All Templates:**
- [ ] Standardize conversation tone per vertical
- [ ] Add South African localization (pricing in Rands, local references)
- [ ] Implement error recovery flows
- [ ] Add handoff triggers for edge cases
- [ ] Create onboarding videos per template

**AI Optimization:**
- [ ] Fine-tune GPT prompts per vertical
- [ ] Add industry-specific context
- [ ] Implement conversation flow optimization
- [ ] Test edge cases and failure modes

**Documentation:**
- [ ] Create setup guide per template
- [ ] Write best practices per vertical
- [ ] Build troubleshooting guide
- [ ] Add FAQ per template

---

#### Week 11: Ralph Integration

**Ralph (Internal AI Agent) Setup:**
- [ ] Create Ralph backend service
- [ ] Implement template generation from description
- [ ] Add validation logic for new templates
- [ ] Build debugging assistance for failed setups
- [ ] Create customer onboarding helper

**Ralph Capabilities:**
- Generate new vertical templates from specifications
- Validate customer onboarding data
- Explain WhatsApp pricing and limits
- Debug connection issues
- Provide setup guidance

**Integration Points:**
- [ ] Add Ralph to internal dashboard
- [ ] Create support team interface
- [ ] Implement founder override capabilities
- [ ] Add template marketplace contribution flow

---

### PHASE 4: LAUNCH PREPARATION (Weeks 12-13)

#### Week 12: Testing & QA

**End-to-End Testing:**
- [ ] Test complete flow for all 20 templates
- [ ] Verify multi-tenant isolation
- [ ] Load test with 50+ concurrent customers
- [ ] Test billing accuracy
- [ ] Verify WhatsApp compliance

**User Acceptance Testing:**
- [ ] Recruit 5 beta customers per Tier-1 vertical
- [ ] Guide through onboarding
- [ ] Collect feedback
- [ ] Fix critical issues
- [ ] Measure 10-minute onboarding goal

**Security Audit:**
- [ ] Review authentication flows
- [ ] Audit RLS policies
- [ ] Test credential encryption
- [ ] Verify CORS and rate limiting
- [ ] Check for common vulnerabilities

---

#### Week 13: Launch Readiness

**Documentation:**
- [ ] Complete user documentation
- [ ] Write API documentation
- [ ] Create support playbooks
- [ ] Build help center content
- [ ] Record demo videos

**Marketing:**
- [ ] Update website with templates
- [ ] Create landing pages per vertical
- [ ] Prepare launch announcement
- [ ] Set up analytics tracking
- [ ] Build email sequences

**Operations:**
- [ ] Set up monitoring dashboards (Sentry, PostHog)
- [ ] Configure alerting
- [ ] Create incident response plan
- [ ] Prepare customer support channels
- [ ] Train support team on templates

**Go-Live Checklist:**
- [ ] All 20 templates tested and published
- [ ] Twilio production account configured
- [ ] Billing system operational
- [ ] Support team ready
- [ ] Monitoring in place
- [ ] Marketing assets live
- [ ] Launch announcement scheduled

---

## Resource Requirements

### Engineering Team
- **Backend Engineer** (1 FTE): Twilio migration, template engine, Ralph
- **Frontend Engineer** (1 FTE): Dashboard, template marketplace, onboarding flows
- **Full-Stack Engineer** (0.5 FTE): Integration work, testing, DevOps

### Design
- **Product Designer** (0.5 FTE): Template UX, onboarding flows, vertical branding

### Operations
- **Product Manager**: Roadmap, prioritization, beta customer management
- **Support/Success**: Beta customer onboarding, feedback collection

### External Services Budget
- Twilio: $500-1000/month (development + testing)
- OpenAI API: $300-500/month
- Supabase Pro: $25/month
- Upstash Redis: $10-30/month
- Infrastructure: $100-200/month
- **Total: ~$1,000-2,000/month**

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ Twilio subaccount creation working
- ✅ Multi-tenant message routing verified
- ✅ Zero cross-customer message leakage
- ✅ Usage tracking accurate to 99%

### Phase 2 Success Criteria
- ✅ 7 Tier-1 templates published
- ✅ 5 beta customers per template
- ✅ Average onboarding time <15 minutes
- ✅ 80% activation rate (customers go live)

### Phase 3 Success Criteria
- ✅ All 20 templates completed
- ✅ Template marketplace functional
- ✅ Ralph operational for support
- ✅ 90%+ template quality score

### Phase 4 Success Criteria
- ✅ Public launch ready
- ✅ 50+ beta customers active
- ✅ <5% critical bug rate
- ✅ Support team trained

---

## Risk Mitigation

### Risk 1: Twilio Migration Complexity
**Mitigation:**
- Maintain Bird as fallback during transition
- Migrate one customer at a time initially
- Build comprehensive test suite
- Plan 2-week buffer for issues

### Risk 2: Template Quality Variability
**Mitigation:**
- Establish template quality checklist
- Beta test each template with real customers
- Iterate based on feedback
- Use Ralph to validate consistency

### Risk 3: Meta WhatsApp Policy Changes
**Mitigation:**
- Monitor WhatsApp Business API updates
- Build compliance checks into templates
- Educate customers on policies upfront
- Maintain direct Meta partnership channel

### Risk 4: Customer Onboarding Friction
**Mitigation:**
- Obsess over onboarding UX
- Provide live onboarding support initially
- Record common issues and build fixes
- Use Ralph to assist during setup

---

## Migration Strategy (Bird → Twilio)

### Existing Customers
**Option 1: Forced Migration**
- Notify 30 days in advance
- Provide migration assistant
- Offer support during transition
- Maintain Bird for 60 days grace period

**Option 2: Gradual Migration**
- New customers: Twilio only
- Existing customers: migrate on opt-in basis
- Deprecate Bird by Q3 2026

**Recommended: Option 2** (less risk, smoother transition)

---

## Post-Launch Roadmap (Phase 5+)

### Month 5-6: Optimization
- Analyze template usage patterns
- Optimize high-friction points
- Add requested customizations
- Scale infrastructure

### Month 7-9: Agency Features
- Multi-client management
- White-label options
- Reseller program
- Bulk operations

### Month 10-12: Platform Expansion
- Template marketplace (community templates)
- Custom template builder (no-code)
- Advanced integrations (Zapier, Make)
- Voice and SMS channels

---

## Alignment with Business Goals

### Revenue Goals
- **Month 1-3 (Beta)**: 50 customers × R499 = R24,950/month
- **Month 4-6 (Launch)**: 200 customers × R700 avg = R140,000/month
- **Month 7-12 (Growth)**: 500+ customers × R800 avg = R400,000+/month

### Market Positioning
- **"The Vertical Template Company"** for WhatsApp AI
- Clear differentiation from generic chatbot builders
- Industry-specific expertise
- Fastest time-to-value

---

## Open Questions & Decisions Needed

1. **Twilio Pricing Pass-Through**: Fixed markup or percentage?
2. **Template Customization**: How much flexibility before it becomes overwhelming?
3. **Ralph Access**: Internal-only or customer-facing?
4. **Multi-Language**: Which languages for Phase 1?
5. **Payment Integration**: Stripe only or add local SA options (SnapScan, Yoco)?

---

## Next Immediate Actions

### This Week (Week 0 - Prep)
1. **Set up Twilio master account**
2. **Create development Twilio subaccount for testing**
3. **Review current Bird integration code**
4. **Identify reusable components**
5. **Create detailed Week 1 task breakdown**

### Week 1 Kickoff
- Daily standups to unblock progress
- Complete Twilio service implementation
- Set up monitoring for new infrastructure
- Begin database schema updates

---

## Conclusion

This plan aligns with the PRD's strategic vision:
- ✅ Twilio migration for proper SaaS architecture
- ✅ 20 vertical templates for fast onboarding
- ✅ 10-minute setup goal
- ✅ Ralph integration for operational leverage

**Timeline**: 16 weeks to public launch
**Confidence Level**: High (given existing foundation)
**Key Success Factor**: Template quality and onboarding UX

**Ready to execute?** Let's start with Week 1: Twilio Infrastructure Setup.

---

**Document Owner**: Product/Engineering
**Review Cycle**: Weekly during execution
**Next Review**: Week 1 completion
