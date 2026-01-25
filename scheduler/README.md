# Kålgårdens Schemaläggningssystem

Hybrid schemaläggningsapplikation som kombinerar regelbaserad optimering (OR-Tools) med AI-assisterad beslutsstöd (Claude API) för automatiserad veckoschemaläggning.

## Översikt

Systemet hanterar schemaläggning för:
- **46 elever** (33 med fritids)
- **53 personalmedlemmar** (37 elevassistenter, 3 fritidspedagoger, 13 pedagoger)
- **9 klasser** (årskurs 1-6)

### Funktioner

- Automatisk schemaoptimering baserat på constraints
- Excel import/export för befintlig data
- AI-assisterad konfliktlösning
- Hantering av vårdbehov och personalcertifieringar
- Frånvarohantering med omgenerering
- Webbaserat användargränssnitt (icke-teknisk användare)

## Teknologistack

**Backend:**
- Python 3.12 + FastAPI
- PostgreSQL 16
- OR-Tools (Constraint Programming)
- Anthropic Claude Sonnet 4.5

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- TanStack Query

## Snabbstart

### Förutsättningar

- Docker & Docker Compose
- Python 3.12+
- Node.js 20+
- Anthropic API key

### Installation

1. **Klona repositoryt**
```bash
cd c:\Koden\claude-code-hive\scheduler
```

2. **Konfigurera environment variables**
```bash
cp backend/.env.example backend/.env
# Redigera backend/.env och lägg till din ANTHROPIC_API_KEY
```

3. **Starta med Docker Compose**
```bash
docker-compose up -d
```

4. **Kör databasmigrationer**
```bash
docker-compose exec backend alembic upgrade head
```

5. **Importera initial data från Excel**
```bash
docker-compose exec backend python cli.py import-data "../Schema att maila Joel.xlsx"
```

6. **Öppna i webbläsaren**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Dokumentation: http://localhost:8000/docs

## Utveckling (Utan Docker)

### Backend

```bash
cd backend

# Skapa virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installera dependencies
pip install -r requirements.txt

# Konfigurera .env
cp .env.example .env

# Starta Postgres (separat)
# Kör migrations
alembic upgrade head

# Starta development server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Installera dependencies
npm install

# Starta development server
npm run dev
```

## Användning

### Generera Schema via CLI

```bash
python cli.py generate --week 12 --year 2026 --output schema_w12.xlsx
```

### Generera Schema via Web UI

1. Gå till http://localhost:5173
2. Klicka "Schema" i menyn
3. Välj vecka
4. Klicka "Generera Schema"
5. Granska AI-förslag
6. Exportera till Excel vid behov

### Hantera Frånvaro

1. Gå till "Personal" → "Frånvaro"
2. Välj personal och datum
3. Klicka "Registrera frånvaro"
4. Gå tillbaka till schema och klicka "Omgenerera"

## Projektstruktur

```
scheduler/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy database models
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── core/            # Business logic (scheduler, constraints)
│   │   ├── services/        # External services (Excel, AI)
│   │   ├── api/             # FastAPI route handlers
│   │   └── utils/           # Helper functions
│   ├── tests/               # Backend tests
│   ├── alembic/             # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client
│   │   ├── store/           # State management
│   │   └── types/           # TypeScript types
│   └── package.json
└── docker-compose.yml
```

## Tester

### Backend

```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend

```bash
cd frontend
npm test
```

### End-to-End Test

```bash
python tests/e2e/test_monday_morning_chaos.py
```

Detta simulerar scenariot med 9 sjukanmälningar måndag morgon.

## Deployment

**📖 För fullständiga deployment-instruktioner, se [DEPLOYMENT.md](DEPLOYMENT.md)**

DEPLOYMENT.md innehåller:
- Steg-för-steg guide för Scalingo deployment
- Environment variables konfiguration
- Troubleshooting & felsökning
- Backup & underhåll
- Migration till skolans IT-server
- Kostnadsestimat

### Snabbstart Scalingo Deployment

```bash
# 1. Logga in på Scalingo
scalingo login

# 2. Skapa app med Postgres
scalingo create kalgarden-scheduler --region osc-fr1
scalingo --app kalgarden-scheduler addons-add postgresql postgresql-starter-512

# 3. Konfigurera API-nyckel (VIKTIGT!)
scalingo --app kalgarden-scheduler env-set ANTHROPIC_API_KEY="sk-ant-..."

# 4. Deploy
git remote add scalingo git@ssh.osc-fr1.scalingo.com:kalgarden-scheduler.git
git push scalingo main

# 5. Migrations körs automatiskt via release process
# 6. Öppna appen
scalingo --app kalgarden-scheduler open
```

För detaljerad information, läs [DEPLOYMENT.md](DEPLOYMENT.md).

## GDPR & Datasäkerhet

- All data krypterad i transit (HTTPS)
- Postgres krypterad at rest
- Audit log för alla ändringar
- GDPR-compliant export/delete funktioner
- Automatiska dagliga backups

## Support

För frågor eller problem:
- Läs användarguiden: `docs/Användarguide.pdf`
- Kontakta utvecklare: [din email]

## Licens

Proprietary - Kålgårdens Anpassade Grundskola

## Changelog

### Version 1.0.0 (2026-01-25)
- Initial release
- Grundläggande schemaoptimering
- Excel import/export
- AI-assisterad konfliktlösning
- Webbaserat gränssnitt
