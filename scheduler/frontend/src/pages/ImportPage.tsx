/**
 * Import/Export Page - Excel-based bulk operations
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/Common/Button';
import { ExcelUpload } from '../components/Import/ExcelUpload';
import { Download, Upload, FileSpreadsheet, ListChecks, History, Lightbulb, AlertTriangle } from 'lucide-react';
import apiClient from '../api/client';

export function ImportPage() {
  const [showUpload, setShowUpload] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get('/import-export/template', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'skolschema_import_mall.xlsx';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Kunde inte ladda ner mallen. Försök igen.');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-surface-900 text-display">Excel Import/Export</h1>
              <p className="text-surface-500 mt-1">
                Importera elever, personal och scheman i bulk från Excel
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-step guide */}
        <div className="card">
          <div className="p-6 border-b border-surface-100">
            <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary-500" />
              Steg för steg
            </h2>
          </div>

          <div className="p-6 space-y-8">
            {/* Step 1: Download template */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-surface-900 mb-2">
                  Ladda ner Excel-mallen
                </h3>
                <p className="text-surface-500 text-sm mb-3">
                  Ladda ner vår strukturerade Excel-mall med 6 ark för elever, personal, klasser,
                  omsorgstider och arbetstider.
                </p>
                <Button
                  onClick={handleDownloadTemplate}
                  size="sm"
                  icon={Download}
                >
                  Ladda ner mall (skolschema_import_mall.xlsx)
                </Button>
              </div>
            </div>

            {/* Step 2: Fill in template */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-surface-900 mb-2">
                  Fyll i mallen
                </h3>
                <p className="text-surface-500 text-sm mb-3">
                  Öppna filen i Excel och fyll i data enligt instruktionerna i första arket.
                </p>

                <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-primary-900 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4" />
                    Tips:
                  </p>
                  <ul className="space-y-1 text-primary-800">
                    <li>Börja med arket "Klasser"</li>
                    <li>Sedan "Elever" och "Personal"</li>
                    <li>Avsluta med "Omsorgstider" och "Arbetstider"</li>
                    <li>Ändra INTE kolumnrubrikerna</li>
                    <li>Personnummer måste vara unika</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3: Upload */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-surface-900 mb-2">
                  Ladda upp ifylld fil
                </h3>
                <p className="text-surface-500 text-sm mb-3">
                  Spara filen och ladda upp den här. Systemet kommer förhandsgranska och validera
                  data innan import.
                </p>

                {!showUpload ? (
                  <Button
                    onClick={() => setShowUpload(true)}
                    size="sm"
                    icon={Upload}
                  >
                    Ladda upp Excel-fil
                  </Button>
                ) : (
                  <ExcelUpload onClose={() => setShowUpload(false)} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Previous imports */}
        <div className="card">
          <div className="p-6 border-b border-surface-100">
            <h2 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
              <History className="h-5 w-5 text-primary-500" />
              Tidigare importer
            </h2>
          </div>

          <div className="p-6">
            <div className="text-center py-8 text-surface-400">
              <p>Inga tidigare importer att visa</p>
              <p className="text-sm mt-2">
                När du importerar data kommer historiken att visas här
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-warning-50 border border-warning-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning-800">
            <strong>Obs:</strong> Import kommer att uppdatera befintliga poster om personnummer
            matchar. Dubbletter hanteras automatiskt.
          </p>
        </div>
      </div>
    </div>
  );
}
