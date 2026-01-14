
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
    slug: 'ecommerce',
    title: 'eCommerce Automation Bot',
    shortDescription: 'Boost sales and recover abandoned carts on WhatsApp.',
    fullDescription: 'The ultimate eCommerce companion. Seamlessly connects with your store to automate order updates, recover abandoned carts, and answer product queries instantly.',
    icon: 'ShoppingBag',
    image: '/icons/ecommerce.png',
    integrations: ['Shopify', 'WooCommerce', 'ShipLogic', 'n8n'],
    features: [
      'Abandoned Cart Recovery',
      'Order Status Updates',
      'Product Recommendation Engine',
      'Instant Customer Support'
    ]
  },
  {
    slug: 'customer-support',
    title: '24/7 Customer Support',
    shortDescription: 'Instant answers for your customers, day or night.',
    fullDescription: 'Reduce support ticket volume by up to 80%. This bot handles FAQs, ticket creation, and handoffs to human agents when complex issues arise.',
    icon: 'Headphones',
    image: '/icons/support.png',
    integrations: ['Zendesk', 'HubSpot', 'Salesforce', 'n8n'],
    features: [
      'Smart FAQ Answering',
      'Ticket Creation & Management',
      'Human Handover Protocol',
      'Multi-language Support'
    ]
  },
  {
    slug: 'real-estate',
    title: 'Real Estate Agent',
    shortDescription: 'Qualify leads and schedule viewings automatically.',
    fullDescription: 'Never miss a lead. Engage potential buyers instantly, qualify their needs, and schedule viewings directly into your calendar.',
    icon: 'Home',
    image: '/icons/real-estate.png',
    integrations: ['Calendly', 'Google Calendar', 'Airtable', 'n8n'],
    features: [
      'Lead Qualification Flow',
      'Automated Viewing Scheduling',
      'Property Matching',
      'Follow-up Campaigns'
    ]
  },
  {
    slug: 'appointment-booking',
    title: 'Appointment Booking',
    shortDescription: 'Streamline scheduling for clinics, salons, and consultants.',
    fullDescription: 'Eliminate the back-and-forth of finding a time. Let your clients book slots that sync perfectly with your availability.',
    icon: 'Calendar',
    image: '/icons/booking.png',
    integrations: ['Google Calendar', 'Outlook', 'Zoom', 'n8n'],
    features: [
      'Real-time Availability Sync',
      'Rescheduling & Cancellations',
      'Reminders & Notifications',
      'Payment Collection'
    ]
  },
  {
    slug: 'lead-generation',
    title: 'Lead Generation Pro',
    shortDescription: 'Capture and qualify leads from Facebook & Instagram ads.',
    fullDescription: 'Turn ad clicks into conversations. Engage prospects immediately, gather requirements, and sync qualified leads to your CRM.',
    icon: 'Target',
    image: '/icons/lead-gen.png',
    integrations: ['Meta Ads', 'HubSpot', 'Mailchimp', 'n8n'],
    features: [
      'Instant Lead Engagement',
      'Data Collection Forms',
      'CRM Synchronization',
      'Drip Campaigns'
    ]
  },
  {
    slug: 'hr-recruitment',
    title: 'HR & Recruitment',
    shortDescription: 'Screen candidates and schedule interviews effortlessy.',
    fullDescription: 'Automate the initial screening process. Collect resumes, ask screening questions, and schedule interviews with top candidates.',
    icon: 'Users',
    image: '/icons/hr.png',
    integrations: ['Greenhouse', 'BambooHR', 'Google Drive', 'n8n'],
    features: [
      'Candidate Screening Questions',
      'Resume Upload Handling',
      'Interview Scheduling',
      'Application Status Updates'
    ]
  },
  {
    slug: 'shuttle-service',
    title: 'Shuttle & Travel Booking',
    shortDescription: 'Automate bookings, pickups, and driver notifications.',
    fullDescription: 'Perfect for shuttle services, tour operators, and private drivers. Handle bookings, send location pins, and notify drivers automatically via WhatsApp.',
    icon: 'Bus',
    image: '/icons/shuttle.png',
    integrations: ['Google Maps', 'Stripe', 'Twilio', 'n8n'],
    features: [
      'Visual Seat Booking',
      'Location Sharing & Pickup Coordination',
      'Driver Dispatch Notifications',
      'Payment Links'
    ]
  }
];
