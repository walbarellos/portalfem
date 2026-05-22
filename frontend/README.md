# FEM Portal Frontend

Portal oficial da Fundação de Cultura Elias Mansour (FEM) - Governo do Estado do Acre

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The FEM Portal is a modern, responsive website built with Astro that serves as the official online presence for the Fundação de Cultura Elias Mansour. It provides information about cultural programs, events, grants, news, and citizen services.

## ✨ Features

- **Responsive Design**: Works on mobile, tablet, and desktop
- **SSR with Astro**: Server-side rendering for better SEO and performance
- **Content Management**: Powered by Directus headless CMS
- **Accessibility**: WCAG AA compliant with proper contrast ratios
- **SEO Optimized**: JSON-LD schema, sitemap, meta tags
- **Multi-language Support**: Ready for i18n implementation
- **Dark Mode**: CSS variables ready for theme switching
- **Performance Optimized**: Lazy loading, code splitting, optimized assets
- **Security**: Security headers, environment validation, XSS protection
- **Internationalization**: Prepared for future i18n implementation

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build) (v5.0.0)
- **UI**: [Tailwind CSS](https://tailwindcss.com) with custom design system
- **Typography**: Space Grotesk (self-hosted) + Geist (for UI)
- **Icons**: Material Symbols (Google Fonts)
- **State Management**: Directus SDK for CMS integration
- **Build Tool**: Vite (via Astro)
- **TypeScript**: For type safety
- **Deployment**: Node.js adapter (can also run as static)
- **Linting**: ESLint + Prettier with husky pre-commit hooks

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Access to Directus CMS instance

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/fem-portal.git
   cd fem-portal/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration:
   ```env
   PUBLIC_DIRECTUS_URL=https://your-directus-instance.com
   PUBLIC_DIRECTUS_TOKEN=your-public-token-here
   PUBLIC_SITE_URL=https://femcultura.ac.gov.br
   ```

### Development Server

Start the development server with hot reload:

```bash
npm run dev
```

The portal will be available at `http://localhost:4321`

## 🔐 Environment Variables

Required variables in `.env` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_DIRECTUS_URL` | Directus API URL | `https://cms.fem.ac.gov.br` |
| `PUBLIC_DIRECTUS_TOKEN` | Public read-only token for Directus | `fem-public-token-...` |
| `PUBLIC_SITE_URL` | Production site URL | `https://femcultura.ac.gov.br` |

Optional variables:

| Variable | Description |
|----------|-------------|
| `PUBLIC_GOOGLE_ANALYTICS_ID` | GA4 measurement ID |
| `PUBLIC_GTAG_ID` | Google Tag Manager ID |

## 👨‍💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint

# Fix ESLint errors automatically
npm run lint:fix

# Check formatting with Prettier
npm run format:check

# Auto-format code
npm run format

# Type checking
npm run type-check
```

### Code Style

- Follows Airbnb JavaScript/TypeScript guidelines via ESLint
- Uses Prettier for consistent formatting
- Commits should follow conventional commits format
- Component files use `.astro` extension
- Utility functions in TypeScript (`.ts`) files

### Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── layouts/        # Page layouts (Header, Footer, etc.)
│   ├── lib/            # Utilities, API clients, helpers
│   ├── pages/          # Page routes (auto-routed by Astro)
│   └── styles/         # Global styles and CSS variables
├── public/             # Static assets (images, fonts, etc.)
├── .env.example        # Environment variables template
├── .eslintrc.json      # ESLint configuration
├── .prettierrc.json    # Prettier configuration
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## 🏗️ Building for Production

Create an optimized production build:

```bash
npm run build
```

Output is generated in the `dist/` directory:
- `dist/client/` - Static assets (HTML, CSS, JS, images)
- `dist/server/` - Server entrypoint (for Node.js adapter)

## 🚢 Deployment

### Docker Deployment

The portal includes a Dockerfile for containerized deployment:

```bash
# Build Docker image
docker build -t fem-portal .

# Run container
docker run -p 80:80 \
  -e PUBLIC_DIRECTUS_URL=https://your-directus.com \
  -e PUBLIC_DIRECTUS_TOKEN=your-token \
  -e PUBLIC_SITE_URL=https://femcultura.ac.gov.br \
  fem-portal
```

### Manual Deployment

1. Build the application: `npm run build`
2. Copy the `dist/` contents to your web server
3. Configure your web server (nginx/apache) to serve the static files
4. Ensure environment variables are available at runtime

### Nginx Configuration Example

See `nginx/public.conf` for a complete configuration example with:
- HTTP to HTTPS redirect
- Security headers (CSP, X-Frame-Options, etc.)
- Gzip compression
- Caching strategies
- Proper routing for SPA behavior

## 🧪 Testing

### Current Testing Strategy

- Manual testing for UI/UX
- Build verification (`npm run build`)
- Linting checks (`npm run lint`)
- Type checking (`npm run type-check`)

### Planned Testing Improvements

- Unit tests with Vitest
- E2E tests with Playwright
- Accessibility testing with axe-core
- Visual regression testing

## 📁 Project Structure Details

### Key Directories

- `src/components/` - Reusable UI components (Button, Card, etc.)
- `src/layouts/` - Page layouts containing Header, Footer, etc.
- `src/lib/` - Utilities:
  - `directus.ts` - Directus API client wrapper
  - `env-validation.ts` - Environment validation at startup
  - `constants.ts` - Site-wide constants
- `src/pages/` - Auto-routed pages:
  - `index.astro` - Homepage
  - `noticias.[id].astro` - News detail pages
  - `eventos.[id].astro` - Event detail pages
  - `editais.[id].astro` - Grant/tender detail pages
  - `espacos.[id].astro` - Cultural space detail pages
  - `institucional/[slug].astro` - About pages
  - `ouvidoria.astro` - Citizen complaint system
  - `politica-privacidade.astro` - Privacy policy
  - `busca.astro` - Search functionality
  - `404.astro` - Custom error page
- `public/` - Static assets:
  - `assets/logos/` - FEM logos and branding
  - `assets/images/` - Content images
  - `robots.txt` - SEO directives
  - `sitemap.xml` - Generated automatically

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to:
- Follow the existing code style
- Update documentation as needed
- Add tests for new functionality
- Keep pull requests focused

## 📄 License

This project is proprietary and confidential. All rights reserved.

© 2026 Fundação de Cultura Elias Mansour - Governo do Estado do Acre

## 📞 Support

For technical support or questions about the portal:
- Email: comunicacao@fem.ac.gov.br
- Phone: (68) 3223-1234
- Ouvidoria: fem.ouvidoria@ac.gov.br

---

*Built with ❤️ for the cultura do Acre*