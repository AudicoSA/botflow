# Template Creation Patterns

This document captures reusable patterns discovered while building templates for BotFlow's 20 business verticals.

---

## Standard Intent Categories

### 1. Booking Intents
**Used by:** Medical, Real Estate, Salon, Restaurant, Taxi

**Pattern:**
```json
{
  "book_[service]": {
    "triggers": ["book", "appointment", "schedule", "reserve", "arrange"],
    "response": "Collect: name, contact, [service-specific details], date/time. Confirm details before finalizing."
  }
}
```

**Service-Specific Details:**
- **Medical:** reason for visit, medical aid status
- **Real Estate:** property interest, viewing preference
- **Salon:** service type, stylist preference
- **Restaurant:** party size, special occasions
- **Taxi:** pickup location, destination, passenger count

**Best Practices:**
- Always collect name and contact number
- Confirm appointment details before finalizing
- Mention fees/prices if applicable
- Ask about special requirements

---

### 2. Inquiry Intents
**Used by:** All templates

**Pattern:**
```json
{
  "general_inquiry": {
    "triggers": ["question", "tell me", "information", "about", "what"],
    "response": "Provide helpful information about [business]. Stay in scope of services offered."
  }
}
```

**Examples:**
- Medical: "What services do you offer?"
- E-commerce: "Do you have [product]?"
- Real Estate: "What areas do you cover?"

**Best Practices:**
- Keep responses focused on business
- Direct to specific resources (website, contact)
- Offer to help with next steps
- Don't make up information

---

### 3. Pricing Intents
**Used by:** All templates

**Pattern:**
```json
{
  "get_pricing": {
    "triggers": ["how much", "cost", "price", "fee", "rate", "charge"],
    "response": "Provide clear pricing for [service/product]. Mention additional fees or variations if applicable."
  }
}
```

**Pricing Contexts:**
- Medical: Consultation fees, medical aid acceptance
- Real Estate: Commission structure, property prices
- E-commerce: Product prices, delivery fees
- Salon: Service prices, package deals
- Taxi: Fare calculation, distance-based pricing

**Best Practices:**
- Be transparent about pricing
- Mention additional costs upfront
- Clarify payment methods
- Offer alternatives if available

---

### 4. Status Intents
**Used by:** E-commerce, Taxi, Medical

**Pattern:**
```json
{
  "check_status": {
    "triggers": ["status", "where is", "track", "update", "progress"],
    "response": "Ask for [identifier] and confirm customer details. Provide status or handoff to human."
  }
}
```

**Identifiers by Vertical:**
- E-commerce: Order number
- Taxi: Booking reference
- Medical: Appointment reference
- Restaurant: Reservation name

**Best Practices:**
- Always verify customer identity
- Protect privacy - don't share others' info
- Provide clear status updates
- Escalate if system access needed

---

### 5. Emergency Intents
**Used by:** Medical (critical), Taxi (safety), Real Estate (security)

**Pattern:**
```json
{
  "emergency": {
    "triggers": ["emergency", "urgent", "help", "911", "police", "ambulance"],
    "response": "URGENT: Provide emergency contact immediately. Do not delay with questions."
  }
}
```

**Emergency Contacts:**
- Medical: 10177 (ambulance), 112 (general)
- Taxi: Client safety line, panic button
- General: Local emergency services

**Best Practices:**
- Respond immediately - no delays
- Provide clear emergency numbers
- Don't attempt to assess situation
- Log for follow-up

---

### 6. Cancellation/Modification Intents
**Used by:** Medical, Restaurant, Salon, Taxi, Real Estate

**Pattern:**
```json
{
  "cancel_or_modify": {
    "triggers": ["cancel", "reschedule", "change", "modify", "update"],
    "response": "Handoff to human staff to modify existing bookings. Confirm which booking they're referring to."
  }
}
```

**Best Practices:**
- Handoff to human for modifications
- Confirm booking identifier first
- Mention cancellation policy if applicable
- Be empathetic and helpful

---

### 7. Hours/Availability Intents
**Used by:** All templates

**Pattern:**
```json
{
  "check_hours": {
    "triggers": ["hours", "open", "closed", "time", "available", "when"],
    "response": "Provide operating hours clearly. Mention public holidays, special closures."
  }
}
```

**Best Practices:**
- Include all days of the week
- Mention public holidays
- Note any seasonal variations
- Provide timezone if relevant

---

### 8. Location/Direction Intents
**Used by:** Physical businesses (Medical, Salon, Restaurant, Real Estate)

**Pattern:**
```json
{
  "get_location": {
    "triggers": ["where", "address", "location", "directions", "map"],
    "response": "Provide full address. Offer Google Maps link if helpful. Mention landmarks if applicable."
  }
}
```

