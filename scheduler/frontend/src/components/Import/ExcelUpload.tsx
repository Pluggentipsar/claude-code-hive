/**
 * Excel Upload Component - Drag-drop file upload with preview
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '../Common/Button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import apiClient, { getErrorMessage } from '../../api/client';

interface ExcelUploadProps {
  onClose: () => void;
}

interface ParsedPreview {
  students_count: number;
  staff_count: number;
  classes_count: number;
}

interface Conflict {
  personal_number?: string;
  name?: string;
  action: string;
}

interface ParseResponse {
  status: string;
  message: string;
  data: ParsedPreview;
  conflicts: {
    students: Conflict[];
    staff: Conflict[];
    classes: Conflict[];
  };
  preview: {
    students: Array<{ personal_number: string; name: string; grade: number; class: string }>;
    staff: Array<{ personal_number: string; name: string; role: string }>;
    classes: Array<{ name: string; grade_group: string }>;
  };
}

export function ExcelUpload({ onClose }: ExcelUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Endast .xlsx filer stöds');
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result: ParseResponse = response.data;
      setParseResult(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/excel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;
      toast.success(`Import lyckades! ${JSON.stringify(result.stats)}`);
      onClose();
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-2 border-surface-200 rounded-2xl p-6 bg-surface-50">
      {/* Upload area */}
      {!parseResult && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary-400 bg-primary-50'
              : 'border-surface-300 bg-white hover:border-surface-400'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="h-6 w-6 text-surface-400" />
          </div>

          {!file ? (
            <>
              <p className="text-surface-700 mb-2">
                Dra och släpp Excel-fil här eller
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium">
                  välj fil från datorn
                </span>
              </label>
              <p className="text-xs text-surface-400 mt-2">
                Endast .xlsx filer
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-success-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{file.name}</span>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setFile(null)}
                  size="sm"
                  variant="secondary"
                >
                  Välj annan fil
                </Button>
                <Button
                  onClick={handleUpload}
                  size="sm"
                  variant="primary"
                  isLoading={isUploading}
                  icon={Upload}
                >
                  Förhandsgranska
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 bg-danger-50 border border-danger-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger-900">Fel vid uppladdning</p>
            <p className="text-sm text-danger-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Parse result preview */}
      {parseResult && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success-600" />
              <span>Förhandsgranskning</span>
            </h3>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-primary-50 rounded-xl">
                <div className="text-2xl font-bold text-primary-600 tabular-nums">
                  {parseResult.data.students_count}
                </div>
                <div className="text-sm text-primary-700">Elever</div>
              </div>
              <div className="text-center p-3 bg-success-50 rounded-xl">
                <div className="text-2xl font-bold text-success-600 tabular-nums">
                  {parseResult.data.staff_count}
                </div>
                <div className="text-sm text-success-700">Personal</div>
              </div>
              <div className="text-center p-3 bg-warning-50 rounded-xl">
                <div className="text-2xl font-bold text-warning-600 tabular-nums">
                  {parseResult.data.classes_count}
                </div>
                <div className="text-sm text-warning-700">Klasser</div>
              </div>
            </div>

            {/* Conflicts */}
            {(parseResult.conflicts.students.length > 0 ||
              parseResult.conflicts.staff.length > 0 ||
              parseResult.conflicts.classes.length > 0) && (
              <div className="bg-warning-50 border border-warning-100 rounded-xl p-4 mb-4 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-warning-900 text-sm">
                    {parseResult.conflicts.students.length + parseResult.conflicts.staff.length + parseResult.conflicts.classes.length} dubletter
                  </p>
                  <p className="text-sm text-warning-800">
                    Dessa kommer att uppdateras med ny data från Excel-filen.
                  </p>
                </div>
              </div>
            )}

            {/* Preview data */}
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-surface-700 hover:text-surface-900">
                Visa detaljer
              </summary>
              <div className="mt-3 space-y-3">
                {parseResult.preview.students.length > 0 && (
                  <div>
                    <p className="font-medium text-surface-700 mb-1">Elever (första 10):</p>
                    <ul className="text-xs text-surface-600 space-y-1">
                      {parseResult.preview.students.map((s, i) => (
                        <li key={i}>
                          {s.name} - Årskurs {s.grade} - Klass {s.class}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parseResult.preview.staff.length > 0 && (
                  <div>
                    <p className="font-medium text-surface-700 mb-1">Personal (första 10):</p>
                    <ul className="text-xs text-surface-600 space-y-1">
                      {parseResult.preview.staff.map((s, i) => (
                        <li key={i}>
                          {s.name} - {s.role}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setParseResult(null);
                setFile(null);
              }}
              variant="secondary"
              className="flex-1"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleConfirmImport}
              variant="primary"
              className="flex-1"
              isLoading={isUploading}
              icon={CheckCircle2}
            >
              Bekräfta import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
