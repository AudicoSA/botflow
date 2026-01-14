
const fs = require('fs');
const path = require('path');

const dataDir = 'c:\\Users\\kenny\\OneDrive\\Whatsapp Service\\botflow-backend\\src\\data';

const iconMapping = {
    'taxi': 'Bus',
    'shuttle': 'Bus',
    'accountant': 'Calculator',
    'airbnb': 'Home',
    'auto-mechanic': 'Wrench',
    'car-rental': 'Car',
    'cleaning': 'Sparkles',
    'doctor': 'Stethoscope',
    'ecommerce': 'ShoppingBag',
    'gym': 'Dumbbell',
    'hotel': 'Building', // Bed not in standard set sometimes, Building is safe
    'lawyer': 'Scale',
    'medical': 'Stethoscope',
    'plumber': 'Wrench',
    'real-estate': 'Home',
    'restaurant': 'Utensils',
    'retail': 'ShoppingBag',
    'salon': 'Scissors',
    'travel-agency': 'Plane',
    'tutor': 'GraduationCap',
    'veterinarian': 'Heart', // Or generic
    'customer-support': 'Headphones',
    'lead-generation': 'Target',
    'hr-recruitment': 'Users',
    'appointment-booking': 'Calendar'
};

const imageMapping = {
    'taxi': '/icons/shuttle.png',
    'shuttle': '/icons/shuttle.png',
    'accountant': '/icons/accountant.png', // Placeholder
    'airbnb': '/icons/real-estate.png',
    'auto-mechanic': '/icons/mechanic.png',
    'car-rental': '/icons/car.png',
    'cleaning': '/icons/cleaning.png',
    'doctor': '/icons/health.png',
    'ecommerce': '/icons/ecommerce.png',
    'gym': '/icons/gym.png',
    'hotel': '/icons/hotel.png',
    'lawyer': '/icons/legal.png',
    'medical': '/icons/health.png',
    'plumber': '/icons/plumber.png',
    'real-estate': '/icons/real-estate.png',
    'restaurant': '/icons/restaurant.png',
    'retail': '/icons/ecommerce.png',
    'salon': '/icons/salon.png',
    'travel-agency': '/icons/travel.png',
    'tutor': '/icons/education.png',
    'veterinarian': '/icons/vet.png',
    'customer-support': '/icons/support.png',
    'lead-generation': '/icons/lead-gen.png',
    'hr-recruitment': '/icons/hr.png',
    'appointment-booking': '/icons/booking.png'
};

try {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    const templates = [];

    files.forEach(file => {
        const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
        const slug = file.replace('-template.json', '');

        // Skip existing ones if we want to merge, but let's just generate all from source if possible
        // effectively replacing the manual list with the canonical backend list

        const template = {
            slug: slug,
            title: content.name,
            shortDescription: content.tagline || content.description.substring(0, 100) + '...',
            fullDescription: content.description,
            icon: iconMapping[content.vertical] || 'Bot',
            image: imageMapping[content.vertical] || '/icons/default.png',
            integrations: content.integrations || [],
            features: [
                'Automated Responses',
                '24/7 Availability',
                'Data Collection',
                'Seamless Handover'
            ] // Default features as they aren't in JSON array
        };
        templates.push(template);
    });

    console.log(JSON.stringify(templates, null, 2));

} catch (e) {
    console.error(e);
}
