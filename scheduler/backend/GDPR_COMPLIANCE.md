# GDPR-efterlevnad - Schemaläggningssystem för Kålgårdens Grundskola

## Översikt

Detta system är designat enligt **Privacy by Design** (GDPR Artikel 25) för att säkerställa att känslig persondata skyddas när AI-assisterad schemaläggning används.

## Grundprincip: Dataminimering

**INGEN personlig information lämnar era servrar till externa AI-tjänster.**

### Data som ALDRIG skickas till Claude API:
- ❌ Personnummer
- ❌ För- och efternamn
- ❌ Specifika medicinska diagnoser
- ❌ Adresser
- ❌ Kontaktinformation
- ❌ Föräldrarnas information

### Data som skickas till Claude API (anonymiserad):
- ✅ Anonyma ID:n (S1, S2, E1, E2...)
- ✅ Roller (assistent, pedagog, fritidspedagog)
- ✅ **Generiska** vårdbehov (t.ex. "seizure_care" istället för "epilepsi")
- ✅ Arbetstider och omsorgstider (tidsintervall)
- ✅ Årskurs (1-6)
- ✅ Klasstillhörighet (anonymiserat, t.ex. "C1", "C2")

## Hur det fungerar

### 1. Anonymisering (före AI-anrop)

```python
# FÖRE anonymisering (i databasen)
Staff:
  - ID: uuid-123-456
  - Namn: "Fadi Andersson"
  - Personnummer: "19850101-1234"
  - Certifieringar: ["epilepsi"]

# EFTER anonymisering (skickas till Claude)
{
  "id": "S1",  # Tillfälligt, session-specifikt ID
  "role": "assistant",
  "certifications": ["seizure_care"]  # Generisk kategori
}
```

### 2. AI-bearbetning

Claude tar emot ENDAST anonymiserad data och föreslår schemaläggning baserat på:
- Anonyma ID:n
- Generiska vårdbehov
- Tider och tillgänglighet

### 3. Av-anonymisering (efter AI-svar)

```python
# Claude svarar med
{
  "assignment": {
    "staff_id": "S1",
    "student_id": "E1",
    "time": "08:00-12:00"
  }
}

# Systemet översätter tillbaka
{
  "assignment": {
    "staff_id": "uuid-123-456",  # Real ID
    "student_id": "uuid-789-012",
    "time": "08:00-12:00"
  }
}
```

## Teknisk implementation

### Anonymization Service (`app/services/anonymization.py`)

```python
class AnonymizationService:
    def anonymize_for_scheduling(students, staff, schedule_id):
        """
        Skapar tillfälliga, session-specifika ID:n.
        Generaliserar vårdbehov till kategorier.
        Returnerar: (anonymiserad data, session_id)
        """

    def deanonymize_assignments(ai_response, session_id):
        """
        Översätter tillbaka anonyma ID:n till verkliga UUID:n.
        """

    def cleanup_session(session_id):
        """
        Raderar mappningar efter användning.
        Minimerar datalagring.
        """
```

### Session-baserad mapping

Mappningar mellan verkliga ID:n och anonyma ID:n är:
- **Temporära** - existerar endast under schemaläggningssessionen
- **Sessionsspecifika** - unika för varje schemaläggning
- **Ej lagrade permanent** - raderas efter användning

## GDPR-artiklar som efterlevs

### Artikel 25: Privacy by Design
✅ Systemet är designat från grunden för att minimera personuppgifter som lämnar servern.

### Artikel 5.1(c): Dataminimering
✅ Endast absolut nödvändig data för schemaläggning skickas till AI.

### Artikel 5.1(b): Ändamålsbegränsning
✅ Data används ENDAST för schemaläggning, inget annat.

### Artikel 32: Säkerhet
✅ Tekniska åtgärder (anonymisering, session-baserad mapping, automatisk radering).

## Dataflöde - Komplett översikt

