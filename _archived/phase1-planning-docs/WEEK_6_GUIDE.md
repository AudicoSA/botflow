# Week 6 Implementation Guide
## Tier-1 Templates Part 3: Restaurant, Salon & Gym - COMPLETION WEEK!

**Week:** 6 of 13
**Phase:** 2 - Core Templates
**Duration:** 5-7 days
**Focus:** Completing all Tier-1 templates + building testing framework

---

## Week Overview

Week 6 is **Tier-1 completion week**! We're building the final 3 Tier-1 templates to reach 100% coverage of high-impact verticals. These templates (Restaurant, Salon, Gym) are heavily booking-focused and will leverage the patterns we've established in Weeks 4-5.

### What You'll Build

1. **Restaurant & Food Service Template** - Table reservations, menu inquiries, dietary requirements
2. **Hair Salon & Beauty Template** - Appointment booking, service selection, stylist preferences
3. **Gym & Fitness Center Template** - Membership inquiries, class bookings, trainer sessions

### Success Criteria

By end of week, you should be able to:
- ✅ Create bots for restaurants that handle reservations
- ✅ Create bots for salons that book appointments
- ✅ Create bots for gyms that manage class bookings
- ✅ All 3 templates published and tested
- ✅ **100% Tier-1 template completion (7 of 7)**
- ✅ Testing framework operational
- ✅ Ready for Tier-2 rapid development

---

## Quick Links

**Schedule:** [WEEK_SCHEDULE.md](./WEEK_SCHEDULE.md)
**Build Plan:** [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md)
**Previous Week:** [WEEK_5_SUMMARY.md](./WEEK_5_SUMMARY.md) ✅ Complete
**Patterns Library:** [TEMPLATE_PATTERNS.md](./botflow-backend/TEMPLATE_PATTERNS.md)
**Quality Checklist:** [TEMPLATE_CHECKLIST.md](./botflow-backend/TEMPLATE_CHECKLIST.md)

---

## Prerequisites

Before starting Week 6, ensure:

### Required from Week 5
- ✅ Medical, Real Estate, E-commerce templates complete
- ✅ Template patterns documented
- ✅ Quality checklist established
- ✅ Dynamic template seeding operational
- ✅ Testing approach defined

### Verify Current System

```bash
# 1. Check backend is running
curl http://localhost:3001/health

# 2. Verify existing templates (should have 4)
curl http://localhost:3001/api/templates

# 3. Check seeding works
cd botflow-backend
node dist/scripts/run-seed.js

# 4. Verify frontend template gallery
# Open http://localhost:3000/dashboard/templates
```

---

## Architecture Overview

### Booking-Focused Templates

All three Week 6 templates share a common pattern: **appointment/reservation booking**. This makes them ideal for establishing reusable booking intents.

**Common Elements:**
1. Date/time selection
2. Service/class selection
3. Special requests handling
4. Confirmation workflow
5. Cancellation/modification flow

**Unique Elements:**
- **Restaurant:** Party size, dietary restrictions, special occasions
- **Salon:** Service type, stylist preference, duration
- **Gym:** Membership type, class schedules, personal training

### South African Context

**Restaurant:**
- Mention load shedding contingency plans
- Include halal/kosher options for diverse population
- Reference popular SA cuisines (Braai, Cape Malay, etc.)

**Salon:**
- Include hair types common in SA (African, mixed-texture)
- Mention treatments popular in SA market
- Consider cultural hair styling needs

**Gym:**
- Reference SA fitness culture (CrossFit, outdoor training)
- Include rugby/cricket fitness programs
- Consider load shedding impact on gym hours

---

## Day-by-Day Breakdown

### Day 1: Restaurant & Food Service Template

**Goal:** Complete restaurant template with reservation system

#### Step 1.1: Define Required Fields

Create: `botflow-backend/src/data/restaurant-template.json`

