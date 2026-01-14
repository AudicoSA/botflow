
export interface Template {
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  icon: string; // Lucide icon name or image path
  image: string;
  integrations: string[];
  features: string[];
}

export const templates: Template[] = [
  {
    "slug": "accountant",
    "title": "Accountant Assistant",
    "shortDescription": "Efficient bookkeeping and tax support",
    "fullDescription": "Automate appointment scheduling, document collection, and basic tax inquiries for accounting firms.",
    "icon": "Calculator",
    "image": "/icons/accountant.png",
    "integrations": ["calendar", "crm"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "airbnb",
    "title": "Airbnb & Short-term Rental",
    "shortDescription": "5-star guest communication automated",
    "fullDescription": "Automate guest check-ins, house rules, WiFi details, and local recommendations for Airbnb hosts.",
    "icon": "Home",
    "image": "/icons/real-estate.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "auto-mechanic",
    "title": "Auto Mechanic & Repair Shop",
    "shortDescription": "Keep your garage running smoothly",
    "fullDescription": "Automate service bookings, status updates on car repairs, and price estimates for mechanics.",
    "icon": "Wrench",
    "image": "/icons/mechanic.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "car-rental",
    "title": "Car Rental Agent",
    "shortDescription": "Drive away with easy bookings",
    "fullDescription": "Automate vehicle availability checks, rental bookings, and FAQ answers for car rental agencies.",
    "icon": "Car",
    "image": "/icons/car.png",
    "integrations": ["calendar", "maps"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "cleaning",
    "title": "Cleaning Service",
    "shortDescription": "Sparkling clean homes, automated",
    "fullDescription": "Automate cleaning quotes, scheduling, and service area checks for cleaning businesses.",
    "icon": "Sparkles",
    "image": "/icons/cleaning.png",
    "integrations": ["calendar", "maps"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "customer-support",
    "title": "24/7 Customer Support",
    "shortDescription": "Instant answers for your customers, day or night.",
    "fullDescription": "Reduce support ticket volume by up to 80%. This bot handles FAQs, ticket creation, and handoffs to human agents when complex issues arise.",
    "icon": "Headphones",
    "image": "/icons/support.png",
    "integrations": ["Zendesk", "HubSpot", "Salesforce", "n8n"],
    "features": [
      "Smart FAQ Answering",
      "Ticket Creation & Management",
      "Human Handover Protocol",
      "Multi-language Support"
    ]
  },
  {
    "slug": "doctor",
    "title": "Doctor & Medical Practice",
    "shortDescription": "Caring for patients, automated",
    "fullDescription": "Automate patient appointments, clinic hours inquiries, and basic triage for medical practices.",
    "icon": "Stethoscope",
    "image": "/icons/health.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "ecommerce",
    "title": "eCommerce Automation Bot",
    "shortDescription": "Boost sales and recover abandoned carts on WhatsApp.",
    "fullDescription": "The ultimate eCommerce companion. Seamlessly connects with your store to automate order updates, recover abandoned carts, and answer product queries instantly.",
    "icon": "ShoppingBag",
    "image": "/icons/ecommerce.png",
    "integrations": ["Shopify", "WooCommerce", "ShipLogic", "n8n"],
    "features": [
      "Abandoned Cart Recovery",
      "Order Status Updates",
      "Product Recommendation Engine",
      "Instant Customer Support"
    ]
  },
  {
    "slug": "example-taxi",
    "title": "Taxi Booking Assistant",
    "shortDescription": "Get more rides, less hassle.",
    "fullDescription": "Automate ride bookings, price quotes, and location confirmations/pickups for taxi services.",
    "icon": "Bus",
    "image": "/icons/shuttle.png",
    "integrations": ["maps", "calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "gym",
    "title": "Gym & Fitness Studio",
    "shortDescription": "Stronger member engagement",
    "fullDescription": "Automate class bookings, membership inquiries, and facility hours for gyms and fitness studios.",
    "icon": "Dumbbell",
    "image": "/icons/gym.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "hotel",
    "title": "Hotel Concierge",
    "shortDescription": "Premium guest experiences",
    "fullDescription": "Automate room service requests, booking inquiries, and hotel amenity info for hotels.",
    "icon": "Building",
    "image": "/icons/hotel.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "hr-recruitment",
    "title": "HR & Recruitment",
    "shortDescription": "Screen candidates and schedule interviews effortlessy.",
    "fullDescription": "Automate the initial screening process. Collect resumes, ask screening questions, and schedule interviews with top candidates.",
    "icon": "Users",
    "image": "/icons/hr.png",
    "integrations": ["Greenhouse", "BambooHR", "Google Drive", "n8n"],
    "features": [
      "Candidate Screening Questions",
      "Resume Upload Handling",
      "Interview Scheduling",
      "Application Status Updates"
    ]
  },
  {
    "slug": "lawyer",
    "title": "Law Firm & Legal Services",
    "shortDescription": "Professional legal intake",
    "fullDescription": "Automate client intake, consultation bookings, and practice area inquiries for law firms.",
    "icon": "Scale",
    "image": "/icons/legal.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "lead-generation",
    "title": "Lead Generation Pro",
    "shortDescription": "Capture and qualify leads from Facebook & Instagram ads.",
    "fullDescription": "Turn ad clicks into conversations. Engage prospects immediately, gather requirements, and sync qualified leads to your CRM.",
    "icon": "Target",
    "image": "/icons/lead-gen.png",
    "integrations": ["Meta Ads", "HubSpot", "Mailchimp", "n8n"],
    "features": [
      "Instant Lead Engagement",
      "Data Collection Forms",
      "CRM Synchronization",
      "Drip Campaigns"
    ]
  },
  {
    "slug": "medical",
    "title": "Medical Specialist",
    "shortDescription": "Specialized care coordination",
    "fullDescription": "Automate procedure inquiries, pre-op instructions, and appointment scheduling for specialists.",
    "icon": "Stethoscope",
    "image": "/icons/health.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "plumber",
    "title": "Plumber & Trades",
    "shortDescription": "Fix problems faster",
    "fullDescription": "Automate emergency callouts, service quotes, and availability checks for plumbers.",
    "icon": "Wrench",
    "image": "/icons/plumber.png",
    "integrations": ["calendar", "maps"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "real-estate",
    "title": "Real Estate Agent",
    "shortDescription": "Qualify leads and schedule viewings automatically.",
    "fullDescription": "Never miss a lead. Engage potential buyers instantly, qualify their needs, and schedule viewings directly into your calendar.",
    "icon": "Home",
    "image": "/icons/real-estate.png",
    "integrations": ["Calendly", "Google Calendar", 'Airtable', 'n8n'],
    "features": [
      "Lead Qualification Flow",
      "Automated Viewing Scheduling",
      "Property Matching",
      "Follow-up Campaigns"
    ]
  },
  {
    "slug": "restaurant",
    "title": "Restaurant & Cafe",
    "shortDescription": "Delicious dining made easy",
    "fullDescription": "Automate table reservations, menu inquiries, and opening hours info for restaurants.",
    "icon": "Utensils",
    "image": "/icons/restaurant.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "retail",
    "title": "Retail Store",
    "shortDescription": "Shop smarter",
    "fullDescription": "Automate product availability checks, store hours, and return policy questions for retail stores.",
    "icon": "ShoppingBag",
    "image": "/icons/ecommerce.png",
    "integrations": ["maps"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "salon",
    "title": "Salon & Beauty",
    "shortDescription": "Beautifully simple bookings",
    "fullDescription": "Automate treatment bookings, price list inquiries, and stylist availability for salons.",
    "icon": "Scissors",
    "image": "/icons/salon.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "shuttle-service",
    "title": "Shuttle & Transport",
    "shortDescription": "Seamless travel coordination",
    "fullDescription": "Perfect for shuttle services, tour operators, and private drivers. Handle bookings, send location pins, and notify drivers.",
    "icon": "Bus",
    "image": "/icons/shuttle.png",
    "integrations": ["Google Maps", "Stripe", "Twilio", "n8n"],
    "features": [
      "Visual Seat Booking",
      "Location Sharing & Pickup Coordination",
      "Driver Dispatch Notifications",
      "Payment Links"
    ]
  },
  {
    "slug": "travel-agency",
    "title": "Travel Agency",
    "shortDescription": "Your dream trip awaits",
    "fullDescription": "Automate destination inquiries, package quotes, and visa info for travel agencies.",
    "icon": "Plane",
    "image": "/icons/travel.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "tutor",
    "title": "Tutor & Private Teacher",
    "shortDescription": "Personalized learning, simplified booking",
    "fullDescription": "Automate lesson bookings, subject inquiries, and tutoring session scheduling for private tutors.",
    "icon": "GraduationCap",
    "image": "/icons/education.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  },
  {
    "slug": "veterinarian",
    "title": "Veterinarian & Animal Clinic",
    "shortDescription": "Compassionate care for furry friends",
    "fullDescription": "Automate pet appointments, emergency triage, and veterinary service inquiries for clinics.",
    "icon": "Heart",
    "image": "/icons/vet.png",
    "integrations": ["calendar"],
    "features": ["Automated Responses", "24/7 Availability", "Data Collection", "Seamless Handover"]
  }
];