**Best Practices:**
- Provide complete address
- Mention parking availability
- Include landmarks for easy finding
- Offer directions if needed

---

## Standard Rules

### Privacy & Compliance

```
Privacy Rules (all templates):
- Never share other customers' information
- Protect sensitive data (medical, financial, personal)
- Comply with POPIA (South African privacy law)
- Confirm identity before discussing personal info
- Don't store credit card details in conversation
```

**POPIA Considerations:**
- Medical: Patient privacy is critical
- E-commerce: Order details are private
- Real Estate: Financial information is sensitive
- All: WhatsApp messages are personal data

---

### Professional Conduct

```
Professional Conduct Rules:
- Be professional, friendly, and empathetic
- Use appropriate tone for industry (medical=formal, salon=casual)
- Stay in scope of business - don't answer off-topic
- Never provide advice outside expertise
- Maintain cultural sensitivity for South African context
```

**Tone by Vertical:**
- **Medical:** Professional, empathetic, clear
- **Real Estate:** Enthusiastic, consultative, relationship-focused
- **E-commerce:** Friendly, helpful, solution-oriented
- **Salon:** Warm, personal, style-focused
- **Restaurant:** Welcoming, hospitable, food-focused
- **Taxi:** Efficient, safety-focused, respectful

---

### Data Collection

```
Data Collection Rules:
- Always collect name and contact for bookings
- Confirm details before finalizing any action
- Ask for missing required information
- Validate input where possible (phone format, email format)
- Don't ask for unnecessary information
```

**Required vs Optional:**
- **Always Required:** Name, contact method (phone/email)
- **Booking-Specific:** Date, time, service type
- **Context-Dependent:** Special requests, preferences
- **Never Required:** Sensitive info without explicit need

---

### Escalation & Handoff

```
Escalation Rules:
- Escalate complex requests beyond bot capability
- Detect frustration and offer human help proactively
- Know when to handoff (defined per vertical)
- Be transparent about limitations
- Make handoff smooth - don't abandon customer
```

**Universal Handoff Triggers:**
- Customer is angry, frustrated, or threatening
- Request outside standard capabilities
- Technical system issues preventing service
- Legal, contractual, or compliance questions
- Payment disputes or refund requests

---

## Handoff Condition Patterns

### Universal Handoffs
```json
"handoffConditions": [
  "Customer is angry, frustrated, or threatening",
  "Request outside standard business capabilities",
  "Technical system issues preventing service",
  "Customer explicitly asks for human support"
]
```

### Vertical-Specific Handoffs

**Medical:**
```json
"handoffConditions": [
  "Patient describes emergency or severe symptoms",
  "Request for prescription or medical advice",
  "Insurance verification or authorization needed",
  "Complex medical inquiry requiring professional input",
  "Special accommodation needed (wheelchair, interpreter)"
]
```

**Real Estate:**
```json
"handoffConditions": [
  "Client requests specific property address or keys",
  "Complex negotiation or pricing discussion",
  "Client wants to make an offer",
  "Mortgage or financing questions",
  "Legal or contract questions"
]
```

**E-commerce:**
```json
"handoffConditions": [
  "Customer reports damaged or incorrect item",
  "Payment dispute or refund request",
  "Bulk order or corporate inquiry",
  "Technical issue with website or checkout",
  "Request for store credit or special accommodation"
]
```

**Salon/Restaurant:**
```json
"handoffConditions": [
  "Special event bookings (weddings, parties)",
  "Large group reservations (10+ people)",
  "Custom package or menu requests",
  "Pricing negotiation for events",
  "Complaint about service quality"
]
```

---

## Field Type Best Practices

### Text Fields

**Use for:** Names, addresses, phone numbers, emails, URLs

```json
{
  "field_name": {
    "type": "text",
    "label": "Clear Label",
    "placeholder": "e.g. Example value",
    "required": true,
    "helpText": "Optional clarification"
  }
}
```

**Best Practices:**
- Always include realistic placeholder examples
- Use South African formatting (phone: "021 123 4567", "082 123 4567")
- Add helpText for ambiguous fields
- Keep labels concise (2-4 words)

---

### Select Fields

**Use for:** Single choice from limited options (under 8)

```json
{
  "field_name": {
    "type": "select",
    "label": "Choose One",
    "required": true,
    "validation": {
      "options": [
        "Option 1",
        "Option 2",
        "Option 3"
      ]
    }
  }
}
```

**Best Practices:**
- Keep options under 8 for usability
- Order logically (most common first, alphabetical, or sequential)
- Use clear, distinct options
- Avoid overlapping choices

**Good Examples:**
- Practice Type: "General Practitioner", "Dentist", "Specialist"
- Specialization: "Sales", "Rentals", "Both Sales and Rentals"
- Business Type: "Restaurant", "Bar", "Café"

