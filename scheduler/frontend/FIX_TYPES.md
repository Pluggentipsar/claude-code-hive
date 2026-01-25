# TypeScript Fixes Needed

## 1. src/api/client.ts
Line 5: Change to type-only import
```typescript
import axios, type { AxiosInstance, AxiosError } from 'axios';
```

## 2. src/types/index.ts
Remove const enums, use regular enums instead. Change all instances of:
```typescript
export const enum X {
```
to:
```typescript
export enum X {
```

## 3. src/pages/StaffPage.tsx
- Line 10: Fix import path `../Common/Button` → `../components/Common/Button`
- Remove unused import `useCreateStaff`
- Remove unused variable `showAbsenceForm`
- Fix absenceData to not include start_time/end_time as null (make them optional)

## 4. src/components/Schedule/WeekView.tsx and DayView.tsx
- Remove unused import `minutesToTime`
- Remove unused variable `timeRange` in WeekView

Ready to fix!
