/**
 * Import/Export Page - Excel-based bulk operations
 */

import { useState } from 'react';
import { Button } from '../components/Common/Button';
import { ExcelUpload } from '../components/Import/ExcelUpload';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';

export function ImportPage() {
  const [showUpload, setShowUpload] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/import-export/template');

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'skolschema_import_mall.xlsx';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Clean up after a delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Kunde inte ladda ner mallen. Försök igen.');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Excel Import/Export</h1>
              <p className="text-gray-600 mt-1">
                Importera elever, personal och scheman i bulk från Excel
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-step guide */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              📋 Steg för steg
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Download template */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Ladda ner Excel-mallen
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Ladda ner vår strukturerade Excel-mall med 6 ark för elever, personal, klasser,
                  omsorgstider och arbetstider.
                </p>
                <Button
                  onClick={handleDownloadTemplate}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Ladda ner mall (skolschema_import_mall.xlsx)</span>
                </Button>
              </div>
            </div>

            {/* Step 2: Fill in template */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Fyll i mallen
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Öppna filen i Excel och fyll i data enligt instruktionerna i första arket.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-blue-900 mb-2">💡 Tips:</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Börja med arket "📚 Klasser"</li>
                    <li>• Sedan "👶 Elever" och "👤 Personal"</li>
                    <li>• Avsluta med "⏰ Omsorgstider" och "💼 Arbetstider"</li>
                    <li>• Ändra INTE kolumnrubrikerna</li>
                    <li>• Personnummer måste vara unika</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3: Upload */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Ladda upp ifylld fil
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Spara filen och ladda upp den här. Systemet kommer förhandsgranska och validera
                  data innan import.
                </p>

                {!showUpload ? (
                  <Button
                    onClick={() => setShowUpload(true)}
                    size="sm"
                    variant="primary"
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Ladda upp Excel-fil</span>
                  </Button>
                ) : (
                  <ExcelUpload onClose={() => setShowUpload(false)} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Previous imports */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              📜 Tidigare importer
            </h2>
          </div>

          <div className="p-6">
            <div className="text-center py-8 text-gray-400">
              <p>Inga tidigare importer att visa</p>
              <p className="text-sm mt-2">
                När du importerar data kommer historiken att visas här
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Obs:</strong> Import kommer att uppdatera befintliga poster om personnummer
            matchar. Dubbletter hanteras automatiskt.
          </p>
        </div>
      </div>
    </div>
  );
}
