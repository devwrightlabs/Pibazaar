# Pibazaar 🛍️

**Decentralized peer-to-peer marketplace powered by Pi Network.**

Buy, sell, and trade anything locally with instant Pi coin payments and built-in escrow protection.

---

## Features ✨

### Core Marketplace
- 🔍 **Advanced Search & Filters** - Full-text search, category filtering, condition, rating
- 📸 **Rich Listings** - Upload up to 12 photos, detailed descriptions, smart AI tags
- 💬 **Real-time Messaging** - In-app chat between buyers and sellers
- ⭐ **Trusted Reviews** - Public ratings, verified badges, reputation system
- 💾 **Save & Favorites** - Bookmark listings for later browsing
- 🤝 **Offer Negotiation** - Make and counter offers before finalizing purchase

### Pi Network Integration
- ₿ **Pi Payments** - Direct Pi coin transfers with instant settlement
- 🔐 **Smart Escrow** - Funds held safely until delivery confirmed
- 📊 **On-Chain Reputation** - Blockchain-verifiable trust scores
- 🆔 **KYC Ready** - Leverages Pi Network identity verification

### Unique Features
- 🔄 **P2P Trading** - Offer items for trade, not just cash
- 🎯 **Live Auctions** - Timed auctions for high-value items
- 🗺️ **Near Me Widget** - Radius-based browsing (expandable map, full-screen mode)
- 🤖 **Smart Recommendations** - ML-powered suggestions based on browsing habits
- ⚖️ **Community Arbitration** - Dispute resolution via community voting
- 📱 **Mobile-First** - Optimized for phones, tablets, desktop

---

## Tech Stack 🛠️

### Frontend
- **React 18** + TypeScript
- **Tailwind CSS** + custom animations
- **TanStack Query** (data fetching & caching)
- **Zustand** (lightweight state management)
- **React Hook Form** + Zod (forms & validation)
- **Leaflet** (map widget)
- **Socket.io Client** (real-time messaging)
- **Vite** (build tool)

### Backend
- **Node.js 18+** + Express 5
- **PostgreSQL** + Prisma ORM
- **Redis** (caching, sessions, job queue)
- **Socket.io** (WebSocket for real-time features)
- **Pi Network SDK** (blockchain integration)
- **AWS S3** (image/file storage)
- **Bull** (job queue for background tasks)

### DevOps
- **Docker** (containerization)
- **GitHub Actions** (CI/CD)
- **Fly.io** or **Railway** (hosting)
- **Sentry** (error tracking)
- **CloudWatch** (logging & monitoring)

---

## Getting Started 🚀

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- PostgreSQL 14+
- Redis 6+
- Pi Network testnet or mainnet account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/devwrightlabs/pibazaar.git
   cd pibazaar
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Setup database**
   ```bash
   pnpm run db:migrate
   pnpm run db:seed
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   pnpm -F api-server dev

   # Terminal 2: Frontend
   pnpm -F web dev
   ```

6. **Open browser**
   ```
   http://localhost:5173
   ```

---

## Project Structure 📁

```
pibazaar/
├── artifacts/
│   ├── api-server/          # Express backend
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── middlewares/ # Auth, validation
│   │   │   ├── lib/         # Utilities (Pi, JWT, escrow)
│   │   │   ├── db/          # Prisma schema & migrations
│   │   │   └── index.ts     # Server entry point
│   │   └── package.json
│   │
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   ├── pages/       # Page-level components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── store/       # Zustand state
│       │   ├── utils/       # Helpers & utilities
│       │   ├── types/       # TypeScript definitions
│       │   └── App.tsx      # App entry point
│       └── package.json
│
├── lib/                      # Shared libraries
│   ├── api-zod/            # API type definitions
│   ├── db/                 # Database schemas
│   └── api-client-react/   # React API client
│
├── docker-compose.yml      # Local development stack
├── .env.example            # Environment template
├── pnpm-workspace.yaml     # Monorepo configuration
└── README.md              # This file
```

---

## Development 👨‍💻

### Run Backend
```bash
pnpm -F api-server dev
```
API running at `http://localhost:3000`

### Run Frontend
```bash
pnpm -F web dev
```
App running at `http://localhost:5173`

### Type Checking
```bash
pnpm typecheck
```

### Linting
```bash
pnpm lint
```

### Testing
```bash
pnpm test
```

### Database Migrations
```bash
# Create migration
pnpm -F api-server db:create <name>

# Apply migrations
pnpm run db:migrate

# Seed database
pnpm run db:seed
```

---

## API Documentation 📚

### Authentication
All API requests require JWT token in `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### Key Endpoints

#### Listings
- `GET /api/listings` - Browse all listings
- `GET /api/listings/:id` - Get listing details
- `POST /api/listings` - Create new listing
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing

#### Messaging
- `GET /api/messages/:conversationId` - Get chat history
- `POST /api/messages` - Send message (WebSocket)
- `GET /api/conversations` - List conversations

#### Transactions
- `POST /api/transactions` - Create transaction (triggers escrow)
- `PUT /api/transactions/:id/complete` - Complete transaction
- `POST /api/transactions/:id/dispute` - Report dispute

#### Offers
- `POST /api/offers` - Make offer
- `PUT /api/offers/:id/counter` - Send counter-offer
- `PUT /api/offers/:id/accept` - Accept offer

#### User Profile
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/me` - Update own profile
- `GET /api/users/:id/reviews` - Get user reviews
- `POST /api/users/:id/reviews` - Leave review

#### Auctions
- `GET /api/auctions` - List active auctions
- `GET /api/auctions/:id` - Get auction details
- `POST /api/auctions/:id/bid` - Place bid

See `artifacts/api-server/src/routes/` for complete endpoint documentation.

---

## Deployment 🚢

### Docker Compose (Local)
```bash
docker-compose up -d
```

### Docker Build
```bash
docker build -f Dockerfile -t pibazaar:latest .
docker run -p 3000:3000 -p 5173:5173 pibazaar:latest
```

### Cloud Deployment (Fly.io)
```bash
fly launch
fly deploy
```

### Cloud Deployment (Railway)
```bash
railway init
railway up
```

---

## Environment Variables 🔐

See `.env.example` for complete list. Key variables:

| Variable | Purpose |
|----------|---------|
| `PI_API_KEY` | Pi Network API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `S3_BUCKET` | AWS S3 bucket for uploads |
| `NODE_ENV` | Environment (development/production) |

---

## Security 🔒

- ✅ JWT authentication
- ✅ HTTPS/TLS encryption
- ✅ Input validation & sanitization
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ Rate limiting
- ✅ Escrow protection for transactions
- ✅ User verification via Pi Network

---

## Contributing 🤝

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code style
- Commit conventions
- Pull request process
- Testing requirements

---

## Roadmap 🗺️

### V1.0 (MVP)
- [x] Browse & search listings
- [x] Create/edit listings
- [x] Real-time messaging
- [x] Pi payments + escrow
- [x] User ratings & reviews

### V1.1
- [ ] Live auctions
- [ ] Offer negotiation UI
- [ ] Dispute resolution voting
- [ ] Seller analytics dashboard

### V1.2
- [ ] ML recommendations
- [ ] Bulk seller tools
- [ ] Map widget enhancements
- [ ] Mobile app (React Native)

---

## Support 💬

- 📧 Email: support@pibazaar.com
- 🐛 Report issues: [GitHub Issues](https://github.com/devwrightlabs/pibazaar/issues)
- 💡 Suggest features: [GitHub Discussions](https://github.com/devwrightlabs/pibazaar/discussions)

---

## License 📄

MIT License - see [LICENSE](LICENSE) file

---

**Built with ❤️ for the Pi Network community**
