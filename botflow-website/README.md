# BotFlow Website

Modern, responsive landing page for BotFlow - WhatsApp AI automation platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📦 Deploy to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: Deploy via Vercel Dashboard

1. Push this code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js and deploy!

### Option 3: Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_URL)

## 🎨 Features

- ✅ Modern, responsive design
- ✅ Tailwind CSS styling
- ✅ TypeScript
- ✅ SEO optimized
- ✅ Fast page loads
- ✅ Mobile-first approach

## 📁 Project Structure

```
botflow-website/
├── app/
│   ├── components/
│   │   ├── Navigation.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Pricing.tsx
│   │   ├── Waitlist.tsx
│   │   └── Footer.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

## 🔧 Configuration

- **Domain**: Point botflow.co.za to Vercel in your domain settings
- **Environment Variables**: Add any API keys in Vercel dashboard

## 📝 To-Do

- [ ] Connect waitlist form to email service (Resend, SendGrid, etc.)
- [ ] Add Google Analytics
- [ ] Create demo video
- [ ] Add testimonials section
- [ ] Implement blog

## 🌐 Custom Domain

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add `botflow.co.za` and `www.botflow.co.za`
3. Update DNS records as instructed

## 📧 Contact

For questions: hello@botflow.co.za
