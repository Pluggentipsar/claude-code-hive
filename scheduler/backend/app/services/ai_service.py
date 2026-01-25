"""
AI-Assisted Scheduling Service using Claude API via Azure.

Provides intelligent suggestions for conflict resolution, explanations,
and predictions.

GDPR COMPLIANCE:
- ALL data is anonymized before being sent to Claude API
- No personal names, personnummer, or specific medical information leaves the server
- See app.services.anonymization for implementation details
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import httpx

from app.models import Schedule, StaffAssignment, Student, Staff, Absence
from app.config import settings
from app.services.anonymization import anonymization_service


class AIAdvisorService:
    """
    AI advisor using Claude API for intelligent scheduling assistance.

    Provides:
    - Conflict resolution suggestions
    - Assignment explanations
    - Problem predictions
    """

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        """
        Initialize AI service with Azure OpenAI endpoint.

        Args:
            api_key: Azure API key (defaults to settings.azure_api_key)
            endpoint: Azure endpoint URL (defaults to settings.azure_ai_endpoint)
        """
        self.api_key = api_key or settings.azure_api_key
        self.endpoint = endpoint or settings.azure_ai_endpoint
        self.model = settings.anthropic_model

        if not self.api_key:
            raise ValueError(
                "Azure API key not configured. "
                "Set AZURE_API_KEY in environment variables."
            )

        if not self.endpoint:
            raise ValueError(
                "Azure endpoint not configured. "
                "Set AZURE_AI_ENDPOINT in environment variables."
            )

        # HTTP client for Azure API calls
        self.http_client = httpx.Client(timeout=30.0)

    def _call_azure_claude(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1000,
        temperature: float = 0.7,
        system: Optional[str] = None
    ) -> str:
        """
        Call Azure OpenAI endpoint for Claude model.

        Args:
            messages: List of message dictionaries
            max_tokens: Maximum tokens in response
            temperature: Response randomness (0-1)
            system: Optional system message

        Returns:
            Response text from Claude

        Raises:
            httpx.HTTPError: If API call fails
        """
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01"
        }

        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages
        }

        if system:
            payload["system"] = system

        try:
            response = self.http_client.post(
                self.endpoint,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            # Azure response format matches Anthropic API
            return data["content"][0]["text"]

        except httpx.HTTPError as e:
            print(f"Azure API error: {str(e)}")
            raise

    def suggest_conflict_resolution(
        self,
        schedule: Schedule,
        conflicts: List[Dict[str, Any]],
        available_staff: List[Staff],
        absences: List[Absence]
    ) -> List[Dict[str, Any]]:
        """
        Use Claude to suggest solutions for scheduling conflicts.

        Args:
            schedule: Current schedule with conflicts
            conflicts: List of detected conflicts
            available_staff: List of available staff members
            absences: List of absences causing issues

        Returns:
            List of suggestions with actions and reasoning
        """
        # Build context for Claude
        context = self._build_conflict_context(schedule, conflicts, available_staff, absences)

        prompt = f"""Du är en expert på schemaläggning för anpassade grundskolor i Sverige.

AKTUELL SITUATION:
Vecka: {schedule.week_number}, {schedule.year}
Status: {schedule.solver_status.value}
Antal konflikter: {len(conflicts)}

KONFLIKTER:
{self._format_conflicts(conflicts)}

TILLGÄNGLIG PERSONAL:
{self._format_available_staff(available_staff, absences)}

FRÅNVARANDE PERSONAL:
{self._format_absences(absences)}

DIN UPPGIFT:
Analysera konflikterna och föreslå konkreta lösningar. För varje konflikt:

1. Identifiera grundorsaken
2. Föreslå 2-3 konkreta åtgärder (rangordnade efter effektivitet)
3. Beakta:
   - Vårdkrav måste matchas med certifierad personal
   - Trygghetsbehov bör prioriteras
   - Jämn arbetsfördelning
   - Kostnader (vikarier, övertid)

SVARA I DETTA JSON-FORMAT:
{{
  "suggestions": [
    {{
      "conflict_id": "string",
      "root_cause": "string",
      "actions": [
        {{
          "description": "string",
          "type": "reassign|substitute|reduce_hours|merge_classes",
          "affected_staff": ["string"],
          "affected_students": ["string"],
          "estimated_cost_sek": number,
          "confidence": "high|medium|low",
          "reasoning": "string"
        }}
      ]
    }}
  ],
  "overall_assessment": "string",
  "priority_order": ["conflict_id_1", "conflict_id_2", ...]
}}"""

        try:
            # Call Azure Claude API
            response_text = self._call_azure_claude(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=3000,
                temperature=0.7
            )

            # Extract JSON from response
            suggestions = self._parse_json_response(response_text)

            return suggestions.get('suggestions', [])

        except Exception as e:
            print(f"AI suggestion error: {str(e)}")
            return self._fallback_suggestions(conflicts)

    def explain_assignment(
        self,
        assignment: StaffAssignment,
        schedule: Schedule,
        student: Student,
        staff: Staff
    ) -> str:
        """
        Explain why a particular assignment was made.

        Args:
            assignment: The assignment to explain
            schedule: Full schedule context
            student: Student in assignment
            staff: Staff member in assignment

        Returns:
            Human-readable explanation
        """
        weekday_names = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag']
        weekday = weekday_names[assignment.weekday]

        prompt = f"""Förklara varför denna schemaläggning gjordes på ett pedagogiskt sätt.

