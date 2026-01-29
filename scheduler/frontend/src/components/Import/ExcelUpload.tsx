/**
 * Excel Upload Component - Drag-drop file upload with preview
 */

import { useState, useCallback } from 'react';
import { Button } from '../Common/Button';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

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

      const response = await fetch('http://localhost:8000/api/v1/import-export/excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Uppladdning misslyckades');
      }

      const result: ParseResponse = await response.json();
      setParseResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
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

      const response = await fetch('http://localhost:8000/api/v1/import-export/excel/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Import misslyckades');
      }

      const result = await response.json();
      alert(`✅ Import lyckades!\n\n${JSON.stringify(result.stats, null, 2)}`);
      onClose();
      window.location.reload(); // Reload to show new data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
      {/* Upload area */}
      {!parseResult && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary-600 bg-primary-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />

          {!file ? (
            <>
              <p className="text-gray-700 mb-2">
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
              <p className="text-xs text-gray-500 mt-2">
                Endast .xlsx filer
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{file.name}</span>
              </div>

              <div className="flex space-x-3 justify-center">
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
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Förhandsgranska</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Fel vid uppladdning</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Parse result preview */}
      {parseResult && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Förhandsgranskning</span>
            </h3>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {parseResult.data.students_count}
                </div>
                <div className="text-sm text-blue-700">Elever</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {parseResult.data.staff_count}
                </div>
                <div className="text-sm text-green-700">Personal</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">
                  {parseResult.data.classes_count}
                </div>
                <div className="text-sm text-yellow-700">Klasser</div>
              </div>
            </div>

            {/* Conflicts */}
            {(parseResult.conflicts.students.length > 0 ||
              parseResult.conflicts.staff.length > 0 ||
              parseResult.conflicts.classes.length > 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="font-semibold text-yellow-900 mb-2">
                  ⚠️ Hittade {parseResult.conflicts.students.length + parseResult.conflicts.staff.length + parseResult.conflicts.classes.length} dubletter
                </p>
                <p className="text-sm text-yellow-800">
                  Dessa kommer att uppdateras med ny data från Excel-filen.
                </p>
              </div>
            )}

            {/* Preview data */}
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                Visa detaljer
              </summary>
              <div className="mt-3 space-y-3">
                {parseResult.preview.students.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Elever (första 10):</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {parseResult.preview.students.map((s, i) => (
                        <li key={i}>
                          • {s.name} - Årskurs {s.grade} - Klass {s.class}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parseResult.preview.staff.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Personal (första 10):</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {parseResult.preview.staff.map((s, i) => (
                        <li key={i}>
                          • {s.name} - {s.role}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
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
            >
              ✅ Bekräfta import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
