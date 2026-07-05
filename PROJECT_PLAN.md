# Spendly - Project Plan

A premium, mindful personal finance mobile application built with React Native (Expo) and FastAPI.

## Architecture
- **Frontend**: React Native (Expo)
  - Navigation: Expo Router (Native-feel transitions)
  - UI Library: Custom components based on "Serene Finance" design system.
  - State Management: React Query (for API) + Zustand (local state).
  - Icons: Lucide React Native (monolinear style).
- **Backend**: FastAPI
  - Auth: JWT-based (Long-lived 30-day access tokens for mobile session longevity; see Future Improvements).
  - Database: PostgreSQL (via SQLAlchemy/Tortoise).
  - Documentation: Swagger/OpenAPI.
- **Design System**: Serene Finance (from Stitch)
  - Philosophy: Financial Mindfulness (Calm, Lightweight).
  - Palette: 
    - Background: `#fcf8f8` (Soft Beige)
    - Primary: `#181c21` (Charcoal)
    - Secondary: `#545f73` (Navy)
    - Accents: `#8FA38D` (Sage - Income), `#D99771` (Clay - Actions)
  - Typography: Manrope (Headlines/Prices), DM Sans (Body/Labels).
  - Shapes: 16px corner radius for cards, 8px for small elements.
  - Shadows: Soft ambient shadows (low opacity, high blur).

## Screens to Implement
1. **Onboarding**: Calm introduction to the app philosophy.
2. **Dashboard**: Main overview with current balance and recent transactions.
3. **Add Expense**: Minimalist input with refined fields.
4. **Analytics**: Dynamic charts and fluid visualizations.
5. **History**: Detailed transaction log with search/filter.
6. **Profile**: User settings and account management.

## Roadmap
- [x] Phase 1: Environment Setup (Mobile & Backend)
- [x] Phase 2: Design System Token Implementation (Theme Setup)
- [x] Phase 3: Screen Development (UI Only)
  - [x] Dashboard
  - [x] Add Expense (Modal)
  - [x] History
  - [x] Analytics
  - [x] Profile
- [x] Phase 4: Backend API Development
  - [x] Database Models & Config
  - [x] API Schemas (Pydantic)
  - [x] Basic CRUD Operations
  - [x] User Authentication (JWT)
  - [x] Transaction Endpoints
- [/] Phase 5: Frontend-Backend Integration
  - [x] Auth Store & Token Management
  - [x] Login & Signup Screens
  - [x] Dashboard API Connection
  - [x] Add Expense API Connection
  - [x] Analytics & History API Connection
- [x] Phase 6: Final Polish (Micro-interactions & Animations)
- [ ] Phase 7: APK Generation (EAS Build)

## Future Security & Auth Improvements
- **Access + Refresh Tokens**: Transition from long-lived access tokens (currently 30 days) to a short-lived access token (e.g., 15-30 minutes) with a long-lived refresh token (e.g., 30-90 days) stored securely on the mobile device, along with a `/refresh` endpoint to exchange refresh tokens for new access tokens.