```
┌────────────────────────────────────────┐
│ ERA SERVRAR (lokal eller privat moln)  │
│                                        │
│ ┌────────────────────────────────┐    │
│ │ PostgreSQL Databas             │    │
│ │ - Fulla personnummer           │    │
│ │ - För- och efternamn           │    │
│ │ - Specifika diagnoser          │    │
│ └────────────────────────────────┘    │
│              ↓                         │
│ ┌────────────────────────────────┐    │
│ │ Anonymization Service          │    │
│ │ - Skapar S1, S2, E1, E2...    │    │
│ │ - Generaliserar vårdbehov      │    │
│ │ - Tar bort all PII             │    │
│ └────────────────────────────────┘    │
│              ↓                         │
│         Anonymiserad data              │
│         (INGEN PII)                    │
└────────────────────────────────────────┘
              ↓
         HTTPS (krypterat)
              ↓
┌────────────────────────────────────────┐
│ Azure Claude API (Tredje part)         │
│                                        │
│ TAR EMOT:                              │
│ {                                      │
│   "staff": [{"id": "S1", ...}],       │
│   "students": [{"id": "E1", ...}]     │
│ }                                      │
│                                        │
│ RETURNERAR:                            │
│ Schemaförslag med anonyma ID:n         │
└────────────────────────────────────────┘
              ↓
         HTTPS (krypterat)
              ↓
┌────────────────────────────────────────┐
│ ERA SERVRAR                            │
│                                        │
│ ┌────────────────────────────────┐    │
│ │ Deanonymization                │    │
│ │ - S1 → uuid-123                │    │
│ │ - E1 → uuid-456                │    │
│ └────────────────────────────────┘    │
│              ↓                         │
│ ┌────────────────────────────────┐    │
│ │ Databas                        │    │
│ │ - Spara schema med riktiga ID:n│    │
│ └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

## Säkerhetsåtgärder

### 1. Ingen koppling mellan anonyma ID:n och verkliga identiteter utanför er server
Även om någon får tillgång till API-trafiken ser de endast:
- "S1 ska arbeta med E1 mellan 08:00-12:00"
- De vet INTE vem S1 eller E1 är

### 2. Session-baserade ID:n
Varje schemaläggning får nya anonyma ID:n. S1 i session A ≠ S1 i session B.

### 3. Automatisk radering
Mappningar raderas automatiskt efter schemaläggning.

### 4. Audit trail
All kommunikation med AI loggas (utan PII) för granskning.

## Revidering och kontroll

### För att verifiera GDPR-compliance:

```bash
# Testa anonymiseringsservicen
cd scheduler/backend
python -m pytest tests/test_anonymization.py

# Visa compliance-sammanfattning
python -c "from app.services.anonymization import anonymization_service; print(anonymization_service.get_gdpr_compliance_summary())"
```

### Loggning

Alla AI-anrop loggas med:
- ✅ Timestamp
- ✅ Session ID
- ✅ Anonymiserad data som skickades
- ✅ Anonymiserat svar som mottogs
- ❌ INGEN personlig information

## Dataskyddsombud (DPO) information

Vid frågor om dataskydd, kontakta:
- **IT-ansvarig**: [Kontaktuppgifter]
- **Dokumentation**: `scheduler/backend/GDPR_COMPLIANCE.md`
- **Teknisk implementation**: `scheduler/backend/app/services/anonymization.py`

## Användarrättigheter

Elever och personal har rätt att:
1. **Se sin data** - Tillgänglig via webappen (med behörighet)
2. **Radera sin data** - Soft delete i systemet
3. **Exportera sin data** - GDPR-export funktion (planerad)
4. **Invända mot AI-bearbetning** - Kan använda manuell schemaläggning istället

## Datalagringsperiod

- **Aktiv personal/elever**: Data lagras så länge de är aktiva
- **Inaktiva**: Soft delete, kan raderas efter 2 år (konfigurerbart)
- **Anonymiseringsmappningar**: Raderas OMEDELBART efter schemaläggning
- **Loggar**: Bevaras i 1 år för säkerhetsändamål (utan PII)

## Sammanfattning

✅ **Privacy by Design** - Anonymisering från början
✅ **Dataminimering** - Endast nödvändig data delas
✅ **Säkerhet** - Session-baserad mapping, automatisk radering
✅ **Transparens** - Full dokumentation och loggning
✅ **Användarrättigheter** - Tillgång, radering, export

**Systemet är GDPR-compliant enligt design.**

---
*Senast uppdaterad: 2026-01-25*
*Version: 1.0*