TILLDELNING:
Personal: {staff.full_name} ({staff.role.value})
Elev: {student.full_name} (årskurs {student.grade})
Tid: {weekday} {assignment.start_time}-{assignment.end_time}
Typ: {assignment.assignment_type.value}

KONTEXT:
Elevens behov:
- Vårdbehov: {student.care_requirements if student.has_care_needs else 'Inga'}
- Preferenser: {student.preferred_staff if student.preferred_staff else 'Inga specifika'}
- Dubbelbemanning: {'Ja' if student.requires_double_staffing else 'Nej'}

Personalens kompetens:
- Certifieringar: {staff.care_certifications if staff.care_certifications else 'Inga särskilda'}

Ge en kort, tydlig förklaring (2-3 meningar) på svenska som är lätt att förstå för icke-teknisk personal.
Fokusera på VARFÖR detta val gjordes."""

        try:
            # Call Azure Claude API
            response_text = self._call_azure_claude(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.5
            )

            return response_text.strip()

        except Exception as e:
            print(f"AI explanation error: {str(e)}")
            return self._fallback_explanation(assignment, student, staff)

    def predict_problems(
        self,
        schedule: Schedule,
        historical_schedules: List[Schedule] = None
    ) -> List[Dict[str, Any]]:
        """
        Predict potential problems with the schedule before they occur.

        Args:
            schedule: Current schedule to analyze
            historical_schedules: Previous schedules for pattern detection

        Returns:
            List of predicted problems with severity
        """
        prompt = f"""Analysera detta schema och förutse potentiella problem.

SCHEMA:
Vecka: {schedule.week_number}, {schedule.year}
Antal tilldelningar: {len(schedule.assignments)}
Status: {schedule.solver_status.value}
Hårda constraints uppfyllda: {'Ja' if schedule.hard_constraints_met else 'Nej'}
Mjuka constraints poäng: {schedule.soft_constraints_score:.1f}/100

STATISTIK:
{self._get_schedule_statistics(schedule)}

BASERAT PÅ ERFARENHET AV SCHEMALÄGGNING I SKOLOR:

1. Identifiera potentiella problem (ex: överbelastning, för få pauser, risk för konflikter)
2. Ge varje problem en svårighetsgrad (critical, high, medium, low)
3. Föreslå förebyggande åtgärder

SVARA I JSON-FORMAT:
{{
  "predictions": [
    {{
      "problem": "string",
      "severity": "critical|high|medium|low",
      "likelihood": "high|medium|low",
      "impact": "string",
      "preventive_actions": ["string"],
      "early_warning_signs": ["string"]
    }}
  ]
}}"""

        try:
            # Call Azure Claude API
            response_text = self._call_azure_claude(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000,
                temperature=0.7
            )

            predictions = self._parse_json_response(response_text)
            return predictions.get('predictions', [])

        except Exception as e:
            print(f"AI prediction error: {str(e)}")
            return []

    def generate_weekly_summary(
        self,
        schedule: Schedule,
        students: List[Student],
        staff: List[Staff]
    ) -> str:
        """
        Generate a human-readable summary of the week's schedule.

        Args:
            schedule: Schedule to summarize
            students: List of students
            staff: List of staff

        Returns:
            Summary text in Swedish
        """
        prompt = f"""Skapa en sammanfattning av veckans schema för skolpersonal.

VECKA {schedule.week_number}, {schedule.year}
Totalt {len(students)} elever, {len(staff)} personal
{len(schedule.assignments)} tilldelningar

NYCKELTAL:
{self._get_schedule_statistics(schedule)}

Skriv en kort, positiv sammanfattning (3-4 stycken) som:
1. Beskriver hur schemat ser ut
2. Lyfter fram bra saker (jämn fördelning, matchade preferenser, etc.)
3. Nämner eventuella utmaningar på ett konstruktivt sätt
4. Ger tips för veckan

