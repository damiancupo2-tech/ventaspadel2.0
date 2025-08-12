import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { testSupabase, ConnectionTest } from '../utils/testSupabase';

const SupabaseTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<ConnectionTest[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setHasRun(false);
    
    console.log('🧪 Iniciando suite de pruebas de Supabase...');

    try {
      const results = await testSupabase();
      setTestResults(results);
      setHasRun(true);
      console.log('✅ Suite de pruebas completada:', results);
    } catch (error) {
      console.error('Error running tests:', error);
      setTestResults([{
        step: 'Test Suite',
        status: 'error',
        message: `Error ejecutando tests: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      }]);
      setHasRun(true);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const totalTests = testResults.length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">🧪 Suite de Pruebas Completa</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? (
            <Clock className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isRunning ? 'Ejecutando...' : 'Ejecutar Pruebas'}
        </button>
      </div>

      {/* Resumen de resultados */}
      {hasRun && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800">Exitosos</p>
                <p className="text-2xl font-bold text-green-900">{successCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-red-800">Fallidos</p>
                <p className="text-2xl font-bold text-red-900">{errorCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-800">Total</p>
                <p className="text-2xl font-bold text-blue-900">{totalTests}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultados detallados */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Resultados Detallados:</h4>
          {testResults.map((result, index) => (
            <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(result.status)}
                  <div className="ml-3">
                    <h5 className="font-medium text-gray-900">{result.step}</h5>
                    <p className="text-sm text-gray-600">{result.message}</p>
                  </div>
                </div>
              </div>
              
              {result.details && (
                <div className="mt-3 p-3 bg-white bg-opacity-50 rounded border">
                  <pre className="text-xs text-gray-700 overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasRun && (
        <div className="text-center py-8">
          <Play className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Suite de Pruebas Lista</h3>
          <p className="text-gray-500 mb-4">
            Ejecuta las pruebas para verificar el funcionamiento completo del sistema de backup
          </p>
          <div className="text-sm text-gray-600">
            <p><strong>Pruebas incluidas:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Configuración de variables de entorno</li>
              <li>Conectividad con Supabase</li>
              <li>Acceso a tablas (backups, sync_logs)</li>
              <li>Funcionamiento de RLS</li>
              <li>Flujo completo de backup/restore</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupabaseTestRunner;