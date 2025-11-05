# System Architecture

## Overview

This is a full-stack MERN application with a Python microservice for web scraping. The system consists of three main components that work together to provide product price tracking functionality.

## Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                     http://localhost:3000                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Port 3000)                │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐           │
│  │   Login    │  │  Register  │  │  Dashboard  │           │
│  └────────────┘  └────────────┘  └─────────────┘           │
│  ┌──────────────────────────────────────────────┐           │
│  │        Auth Context (JWT Management)         │           │
│  └──────────────────────────────────────────────┘           │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP/REST API
                            ↓
┌──────────────────────────────────────────────────────────────┐
│              EXPRESS.JS BACKEND (Port 5000)                  │
│  ┌────────────────────┐  ┌─────────────────────┐            │
│  │   Auth Routes      │  │  Product Routes     │            │
│  │  /api/auth/*       │  │  /api/products/*    │            │
│  └────────────────────┘  └─────────────────────┘            │
│  ┌────────────────────┐  ┌─────────────────────┐            │
│  │  Auth Middleware   │  │   Scraper Utils     │            │
│  │  (JWT Verify)      │  │  (Calls Python)     │            │
│  └────────────────────┘  └──────────┬──────────┘            │
└──────────────┬────────────────────────┼──────────────────────┘
               │                        │
               ↓                        ↓
┌──────────────────────┐   ┌───────────────────────────────────┐
│  MONGODB (Port 27017)│   │  PYTHON FLASK (Port 5001)         │
│  ┌────────────────┐  │   │  ┌─────────────────────────────┐  │
│  │  Users         │  │   │  │  /scrape Endpoint           │  │
│  │  - name        │  │   │  │  - Receives URL             │  │
│  │  - email       │  │   │  │  - Returns product data     │  │
│  │  - password    │  │   │  └─────────────────────────────┘  │
│  └────────────────┘  │   │  ┌─────────────────────────────┐  │
│  ┌────────────────┐  │   │  │  Scraping Logic             │  │
│  │  Products      │  │   │  │  1. Try requests + BS4      │  │
│  │  - userId      │  │   │  │  2. Fallback to Selenium    │  │
│  │  - url         │  │   │  └─────────────────────────────┘  │
│  │  - title       │  │   │                │                   │
│  │  - price       │  │   │                ↓                   │
│  │  - history     │  │   │  ┌─────────────────────────────┐  │
│  └────────────────┘  │   │  │  E-commerce Websites        │  │
└──────────────────────┘   │  │  - Amazon, eBay, Walmart    │  │
                           │  └─────────────────────────────┘  │
                           └───────────────────────────────────┘
```

## Data Flow

### 1. User Registration/Login
```
User → React Form → Express /api/auth/register
                  → Hash Password (bcrypt)
                  → Save to MongoDB
                  → Generate JWT Token
                  → Return Token to Frontend
                  → Store in localStorage
```

### 2. Adding a Product
```
User → Paste URL → React Dashboard
                 → POST /api/products (with JWT)
                 → Express validates JWT
                 → Call Python Scraper
                 → POST http://localhost:5001/scrape
                 → Python tries requests + BeautifulSoup
                 → If fails, use Selenium + Chrome
                 → Extract: title, price, image, platform
                 → Return to Express
                 → Save to MongoDB with userId
                 → Return product to React
                 → Display in Dashboard
```

### 3. Refreshing Price
```
User → Click Refresh → PUT /api/products/:id/refresh
                     → Express validates JWT & ownership
                     → Call Python Scraper again
                     → Get updated price
                     → Add to priceHistory array
                     → Update lastChecked timestamp
                     → Return updated product
                     → Update UI
```

## Technology Choices & Rationale

### Why Python for Scraping?

**Advantages over Node.js:**
1. **Better Libraries**: BeautifulSoup and Selenium are more mature
2. **Easier Parsing**: Python's syntax is cleaner for HTML parsing
3. **Selenium Support**: Better WebDriver integration
4. **Community**: More scraping examples and solutions
5. **Flexibility**: Easy to add ML-based extraction later

### Why Separate Microservice?

1. **Isolation**: Scraping failures don't crash main server
2. **Scalability**: Can run multiple scraper instances
3. **Language Optimization**: Use best tool for each job
4. **Independent Deployment**: Update scraper without touching main app
5. **Resource Management**: Heavy Selenium processes isolated

### Why MongoDB?

1. **Flexible Schema**: Product data varies by platform
2. **Easy Arrays**: priceHistory stored as array in document
3. **JSON-like**: Natural fit with JavaScript/Node.js
4. **Fast Queries**: Good for user-specific product lists

## Security Measures

### Authentication
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiration
- Protected routes require valid token
- User can only access their own products

### API Security
- CORS enabled for development
- Request validation on all endpoints
- MongoDB injection prevention via Mongoose
- Environment variables for secrets

### Scraping Security
- User-Agent rotation
- Respectful delays between requests
- Headless browser for stealth
- No credential storage

## Performance Considerations

### Caching Strategy (Future)
- Cache scraped data for 1 hour
- Reduce redundant scraping
- Faster response times

### Database Indexing
- Index on userId for fast queries
- Index on createdAt for sorting

### Scraping Optimization
- Try fast method (requests) first
- Only use Selenium when necessary
- Timeout after 30 seconds
- Parallel scraping for multiple products

## Error Handling

### Frontend
- Try-catch blocks in async functions
- User-friendly error messages
- Loading states during operations
- Automatic token refresh on 401

### Backend
- Centralized error handling
- Detailed logging
- Graceful degradation
- Informative error responses

### Scraper
- Dual-method fallback
- Platform-specific selectors
- Generic fallback selectors
- Detailed error logging

## Scalability Path

### Current (Single Server)
```
1 React Instance
1 Express Instance
1 Python Instance
1 MongoDB Instance
```

### Future (Production)
```
Load Balancer
  ↓
Multiple React Instances (CDN)
Multiple Express Instances
Multiple Python Scrapers (Queue-based)
MongoDB Replica Set
Redis Cache Layer
```

## Development vs Production

### Development
- All services on localhost
- CORS wide open
- Detailed error messages
- No HTTPS
- Single instances

### Production Recommendations
- Use environment-based configs
- Restrict CORS to specific domains
- Generic error messages
- HTTPS everywhere
- Load balancing
- Container orchestration (Docker/Kubernetes)
- Monitoring and logging (PM2, Winston)
- Rate limiting
- API versioning

## File Structure Explained

```
mini3/
├── client/              # React SPA
│   ├── src/
│   │   ├── components/  # Reusable UI components (.jsx)
│   │   ├── context/     # Global state (Auth) (.jsx)
│   │   ├── pages/       # Route components (.jsx)
│   │   ├── App.jsx      # Main app component
│   │   ├── index.js     # Entry point
│   │   └── index.css    # Global styles
│   └── package.json     # Frontend dependencies
│
├── server/              # Express API
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, validation
│   ├── utils/           # Helper functions
│   └── index.js         # Server entry point
│
├── scraper/             # Python microservice
│   ├── scraper_service.py  # Flask app
│   └── requirements.txt    # Python packages
│
└── package.json         # Root scripts
```

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Get current user (protected)

### Products
- `GET /api/products` - List user's products (protected)
- `POST /api/products` - Add product (protected)
- `PUT /api/products/:id/refresh` - Update price (protected)
- `DELETE /api/products/:id` - Remove product (protected)

### Scraper
- `POST /scrape` - Extract product data from URL
- `GET /health` - Service health check

## Environment Variables

### server/.env
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/price-tracker
JWT_SECRET=your_secret_key
NODE_ENV=development
PYTHON_SCRAPER_URL=http://localhost:5001
```

## Dependencies Overview

### Frontend (React)
- react, react-dom - UI framework
- react-router-dom - Routing
- axios - HTTP client
- lucide-react - Icons

### Backend (Node.js)
- express - Web framework
- mongoose - MongoDB ODM
- bcryptjs - Password hashing
- jsonwebtoken - JWT handling
- cors - Cross-origin requests
- dotenv - Environment variables

### Scraper (Python)
- flask - Web framework
- requests - HTTP client
- beautifulsoup4 - HTML parsing
- selenium - Browser automation
- webdriver-manager - ChromeDriver
- lxml - Fast XML/HTML parser

## Future Enhancements

1. **Price Alerts**: Email when price drops below threshold
2. **Price Charts**: Visualize price history with Recharts
3. **Scheduled Checks**: Cron jobs for automatic updates
4. **Product Comparison**: Side-by-side price comparison
5. **Mobile App**: React Native version
6. **Social Features**: Share deals with friends
7. **Browser Extension**: Quick add from any page
8. **AI Price Prediction**: ML model for price trends
