# Backend Test Suite

Omfattande testsvit för Kålgårdens Schemaläggningssystem backend.

## Testfiler

- **`test_scheduler.py`** - Tester för OR-Tools scheduler core
- **`test_constraints.py`** - Tester för constraint engine
- **`test_excel_service.py`** - Tester för Excel import/export
- **`test_ai_service.py`** - Tester för Claude AI integration
- **`test_api.py`** - Tester för FastAPI endpoints
- **`conftest.py`** - Pytest fixtures och konfiguration

## Installation

Innan du kör testerna, säkerställ att du har installerat alla dependencies:

```bash
cd scheduler/backend

# Skapa virtual environment (om det inte finns)
python -m venv venv

# Aktivera virtual environment
# Windows:
venv\Scripts\activate
# Unix/Mac:
source venv/bin/activate

# Installera dependencies
pip install -r requirements.txt
```

## Köra Tester

### Alla tester

```bash
pytest tests/ -v
```

### Specifik testfil

```bash
pytest tests/test_scheduler.py -v
pytest tests/test_constraints.py -v
pytest tests/test_ai_service.py -v
```

### Specifik testklass

```bash
pytest tests/test_scheduler.py::TestSchoolScheduler -v
```

### Specifikt test

```bash
pytest tests/test_scheduler.py::TestSchoolScheduler::test_create_simple_schedule -v
```

### Exkludera långsamma tester

```bash
pytest tests/ -v -m "not slow"
```

### Exkludera tester som kräver API-nyckel

```bash
pytest tests/ -v -m "not requires_api_key"
```

## Test Coverage

För att köra tester med coverage-rapport:

```bash
# Installera pytest-cov först
pip install pytest-cov

# Kör tester med coverage
pytest tests/ --cov=app --cov-report=html --cov-report=term
```

Coverage-rapporten genereras i `htmlcov/index.html`.

## Testtyper

### Unit Tests

Testar individuella funktioner och klasser isolerat:
- Constraint definitions
- Helper functions
- Data parsing
- Formatting

### Integration Tests

Testar sammansatta komponenter:
- Scheduler med constraints
- API endpoints med databas
- Excel import till databas

### API Tests

Testar FastAPI endpoints:
- Student CRUD operations
- Staff CRUD operations
- Schedule generation
- Absence management

## Fixtures

Testfixtures definierade i `conftest.py`:

- `db_session` - Test database session (in-memory SQLite)
- `client` - FastAPI test client
- `sample_school_class` - Sample class fixture
- `sample_staff_assistant` - Sample staff member (assistant)
- `sample_staff_teacher` - Sample staff member (teacher)
- `sample_student_with_care_needs` - Student with care requirements
- `sample_student_no_care_needs` - Student without care needs
- `sample_schedule` - Sample schedule
- `sample_absence` - Sample absence

## Testscenarier

### 1. Grundläggande Schemaläggning

Test att schemat kan genereras med enkla constraints:

```python
def test_create_simple_schedule(...)
```

### 2. Vårdkrav Matchning

Test att elever med vårdkrav matchas med certifierad personal:

```python
def test_care_needs_matching(...)
```

### 3. Personalfrånvaro

Test att personal inte schemaläggs när de är frånvarande:

```python
def test_staff_availability_constraint(...)
```

### 4. Arbetstidsbegränsning

Test att personal inte överskrider 40 timmar/vecka:

```python
def test_working_hours_limit(...)
```

### 5. Preferensmatchning

Test att elevpreferenser respekteras när möjligt:

```python
def test_preference_matching(...)
```

## Kända Begränsningar

### Tester som kräver externa resurser

Några tester är markerade med `@pytest.mark.skip` eftersom de kräver:

1. **AI API-nyckel** - Tester som anropar Claude API
   - `test_suggest_conflict_resolution_real_api`
   - `test_explain_assignment_real_api`
   - `test_predict_problems_real_api`

2. **Excel-fil** - Tester som kräver "Schema att maila Joel.xlsx"
   - `test_parse_schedule_excel`

3. **Full databas** - Tester som kräver komplett scheduler setup
   - `test_generate_schedule` (API endpoint)

Dessa kan aktiveras genom att ta bort `@pytest.mark.skip` och tillhandahålla nödvändiga resurser.

## Felsökning

### ImportError: No module named 'app'

Säkerställ att du är i rätt katalog och har aktiverat venv:

```bash
cd scheduler/backend
source venv/bin/activate  # eller venv\Scripts\activate på Windows
```

### Database errors

Om du får databas-fel, kontrollera att test-databasen är korrekt konfigurerad:

```python
# I conftest.py
TEST_DATABASE_URL = "sqlite:///:memory:"
```

### API key errors för AI-tester

AI-tester som inte är skippade kräver en giltig Anthropic API-nyckel:

```bash
export ANTHROPIC_API_KEY="your-key-here"
```

## Kontinuerlig Integration

För CI/CD pipelines, kör:

```bash
# Installera dependencies
pip install -r requirements.txt

# Kör tester utan skippade
pytest tests/ -v --ignore-glob="**/test_real_data.py"

# Eller kör endast snabba unit tests
pytest tests/ -v -m "not slow and not requires_api_key"
```

## Lägg Till Nya Tester

När du lägger till nya funktioner, följ detta mönster:

1. Skapa testfil: `tests/test_<feature>.py`
2. Definiera testklass: `class Test<Feature>:`
3. Skriv testmetoder: `def test_<scenario>(...)`
4. Använd fixtures från `conftest.py`
5. Markera tester med relevanta markers:
   ```python
   @pytest.mark.slow
   @pytest.mark.requires_api_key
   ```

## Exempel: Köra Tester Efter Frånvarohantering

```bash
# Test alla absence-relaterade tester
pytest tests/ -v -k "absence"

# Test endast API endpoints för absence
pytest tests/test_api.py::TestStaffEndpoints::test_create_absence -v
```

## Prestanda

Testerna är designade för att köras snabbt:

- In-memory SQLite databas
- Mocked AI responses för de flesta tester
- Minimala fixtures

Förväntad körtid: **< 30 sekunder** för hela testsviten.
