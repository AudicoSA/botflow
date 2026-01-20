// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Waitlist form submission
document.getElementById('waitlistForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = {
        name: formData.get('name') || this.querySelector('input[type="text"]').value,
        email: formData.get('email') || this.querySelectorAll('input')[1].value,
        phone: formData.get('phone') || this.querySelector('input[type="tel"]').value,
        company: formData.get('company') || this.querySelectorAll('input[type="text"]')[1].value,
        timestamp: new Date().toISOString()
    };
    
    // For now, just log to console and show success message
    // TODO: Connect to your email service or database
    console.log('Waitlist signup:', data);
    
    // Show success message
    const button = this.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.innerHTML = '✓ You\'re on the list!';
    button.style.background = '#10B981';
    
    // Reset form
    this.reset();
    
    // Reset button after 3 seconds
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
    }, 3000);
    
    // Optional: Send to Google Sheets, Airtable, or your backend
    // Example with Google Sheets (you'll need to set up a Google Apps Script):
    /*
    try {
        await fetch('YOUR_GOOGLE_APPS_SCRIPT_URL', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error('Error submitting form:', error);
    }
    */
});

// Add scroll effect to navigation
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        nav.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    } else {
        nav.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards and pricing cards
document.querySelectorAll('.feature-card, .pricing-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(card);
});

// Add typing animation to chat bubbles
function animateChatBubbles() {
    const bubbles = document.querySelectorAll('.chat-bubble');
    bubbles.forEach((bubble, index) => {
        bubble.style.opacity = '0';
        setTimeout(() => {
            bubble.style.opacity = '1';
        }, index * 800);
    });
}

// Run chat animation on page load
window.addEventListener('load', () => {
    setTimeout(animateChatBubbles, 500);
});

// Mobile menu toggle (for future implementation)
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('mobile-active');
}

// Track page views (optional - integrate with your analytics)
if (typeof gtag !== 'undefined') {
    gtag('event', 'page_view', {
        page_title: 'BotFlow Landing Page',
        page_location: window.location.href,
        page_path: window.location.pathname
    });
}