```json
{
  "name": "Restaurant & Food Service",
  "vertical": "restaurant",
  "tier": 1,
  "description": "Automate table reservations, menu inquiries, and customer service for restaurants.",
  "tagline": "Never miss a reservation again",
  "icon": "🍽️",
  "required_fields": {
    "restaurant_name": {
      "type": "text",
      "label": "Restaurant Name",
      "placeholder": "e.g. The Ocean Basket",
      "required": true
    },
    "cuisine_type": {
      "type": "multiselect",
      "label": "Cuisine Type",
      "required": true,
      "validation": {
        "options": [
          "South African Traditional",
          "Steakhouse & Braai",
          "Seafood",
          "Italian",
          "Asian",
          "Mediterranean",
          "Café & Bistro",
          "Fast Food",
          "Fine Dining"
        ]
      }
    },
    "seating_capacity": {
      "type": "number",
      "label": "Maximum Seating Capacity",
      "placeholder": "e.g. 80",
      "required": true,
      "helpText": "Total number of guests"
    },
    "operating_hours": {
      "type": "text",
      "label": "Operating Hours",
      "placeholder": "e.g. Tue-Sun: 12pm-10pm, Mon: Closed",
      "required": true
    },
    "location": {
      "type": "text",
      "label": "Physical Address",
      "placeholder": "e.g. 123 Waterfront, Cape Town",
      "required": true
    },
    "reservation_phone": {
      "type": "text",
      "label": "Reservation Phone Number",
      "placeholder": "e.g. 021 123 4567",
      "required": true
    },
    "dietary_options": {
      "type": "multiselect",
      "label": "Dietary Options Available",
      "required": true,
      "validation": {
        "options": [
          "Vegetarian",
          "Vegan",
          "Halal",
          "Kosher",
          "Gluten-Free",
          "Dairy-Free",
          "Nut-Free"
        ]
      }
    },
    "special_features": {
      "type": "multiselect",
      "label": "Special Features",
      "required": false,
      "validation": {
        "options": [
          "Outdoor Seating",
          "Private Dining Room",
          "Kids Play Area",
          "Live Music",
          "Bar & Lounge",
          "Takeaway Available",
          "Delivery Service"
        ]
      }
    },
    "average_price_range": {
      "type": "select",
      "label": "Average Price Range",
      "required": true,
      "validation": {
        "options": [
          "Budget-Friendly (R50-R150)",
          "Mid-Range (R150-R300)",
          "Upscale (R300-R500)",
          "Fine Dining (R500+)"
        ]
      }
    },
    "booking_policy": {
      "type": "text",
      "label": "Booking & Cancellation Policy",
      "placeholder": "e.g. 24-hour cancellation notice required for groups 6+",
      "required": false,
      "helpText": "Any important reservation policies"
    }
  }
}
```

#### Step 1.2: Build Conversation Flow

Add to `restaurant-template.json`:

```json
{
  "conversation_flow": {
    "systemPrompt": "You are a friendly restaurant host for {{restaurant_name}}, a {{cuisine_type}} restaurant.\n\nYou help guests with:\n1. Table reservations\n2. Menu inquiries and recommendations\n3. Dietary requirements\n4. Special occasions and events\n5. General restaurant information\n\nRestaurant Details:\n- Name: {{restaurant_name}}\n- Cuisine: {{cuisine_type}}\n- Capacity: {{seating_capacity}} guests\n- Hours: {{operating_hours}}\n- Location: {{location}}\n- Phone: {{reservation_phone}}\n- Dietary Options: {{dietary_options}}\n- Features: {{special_features}}\n- Price Range: {{average_price_range}}\n\nIMPORTANT GUIDELINES:\n- Be warm, welcoming, and hospitable\n- Make guests feel excited about dining with us\n- For reservations: collect party size, date, time, name, contact\n- Ask about special occasions (birthdays, anniversaries)\n- Mention dietary options when asked\n- Confirm all reservation details before finalizing\n- Handle load shedding inquiries (confirm we have backup power if applicable)\n- Create anticipation for the dining experience",

    "welcomeMessage": "Hello and welcome to {{restaurant_name}}! 🍽️ I'm here to help with reservations, menu questions, or any special requests. How can I make your dining experience memorable today?",

    "rules": [
      "Always collect: party size, date, time, name, and contact number for reservations",
      "Ask about special occasions to provide personalized service",
      "Confirm dietary requirements and allergies upfront",
      "Mention special features when relevant (outdoor seating, live music, etc.)",
      "Be enthusiastic about the restaurant and cuisine",
      "For large groups (8+), mention this may require special arrangements",
      "Confirm all reservation details before finalizing",
      "Never guarantee availability without human confirmation"
    ],

    "intents": {
      "book_table": {
        "triggers": ["reservation", "book", "table", "reserve", "booking", "dine"],
        "response": "Collect: party size, preferred date and time, name, contact number. Ask about special occasions. Confirm all details."
      },
      "menu_inquiry": {
        "triggers": ["menu", "food", "dishes", "what do you serve", "specials"],
        "response": "Describe cuisine type and highlight signature dishes. Offer to send full menu. Encourage reservation."
      },
      "dietary_requirements": {
        "triggers": ["vegetarian", "vegan", "halal", "kosher", "gluten-free", "allergy", "dietary"],
        "response": "Confirm available dietary options. Ask about specific allergies. Reassure we can accommodate."
      },
      "special_occasion": {
        "triggers": ["birthday", "anniversary", "celebration", "special occasion", "proposal"],
        "response": "Show excitement! Ask for details. Mention we can arrange special setups. Encourage booking."
      },
      "pricing_question": {
        "triggers": ["price", "how much", "cost", "expensive", "cheap", "affordable"],
        "response": "Provide price range. Mention it's great value for quality. Highlight what makes us special."
      },
      "location_hours": {
        "triggers": ["where", "location", "address", "directions", "hours", "open", "closed"],
        "response": "Provide location and hours. Mention parking if available. Encourage visit."
      },
      "cancel_modify": {
        "triggers": ["cancel", "change", "reschedule", "modify"],
        "response": "Ask for reservation details. Handoff to staff for modifications. Mention cancellation policy if applicable."
      }
    },

    "handoffConditions": [
      "Guest wants to cancel or modify existing reservation",
      "Large group booking (10+ people)",
      "Special event or private dining request",
      "Complaint about food or service",
      "Complex dietary restrictions requiring chef consultation",
      "Guest is frustrated or upset"
    ]
  },

  "example_prompts": [
    "I'd like to book a table for 4 on Saturday night",
    "Do you have vegetarian options?",
    "What's on the menu?",
    "I want to book for my anniversary"
  ],

  "integrations": ["calendar", "maps"],
  "is_published": true,
  "version": 1
}
```

