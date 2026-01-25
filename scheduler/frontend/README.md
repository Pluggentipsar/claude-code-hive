# Kålgårdens Schemaläggningssystem - Frontend

Modern React frontend för schemaläggningssystemet.

## Teknologistack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool och dev server
- **TailwindCSS** - Utility-first CSS
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching och caching
- **Zustand** - State management
- **Axios** - HTTP client

## Snabbstart

```bash
# Installera dependencies
npm install

# Kopiera environment variables
cp .env.example .env

# Starta dev server
npm run dev
```

Öppna http://localhost:5173

## Projektstruktur

```
src/
├── api/              # API client och endpoints
├── components/       # React komponenter
│   ├── Common/       # Återanvändbara komponenter
│   ├── Layout/       # Layout komponenter
│   ├── Schedule/     # Schemavisualisering (kommer)
│   ├── Students/     # Elevhantering (kommer)
│   ├── Staff/        # Personalhantering (kommer)
│   └── AI/           # AI-förslag (kommer)
├── pages/            # Route pages
├── stores/           # Zustand stores
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Kommandon

```bash
npm run dev          # Starta dev server
npm run build        # Bygg för production
npm run preview      # Preview production build
npm run lint         # Kör ESLint
```

## API Integration

Frontend kommunicerar med FastAPI backend:

```typescript
import { studentsApi, staffApi, schedulesApi } from './api';

// Hämta alla elever
const students = await studentsApi.getAll();

// Generera schema
const schedule = await schedulesApi.generate({
  week_number: 12,
  year: 2026
});
```

## State Management

```typescript
import { useAppStore } from './stores/appStore';

function MyComponent() {
  const { currentWeek, setCurrentWeek } = useAppStore();
  // ...
}
```

## Data Fetching

```typescript
import { useQuery } from '@tanstack/react-query';

function StudentList() {
  const { data, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsApi.getAll()
  });
  // ...
}
```

## Nästa Steg

- [ ] Implementera schemavisualisering (WeekView, DayView)
- [ ] Implementera CRUD-formulär för elever och personal
- [ ] Implementera AI-förslag panel

Se detaljerad dokumentation i [projektets huvuddokumentation](../../README.md).