---

### Multiselect Fields

**Use for:** Multiple selections from 5-15 options

```json
{
  "field_name": {
    "type": "multiselect",
    "label": "Select All That Apply",
    "required": true,
    "validation": {
      "options": [
        "Option A",
        "Option B",
        "Option C"
      ]
    }
  }
}
```

**Best Practices:**
- Good for services, categories, features
- Allow 5-15 options (not too few, not overwhelming)
- Group related options
- Use consistent formatting

**Good Examples:**
- Services Offered: "Haircut", "Color", "Styling", "Treatments"
- Product Categories: "Electronics", "Clothing", "Home & Garden"
- Property Types: "Houses", "Apartments", "Townhouses"

---

### Number Fields

**Use for:** Prices, quantities, ages, years

```json
{
  "field_name": {
    "type": "number",
    "label": "Amount (R)",
    "placeholder": "e.g. 450",
    "required": true,
    "helpText": "Standard price",
    "validation": {
      "min": 0,
      "max": 10000
    }
  }
}
```

**Best Practices:**
- Include currency symbol in label (R for Rand)
- Set reasonable min/max if applicable
- Use for actual numbers only (not phone numbers - those are text)
- Provide example in placeholder

---

### Time Fields

**Use for:** Operating hours, availability windows

```json
{
  "operating_hours": {
    "type": "text",
    "label": "Operating Hours",
    "placeholder": "e.g. Mon-Fri: 8am-5pm, Sat: 9am-1pm",
    "required": true
  }
}
```

**Note:** Time fields are stored as text for flexibility.

**Best Practices:**
- Provide clear format example
- Allow natural language ("Mon-Fri")
- Include weekend hours
- Mention if closed certain days

---

## System Prompt Structure

### Standard Template

```
You are a [professional role] for {{business_name}}, a [business type].

You help [customers/clients/patients] with:
1. [Primary function]
2. [Secondary function]
3. [Additional functions]

Business Details:
- [Key detail 1]: {{variable_1}}
- [Key detail 2]: {{variable_2}}
- [Key detail 3]: {{variable_3}}

IMPORTANT GUIDELINES:
- [Tone guideline]
- [Key operational rule]
- [Data collection requirement]
- [Safety/compliance note]
- [Limitation or boundary]
```

### Examples by Vertical

**Medical:**
```
You are a professional medical receptionist for {{practice_name}}, a {{practice_type}} practice.

You help patients:
1. Book appointments for consultations
2. Answer questions about services and fees
3. Provide practice information
4. Handle emergency inquiries

[Business details and guidelines follow]
```

**E-commerce:**
```
You are a helpful customer service agent for {{store_name}}, an online store.

You assist customers with:
1. Product inquiries and recommendations
2. Order status tracking
3. Delivery information
4. Returns and exchanges

[Business details and guidelines follow]
```

---

## Welcome Message Patterns

### Standard Format
```
[Greeting] [Introduction] [Service offer] [Call to action]
```

### Examples

**Professional (Medical):**
```
"Hello! 👋 Welcome to {{practice_name}}. I can help you book an appointment or answer questions about our services. How can I assist you today?"
```

**Enthusiastic (Real Estate):**
```
"Hi there! 👋 I'm the assistant for {{agent_name}}, your real estate expert in {{service_areas}}. Looking to buy, rent, or view a property? I'm here to help!"
```

**Friendly (E-commerce):**
```
"Hi! 👋 Welcome to {{store_name}}! I'm here to help with product questions, order tracking, or any other inquiries. What can I help you with today?"
```

**Best Practices:**
- Start with friendly greeting
- Include business name ({{variable}})
- List 2-3 main capabilities
- End with open question
- Use appropriate emoji (👋 is universal)

---

## Variable Usage Patterns

### Naming Convention
- Use `snake_case` for all variables
- Be descriptive but concise
- Match field names exactly

### Replacement in System Prompt
```
Business Details:
- Name: {{business_name}}
- Type: {{business_type}}
- Services: {{services_offered}}
- Hours: {{operating_hours}}
- Location: {{location}}
```

### Replacement in Welcome Message
```
"Welcome to {{business_name}}. We specialize in {{specialization}} in {{service_areas}}."
```

### Array Handling
Multiselect fields become comma-separated lists:
- Input: ["Service A", "Service B", "Service C"]
- Output: "Service A, Service B, Service C"

**Best Practice:** Use grammatically:
```
"We offer {{services_offered}}."
→ "We offer Haircut, Color, Styling."
```

---

## Integration Planning

### Standard Integrations

**Calendar (Booking-based verticals):**
- Medical, Salon, Restaurant, Real Estate viewings