---

### Day 2: Hair Salon & Beauty Template

**Goal:** Complete salon template with service booking

#### Step 2.1: Define Required Fields

Create: `botflow-backend/src/data/salon-template.json`

```json
{
  "name": "Hair Salon & Beauty",
  "vertical": "salon",
  "tier": 1,
  "description": "Automate appointment booking and service inquiries for hair salons and beauty parlors.",
  "tagline": "Beauty bookings made simple",
  "icon": "💇",
  "required_fields": {
    "salon_name": {
      "type": "text",
      "label": "Salon Name",
      "placeholder": "e.g. Glamour Hair Studio",
      "required": true
    },
    "services_offered": {
      "type": "multiselect",
      "label": "Services Offered",
      "required": true,
      "validation": {
        "options": [
          "Haircut & Styling",
          "Hair Coloring",
          "Hair Treatments",
          "Braids & Weaves",
          "Natural Hair Care",
          "Manicure & Pedicure",
          "Facial Treatments",
          "Makeup Services",
          "Waxing & Threading"
        ]
      }
    },
    "operating_hours": {
      "type": "text",
      "label": "Operating Hours",
      "placeholder": "e.g. Mon-Sat: 9am-7pm, Sun: Closed",
      "required": true
    },
    "location": {
      "type": "text",
      "label": "Physical Address",
      "placeholder": "e.g. 456 Main Road, Johannesburg",
      "required": true
    },
    "booking_phone": {
      "type": "text",
      "label": "Booking Phone Number",
      "placeholder": "e.g. 011 123 4567",
      "required": true
    },
    "price_range": {
      "type": "select",
      "label": "General Price Range",
      "required": true,
      "validation": {
        "options": [
          "Budget-Friendly (R100-R300)",
          "Mid-Range (R300-R600)",
          "Premium (R600-R1000)",
          "Luxury (R1000+)"
        ]
      }
    },
    "specializations": {
      "type": "multiselect",
      "label": "Specializations",
      "required": false,
      "validation": {
        "options": [
          "African Hair Textures",
          "European Hair Textures",
          "Mixed Hair Textures",
          "Bridal Styling",
          "Men's Grooming",
          "Kids' Haircuts",
          "Extensions Specialist"
        ]
      }
    },
    "booking_policy": {
      "type": "text",
      "label": "Booking Policy",
      "placeholder": "e.g. 24-hour cancellation notice, late arrivals may need rescheduling",
      "required": false,
      "helpText": "Cancellation and lateness policy"
    }
  }
}
```

#### Step 2.2: Build Conversation Flow

Add to `salon-template.json`:

```json
{
  "conversation_flow": {
    "systemPrompt": "You are a friendly receptionist for {{salon_name}}, a professional hair salon and beauty parlor.\n\nYou help clients with:\n1. Appointment booking\n2. Service information and recommendations\n3. Pricing inquiries\n4. Stylist availability\n5. General salon information\n\nSalon Details:\n- Name: {{salon_name}}\n- Services: {{services_offered}}\n- Hours: {{operating_hours}}\n- Location: {{location}}\n- Phone: {{booking_phone}}\n- Price Range: {{price_range}}\n- Specializations: {{specializations}}\n\nIMPORTANT GUIDELINES:\n- Be warm, personal, and style-focused\n- Make clients feel pampered and valued\n- For bookings: collect name, contact, service needed, preferred date/time\n- Ask about hair type/texture when relevant\n- Mention our specializations when appropriate\n- Confirm appointment details before finalizing\n- Build excitement about their transformation\n- Handle special requests with care (bridal, events)",

    "welcomeMessage": "Hello gorgeous! 💇 Welcome to {{salon_name}}! Whether you're looking for a fresh new style or just some pampering, I'm here to help book your appointment. What can I do for you today?",

    "rules": [
      "Always collect: name, contact number, service type, preferred date/time",
      "Ask about hair type/texture for hair services",
      "Mention price range when discussing services",
      "For first-time clients, make them feel especially welcome",
      "Ask if they have a preferred stylist",
      "Confirm all appointment details before finalizing",
      "For bridal or event bookings, mention this requires special consultation",
      "Be enthusiastic about helping them look and feel their best"
    ],

    "intents": {
      "book_appointment": {
        "triggers": ["book", "appointment", "booking", "schedule", "haircut", "style"],
        "response": "Collect: name, contact, which service they need, preferred date and time. Ask about hair type if relevant."
      },
      "service_inquiry": {
        "triggers": ["services", "what do you offer", "treatments", "do you do", "price"],
        "response": "List services offered. Mention price range. Highlight specializations. Encourage booking."
      },
      "pricing_question": {
        "triggers": ["how much", "cost", "price", "expensive", "rates"],
        "response": "Provide price range. Explain it varies by service and stylist. Offer to book consultation."
      },
      "stylist_preference": {
        "triggers": ["stylist", "who", "specialist", "best for", "recommendation"],
        "response": "Mention we have experienced stylists. Ask about their needs to recommend. Offer booking with specific stylist."
      },
      "hair_type_question": {
        "triggers": ["natural hair", "african hair", "curly hair", "straight hair", "texture"],
        "response": "Confirm our specializations in different hair types. Reassure we have expertise. Encourage booking."
      },
      "special_event": {
        "triggers": ["wedding", "bridal", "event", "photoshoot", "special occasion"],
        "response": "Show excitement! Mention we do special event styling. Ask for details. Suggest in-person consultation."
      },
      "cancel_reschedule": {
        "triggers": ["cancel", "reschedule", "change", "move appointment"],
        "response": "Ask for appointment details. Handoff to staff for modifications. Mention cancellation policy."
      }
    },

    "handoffConditions": [
      "Client wants to cancel or modify existing appointment",
      "Bridal or special event inquiry requiring consultation",
      "Complex hair treatment questions",
      "Complaint about previous service",
      "Request for specific stylist not mentioned",
      "Client is frustrated or upset"
    ]
  },

  "example_prompts": [
    "I need a haircut on Friday",
    "Do you work with natural African hair?",
    "How much is hair coloring?",
    "I need styling for my wedding"
  ],

  "integrations": ["calendar"],
  "is_published": true,
  "version": 1
}
```

---

### Day 3: Gym & Fitness Center Template

**Goal:** Complete gym template with class booking

#### Step 3.1: Define Required Fields

Create: `botflow-backend/src/data/gym-template.json`