Håll tonen professionell men varm. Målgrupp: lärare och assistenter."""

        try:
            # Call Azure Claude API
            response_text = self._call_azure_claude(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.7
            )

            return response_text.strip()

        except Exception as e:
            print(f"AI summary error: {str(e)}")
            return "Sammanfattning kunde inte genereras."

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _build_conflict_context(
        self,
        schedule: Schedule,
        conflicts: List[Dict],
        available_staff: List[Staff],
        absences: List[Absence]
    ) -> Dict[str, Any]:
        """Build context dictionary for AI prompts."""
        return {
            'week': schedule.week_number,
            'year': schedule.year,
            'conflicts': conflicts,
            'available_staff_count': len(available_staff),
            'absences_count': len(absences),
        }

    def _format_conflicts(self, conflicts: List[Dict[str, Any]]) -> str:
        """Format conflicts as readable text."""
        if not conflicts:
            return "Inga konflikter."

        lines = []
        for i, conflict in enumerate(conflicts, 1):
            lines.append(f"{i}. {conflict.get('type', 'UNKNOWN')}: {conflict.get('message', '')}")

        return "\n".join(lines)

    def _format_available_staff(
        self,
        staff: List[Staff],
        absences: List[Absence]
    ) -> str:
        """Format available staff as readable text."""
        absent_ids = {a.staff_id for a in absences}
        available = [s for s in staff if s.id not in absent_ids]

        if not available:
            return "Ingen tillgänglig personal."

        lines = []
        for s in available[:10]:  # Limit to first 10
            certs = ', '.join(s.care_certifications) if s.care_certifications else 'Inga certifieringar'
            lines.append(f"- {s.full_name} ({s.role.value}): {certs}")

        if len(available) > 10:
            lines.append(f"... och {len(available) - 10} till")

        return "\n".join(lines)

    def _format_absences(self, absences: List[Absence]) -> str:
        """Format absences as readable text."""
        if not absences:
            return "Inga frånvarande."

        lines = []
        for absence in absences:
            staff_name = absence.staff.full_name if absence.staff else "Okänd"
            date_str = absence.absence_date.strftime('%Y-%m-%d')
            reason = absence.reason.value
            lines.append(f"- {staff_name}: {date_str} ({reason})")

        return "\n".join(lines)

    def _get_schedule_statistics(self, schedule: Schedule) -> str:
        """Get schedule statistics as formatted string."""
        if not schedule.assignments:
            return "Inga tilldelningar."

        # Calculate stats
        staff_hours = {}
        for assignment in schedule.assignments:
            staff_id = assignment.staff_id
            # Simple hour calculation
            start_h, start_m = map(int, assignment.start_time.split(':'))
            end_h, end_m = map(int, assignment.end_time.split(':'))
            hours = (end_h * 60 + end_m - start_h * 60 - start_m) / 60

            if staff_id not in staff_hours:
                staff_hours[staff_id] = 0
            staff_hours[staff_id] += hours

        avg_hours = sum(staff_hours.values()) / len(staff_hours) if staff_hours else 0
        max_hours = max(staff_hours.values()) if staff_hours else 0
        min_hours = min(staff_hours.values()) if staff_hours else 0

        return f"""
- Genomsnittlig arbetstid: {avg_hours:.1f}h
- Max arbetstid: {max_hours:.1f}h
- Min arbetstid: {min_hours:.1f}h
- Personal som arbetar: {len(staff_hours)}
"""

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from Claude's response, handling markdown code blocks."""
        # Try to find JSON in response
        try:
            # Remove markdown code blocks if present
            if '```json' in text:
                start = text.find('```json') + 7
                end = text.find('```', start)
                text = text[start:end].strip()
            elif '```' in text:
                start = text.find('```') + 3
                end = text.find('```', start)
                text = text[start:end].strip()

            return json.loads(text)
        except json.JSONDecodeError:
            # Fallback: try to parse entire response
            try:
                return json.loads(text)
            except:
                return {}

    def _fallback_suggestions(self, conflicts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Provide basic fallback suggestions when AI fails."""
        suggestions = []

        for conflict in conflicts:
            suggestions.append({
                'conflict_id': conflict.get('id', 'unknown'),
                'root_cause': 'AI-analys misslyckades - manuell granskning krävs',
                'actions': [
                    {
                        'description': 'Granska konflikten manuellt',
                        'type': 'manual_review',
                        'confidence': 'low',
                        'reasoning': 'Automatiska förslag kunde inte genereras'
                    }
                ]
            })

        return suggestions

    def _fallback_explanation(
        self,
        assignment: StaffAssignment,
        student: Student,
        staff: Staff
    ) -> str:
        """Provide basic fallback explanation when AI fails."""
        explanation = f"{staff.full_name} tilldelades {student.full_name}"

        if student.has_care_needs and staff.care_certifications:
            explanation += f" eftersom personalen har nödvändiga certifieringar ({', '.join(staff.care_certifications)})"
        elif str(staff.id) in (student.preferred_staff or []):
            explanation += " enligt elevens preferenser"
        else:
            explanation += " baserat på tillgänglighet och arbetsbelastning"

        return explanation + "."