**Maps (Location-based verticals):**
- Taxi, Restaurant, Salon, Real Estate

**Payment (Transaction-based verticals):**
- E-commerce, Salon, Restaurant

**CRM (Relationship-based verticals):**
- Real Estate, Medical, Salon

**E-commerce Platform:**
- Online stores only

**Shipping/Logistics:**
- E-commerce, Taxi

### Integration Field in Template
```json
"integrations": ["calendar", "maps", "payment", "crm"]
```

**Note:** These are metadata only. Actual integrations implemented in Week 8.

---

## Example Prompts

### Purpose
Help users understand what they can ask the bot.

### Best Practices
- Provide 3-4 realistic examples
- Cover main use cases
- Use natural language
- Show variety of intents

### Examples

**Medical:**
```json
"example_prompts": [
  "I need to see a doctor tomorrow",
  "Do you accept Discovery medical aid?",
  "What are your consultation fees?",
  "I have severe chest pain (emergency)"
]
```

**Real Estate:**
```json
"example_prompts": [
  "I'm looking for a 3-bedroom house in Sea Point",
  "Can I view the property on Saturday?",
  "What's your budget range for apartments?",
  "Do you have rentals near good schools?"
]
```

---

## Template Metadata

### Required Fields
```json
{
  "name": "Human-Readable Template Name",
  "vertical": "snake_case_identifier",
  "tier": 1,
  "description": "One-line description under 100 characters",
  "tagline": "Catchy benefit under 50 characters",
  "icon": "🏥",
  "is_published": true,
  "version": 1
}
```

### Tier Guidelines
- **Tier 1:** High-impact, common businesses (Weeks 4-6)
- **Tier 2:** Specialized, medium-demand businesses (Weeks 7-8)
- **Tier 3:** Niche or complex businesses (Week 9)

### Icon Selection
Use relevant emoji:
- 🏥 Medical/Healthcare
- 🏘️ Real Estate
- 🛒 E-commerce
- 💇 Salon/Beauty
- 🍽️ Restaurant/Food
- 🚕 Taxi/Transport

---

## Quality Checklist

Before finalizing any template:

### Content
- [ ] System prompt includes all key business details
- [ ] Welcome message is warm and clear
- [ ] 5-8 rules defined and specific
- [ ] 5-7 intents with comprehensive triggers
- [ ] 3-5 handoff conditions covering edge cases
- [ ] 3-4 example prompts provided

### Variables
- [ ] All variables in prompts exist in required_fields
- [ ] Variable names use snake_case
- [ ] Arrays will read naturally as comma-separated lists

### Fields
- [ ] 5-10 fields total (not too many)
- [ ] All required fields marked correctly
- [ ] Placeholders show realistic examples
- [ ] Select/multiselect options are clear
- [ ] HelpText added where needed

### Validation
- [ ] JSON is valid (no syntax errors)
- [ ] Template validates with script
- [ ] No typos in triggers or responses
- [ ] Tone matches industry

### Testing
- [ ] Template seeds successfully
- [ ] Bot creates from template
- [ ] Variables replace properly
- [ ] Intents trigger correctly
- [ ] Handoffs work as expected

---

## Common Pitfalls to Avoid

### 1. Over-Specification
❌ Don't: Create 20 fields asking for every detail
✅ Do: Focus on 5-10 essential fields

### 2. Vague Intents
❌ Don't: "various triggers"
✅ Do: ["book", "appointment", "schedule", "reserve"]

### 3. Missing Handoffs
❌ Don't: Assume bot can handle everything
✅ Do: Define clear handoff conditions

### 4. Generic Tone
❌ Don't: Same tone for all verticals
✅ Do: Match tone to industry (formal medical, friendly salon)

### 5. Ignoring South African Context
❌ Don't: Use US phone formats, ignore local services
✅ Do: Use ZA formats (021 prefix, medical aid not insurance)

### 6. Forgetting Privacy
❌ Don't: Share customer info freely
✅ Do: Verify identity, protect sensitive data

### 7. No Emergency Handling
❌ Don't: Ignore urgent situations (especially medical)
✅ Do: Provide emergency contacts immediately

---

## Future Enhancements

### Template Versioning
- Track version number
- Allow template updates
- Migrate existing bots to new versions

### Intent Library
- Reusable intent definitions
- Cross-template intent sharing
- Community-contributed intents

### Dynamic Fields
- Conditional field visibility
- Field dependencies
- Calculated fields

### Advanced AI
- Multi-language support (Afrikaans, Zulu, etc.)
- Sentiment analysis for better handoff
- Learning from conversation outcomes

---

**Last Updated:** Week 5, 2025
**Templates Using These Patterns:** Medical, Real Estate, E-commerce, Taxi (4 of 20 complete)