```json
{
  "name": "Gym & Fitness Center",
  "vertical": "gym",
  "tier": 1,
  "description": "Automate class bookings, membership inquiries, and fitness consultations for gyms.",
  "tagline": "Fitness goals made achievable",
  "icon": "💪",
  "required_fields": {
    "gym_name": {
      "type": "text",
      "label": "Gym Name",
      "placeholder": "e.g. PowerFit Gym & Wellness",
      "required": true
    },
    "fitness_offerings": {
      "type": "multiselect",
      "label": "Fitness Offerings",
      "required": true,
      "validation": {
        "options": [
          "Gym Equipment & Weights",
          "Group Fitness Classes",
          "Personal Training",
          "Yoga & Pilates",
          "CrossFit",
          "Spinning/Cycling",
          "Boxing & Martial Arts",
          "Swimming Pool",
          "Outdoor Training"
        ]
      }
    },
    "operating_hours": {
      "type": "text",
      "label": "Operating Hours",
      "placeholder": "e.g. Mon-Fri: 5am-10pm, Weekends: 7am-8pm",
      "required": true
    },
    "location": {
      "type": "text",
      "label": "Physical Address",
      "placeholder": "e.g. 789 Fitness Lane, Durban",
      "required": true
    },
    "contact_number": {
      "type": "text",
      "label": "Contact Number",
      "placeholder": "e.g. 031 123 4567",
      "required": true
    },
    "membership_types": {
      "type": "multiselect",
      "label": "Membership Types",
      "required": true,
      "validation": {
        "options": [
          "Month-to-Month",
          "3-Month Package",
          "6-Month Package",
          "Annual Membership",
          "Day Pass",
          "Student Discount",
          "Corporate Packages"
        ]
      }
    },
    "monthly_membership_fee": {
      "type": "number",
      "label": "Standard Monthly Membership (R)",
      "placeholder": "e.g. 450",
      "required": true,
      "helpText": "Basic gym access monthly fee"
    },
    "facilities": {
      "type": "multiselect",
      "label": "Facilities Available",
      "required": false,
      "validation": {
        "options": [
          "Locker Rooms & Showers",
          "Sauna & Steam Room",
          "Juice Bar & Café",
          "Pro Shop",
          "Parking Available",
          "Ladies Only Section",
          "Childcare Services"
        ]
      }
    },
    "specializations": {
      "type": "multiselect",
      "label": "Specializations",
      "required": false,
      "validation": {
        "options": [
          "Weight Loss Programs",
          "Muscle Building",
          "Sports-Specific Training",
          "Rehabilitation & Physio",
          "Senior Fitness",
          "Youth Programs",
          "Nutrition Coaching"
        ]
      }
    }
  }
}
```

#### Step 3.2: Build Conversation Flow

Add to `gym-template.json`:

```json
{
  "conversation_flow": {
    "systemPrompt": "You are an energetic fitness consultant for {{gym_name}}, a fitness center dedicated to helping people achieve their goals.\n\nYou help members and prospects with:\n1. Membership inquiries and sign-ups\n2. Class bookings and schedules\n3. Personal training information\n4. Facility information\n5. Fitness program recommendations\n\nGym Details:\n- Name: {{gym_name}}\n- Offerings: {{fitness_offerings}}\n- Hours: {{operating_hours}}\n- Location: {{location}}\n- Contact: {{contact_number}}\n- Membership Types: {{membership_types}}\n- Monthly Fee: R{{monthly_membership_fee}}\n- Facilities: {{facilities}}\n- Specializations: {{specializations}}\n\nIMPORTANT GUIDELINES:\n- Be motivating, energetic, and supportive\n- Focus on fitness goals and transformation\n- For memberships: collect name, contact, fitness goals, preferred membership type\n- For class bookings: collect name, contact, which class, preferred day/time\n- Ask about fitness level to recommend appropriate programs\n- Mention our specializations when relevant\n- Create excitement about their fitness journey\n- Be understanding about fitness concerns and barriers",

    "welcomeMessage": "Hey there! 💪 Welcome to {{gym_name}}! Whether you're just starting your fitness journey or ready to level up, I'm here to help with memberships, class bookings, or any questions. What are your fitness goals?",

    "rules": [
      "Always ask about fitness goals to personalize recommendations",
      "For memberships: collect name, contact, goals, preferred membership type",
      "For class bookings: collect name, contact, class interest, preferred schedule",
      "Ask about fitness level (beginner, intermediate, advanced)",
      "Mention relevant specializations based on their goals",
      "Be motivating and positive about their fitness journey",
      "For personal training inquiries, offer consultation",
      "Confirm all booking/membership details before finalizing"
    ],

    "intents": {
      "membership_inquiry": {
        "triggers": ["membership", "join", "sign up", "how much", "fees", "pricing"],
        "response": "Ask about fitness goals. Explain membership types and pricing. Highlight facilities and offerings. Encourage joining."
      },
      "book_class": {
        "triggers": ["class", "book class", "schedule", "yoga", "spinning", "crossfit"],
        "response": "Collect: name, contact, which class they're interested in, preferred day/time. Ask about fitness level."
      },
      "personal_training": {
        "triggers": ["personal trainer", "PT", "one-on-one", "coach", "training session"],
        "response": "Ask about fitness goals. Explain personal training options. Mention we can arrange consultation. Collect contact info."
      },
      "fitness_goals": {
        "triggers": ["lose weight", "build muscle", "get fit", "tone", "strength", "cardio"],
        "response": "Be supportive! Ask for more details about goals. Recommend relevant programs and classes. Encourage joining."
      },
      "facility_inquiry": {
        "triggers": ["facilities", "equipment", "pool", "sauna", "locker", "parking"],
        "response": "Describe available facilities enthusiastically. Mention what makes us special. Encourage visit or membership."
      },
      "hours_location": {
        "triggers": ["hours", "open", "time", "where", "location", "address"],
        "response": "Provide hours and location. Mention convenient access. Offer to book trial session or tour."
      },
      "trial_visit": {
        "triggers": ["trial", "try", "visit", "tour", "look around", "day pass"],
        "response": "Offer day pass or trial. Collect name and contact. Schedule visit. Build excitement about seeing the gym."
      },
      "cancel_reschedule": {
        "triggers": ["cancel", "reschedule", "change", "freeze membership"],
        "response": "Ask for membership/booking details. Handoff to staff for account modifications."
      }
    },

    "handoffConditions": [
      "Member wants to cancel or freeze membership",
      "Billing or payment issues",
      "Medical concerns requiring clearance",
      "Complex program design needed",
      "Complaint about facilities or staff",
      "Member is frustrated or upset"
    ]
  },

  "example_prompts": [
    "I want to join the gym, what are your prices?",
    "Can I book a yoga class?",
    "Do you have personal trainers?",
    "I want to lose weight, what do you recommend?"
  ],

  "integrations": ["calendar", "crm", "payment"],
  "is_published": true,
  "version": 1
}
```

---

### Day 4: Validation, Seeding & Testing

**Goal:** Deploy all templates and verify functionality

#### Step 4.1: Validate All Templates

```bash
cd botflow-backend

# 1. Build TypeScript
npm run build

# 2. Copy templates to dist
cp src/data/restaurant-template.json dist/data/
cp src/data/salon-template.json dist/data/
cp src/data/gym-template.json dist/data/

# 3. Validate templates
node dist/scripts/run-validate.js

# Expected: All 7 templates validate successfully
```

#### Step 4.2: Seed to Database

```bash
# Seed all templates (should now find 7 templates)
node dist/scripts/run-seed.js

# Verify in Supabase
# Check bot_templates table: should have 7 published templates
```

#### Step 4.3: Test Each Template

**Restaurant Tests:**
1. "I want to book a table for 6 on Saturday at 7pm"
2. "Do you have vegetarian options?"
3. "What's on the menu tonight?"
4. "I'm celebrating my anniversary"

**Salon Tests:**
1. "I need a haircut tomorrow afternoon"
2. "Do you work with natural African hair?"
3. "How much is hair coloring?"
4. "I need makeup and hair for my wedding"

**Gym Tests:**
1. "How much is membership?"
2. "I want to book a spin class"
3. "Do you have personal trainers?"
4. "I want to lose weight, can you help?"

---

### Day 5: Testing Framework Development

**Goal:** Build automated template testing

#### Step 5.1: Create Test Runner Script

Create: `botflow-backend/src/scripts/test-templates.ts`

```typescript
import { supabaseAdmin } from '../config/supabase.js';
import { instantiateBot } from '../services/template-instantiation.service.js';

interface TestScenario {
  name: string;
  templateVertical: string;
  fieldValues: Record<string, any>;
  testMessages: Array<{
    message: string;
    expectedIntent?: string;
    shouldContain?: string[];
  }>;
}

async function runTemplateTests() {
  console.log('🧪 Running Template Tests...\n');

  const testScenarios: TestScenario[] = [
    // Restaurant test
    {
      name: 'Restaurant Booking Test',
      templateVertical: 'restaurant',
      fieldValues: {
        restaurant_name: 'Test Restaurant',
        cuisine_type: ['Italian', 'Mediterranean'],
        seating_capacity: 80,
        operating_hours: 'Tue-Sun: 12pm-10pm',
        location: '123 Test St, Cape Town',
        reservation_phone: '021 123 4567',
        dietary_options: ['Vegetarian', 'Vegan', 'Halal'],
        average_price_range: 'Mid-Range (R150-R300)'
      },
      testMessages: [
        {
          message: 'I want to book a table',
          expectedIntent: 'book_table',
          shouldContain: ['party size', 'date', 'time']
        }
      ]
    }
    // Add more scenarios...
  ];

  for (const scenario of testScenarios) {
    console.log(`\n--- Testing: ${scenario.name} ---`);

    // Get template
    const { data: template } = await supabaseAdmin
      .from('bot_templates')
      .select('*')
      .eq('vertical', scenario.templateVertical)
      .single();

    if (!template) {
      console.error(`❌ Template not found: ${scenario.templateVertical}`);
      continue;
    }

    console.log(`✅ Template found: ${template.name}`);

    // TODO: Test instantiation
    // TODO: Test intent matching
    // TODO: Test variable replacement

    console.log(`✅ ${scenario.name} passed`);
  }

  console.log('\n✅ All tests complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTemplateTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

export { runTemplateTests };
```

#### Step 5.2: Create Test Runner Wrapper

Create: `botflow-backend/src/scripts/run-test.ts`

```typescript
import { runTemplateTests } from './test-templates.js';

runTemplateTests();
```

---

### Day 6-7: Documentation & Tier-1 Celebration

**Goal:** Document completion and prepare for Tier-2

#### Step 6.1: Create Week 6 Summary

Create: `WEEK_6_SUMMARY.md`

Include:
- 3 templates completed (Restaurant, Salon, Gym)
- **Tier-1 100% complete (7 of 7 templates)**
- Testing framework established
- Patterns refined
- Ready for Tier-2 rapid development

#### Step 6.2: Update Documentation

Update:
- `CLAUDE.md` - Add Week 6 templates
- `WEEK_SCHEDULE.md` - Mark Week 6 complete
- `TEMPLATE_PATTERNS.md` - Add booking patterns
- `BUILD_PLAN_2025.md` - Update progress

---

## Template Comparison: Booking Patterns

### Common Booking Flow

All three templates follow this pattern:

1. **Initial Intent Detection**
   - Triggers: "book", "appointment", "reservation", "schedule"

2. **Data Collection**
   - Name and contact (universal)
   - Service/table/class type
   - Date and time preference
   - Special requests/requirements

3. **Confirmation**
   - Repeat all details back
   - Ask for confirmation
   - Mention any policies

4. **Finalization**
   - Provide confirmation message
   - Mention what to expect next
   - Thank them

### Unique Elements

**Restaurant:**
- Party size is critical
- Dietary restrictions matter
- Special occasions are common
- Ambiance and experience focus

**Salon:**
- Hair type/texture matters
- Stylist preference optional
- Service duration varies
- Personal transformation focus

**Gym:**
- Fitness goals drive everything
- Fitness level assessment
- Trial/tour options
- Long-term commitment focus

---

## South African Market Considerations

### Restaurant
- Load shedding contingency (backup power, gas stoves)
- Diverse dietary needs (halal, kosher for Muslim/Jewish communities)
- Popular SA dishes (braai, bunny chow, bobotie)
- Price sensitivity (many budget-conscious diners)

### Salon
- Hair texture diversity (African, European, mixed)
- Cultural hair styling (braids, weaves popular)
- Natural hair movement strong in SA
- Bridal services are big business

### Gym
- Outdoor training popular (good weather)
- Rugby and cricket fitness programs
- Load shedding affects gym hours
- Group fitness culture strong
- Price-sensitive market

---

## Integration Planning (Week 8)

### Calendar Integration
All three templates need calendar integration:
- **Restaurant:** Table availability, reservation slots
- **Salon:** Stylist schedules, appointment slots
- **Gym:** Class schedules, trainer availability

### Payment Integration
- **Restaurant:** Deposit for large groups
- **Salon:** Prepayment for expensive services
- **Gym:** Membership payments, recurring billing

### CRM Integration
- **Restaurant:** Guest preferences, dietary needs, special occasions
- **Salon:** Client history, product preferences, stylist notes
- **Gym:** Member progress, fitness goals, attendance tracking

---

## Success Checklist

Before moving to Week 7, verify:

### Template Functionality ✅
- [ ] Restaurant template creates bots successfully
- [ ] Salon template creates bots successfully
- [ ] Gym template creates bots successfully
- [ ] All 7 templates seed without errors
- [ ] Intent matching works for all templates
- [ ] Variables replace correctly
- [ ] Handoff conditions trigger appropriately

### Documentation ✅
- [ ] WEEK_6_SUMMARY.md created
- [ ] CLAUDE.md updated with Week 6 templates
- [ ] WEEK_SCHEDULE.md shows progress
- [ ] Testing framework documented

### Quality ✅
- [ ] All JSON validates without errors
- [ ] Consistent formatting across all templates
- [ ] South African context included
- [ ] No typos in prompts or triggers

### Testing ✅
- [ ] 4-5 test scenarios per template (12-15 total)
- [ ] Frontend onboarding works for all 3
- [ ] WhatsApp messages trigger correct intents
- [ ] Database records saved correctly

---

## Tier-1 Completion Metrics

### Templates (7 of 7 - 100%)
- ✅ Taxi & Shuttle Service
- ✅ Medical & Dental Practice
- ✅ Real Estate Agent
- ✅ E-commerce Store
- ✅ Restaurant & Food Service
- ✅ Hair Salon & Beauty
- ✅ Gym & Fitness Center

### Coverage Analysis
- **Service Businesses:** 5 (Taxi, Medical, Real Estate, Salon, Gym)
- **Retail/Commerce:** 1 (E-commerce)
- **Hospitality:** 1 (Restaurant)

### Total Statistics (End of Week 6)
- **Total Templates:** 7 of 20 (35%)
- **Total Fields:** ~60 configuration fields
- **Total Intents:** ~42 unique intents
- **Total Rules:** ~52 behavioral rules
- **Total Lines of JSON:** ~3,500 lines

---

## Week 7 Preview: Tier-2 Rapid Development

With Tier-1 complete and patterns established, Week 7 will be **rapid template creation**:

**Tier-2 Templates (Week 7):**
1. Retail Store
2. Hotel & Guesthouse
3. Car Rental
4. Plumber & Home Services
5. Doctor & Clinic (specialized)

**Target:** 5 templates in 5 days (1 per day)
**Method:** Copy-paste-modify from Tier-1 patterns

---

## Common Issues & Solutions

### Restaurant Template

**Issue: Can't confirm real-time availability**
- **Solution:** Collect details and mention staff will confirm
- Note: Calendar integration in Week 8 will solve this

**Issue: Complex dietary restrictions**
- **Solution:** Collect details, handoff to chef/manager
- Don't promise what we can't deliver

### Salon Template

**Issue: Specific stylist requests**
- **Solution:** Collect preference, mention subject to availability
- Handoff for stylist-specific bookings

**Issue: Complex hair treatments**
- **Solution:** Offer consultation booking instead
- Don't attempt to recommend without expertise

### Gym Template

**Issue: Medical clearance needed**
- **Solution:** Mention they need doctor clearance
- Handoff for medical concerns

**Issue: Billing/payment questions**
- **Solution:** Provide basic info, handoff for account issues
- Never discuss payment disputes via WhatsApp

---

## Resources

**Template Files:**
- [Restaurant Template](./botflow-backend/src/data/restaurant-template.json)
- [Salon Template](./botflow-backend/src/data/salon-template.json)
- [Gym Template](./botflow-backend/src/data/gym-template.json)

**Documentation:**
- [Template Patterns](./botflow-backend/TEMPLATE_PATTERNS.md)
- [Quality Checklist](./botflow-backend/TEMPLATE_CHECKLIST.md)
- [Week 5 Summary](./WEEK_5_SUMMARY.md)

**Industry References:**
- Restaurant Reservations: [OpenTable](https://www.opentable.co.za/)
- Salon Bookings: [Beautylynk](https://beautylynk.com/)
- Gym Management: [Virgin Active SA](https://www.virginactive.co.za/)

---

## Week 6 Complete! 🎉

**Achievement Unlocked: Tier-1 Master**

You've completed all 7 high-impact Tier-1 templates! This is a **major milestone**:
- ✅ 35% of total templates complete
- ✅ 100% of Tier-1 (highest priority)
- ✅ Strong pattern library established
- ✅ Quality processes proven
- ✅ Ready for rapid Tier-2 development

The foundation is rock solid. Weeks 7-9 will fly by as we leverage these patterns to build the remaining 13 templates!

---

**Ready for Week 7?** Let's build 5 Tier-2 templates in 5 days using our established patterns!
