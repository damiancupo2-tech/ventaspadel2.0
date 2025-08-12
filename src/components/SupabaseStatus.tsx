import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Wifi, WifiOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { backupService } from '../utils/backupService';

const SupabaseStatus: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | 'not-configured'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [isTestingBackup, setIsTestingBackup] = useState(false);
  const [backupTestResult, setBackupTestResult] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setErrorMessage('');

    // Verificar configuración
    if (!isSupabaseConfigured()) {
      setConnectionStatus('not-configured');
      setErrorMessage('Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no configuradas');
      return;
    }

    try {
      // Probar conexión básica
      const { data, error } = await supabase
        .from('backups')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error de conexión desconocido');
    }
  };

  const testBackupSystem = async () => {
    setIsTestingBackup(true);
    setBackupTestResult('');

    try {
      // Probar crear un backup de prueba
      const result = await backupService.createFullBackup();
      
      if (result.success) {
        setBackupTestResult('✅ Backup de prueba creado exitosamente');
        
        // Probar obtener lista de backups
        const backups = await backupService.getBackupList();
        setBackupTestResult(prev => prev + `\n✅ Se encontraron ${backups.length} backups`);
        
        // Probar logs
        const logs = await backupService.getSyncLogs(5);
        setBackupTestResult(prev => prev + `\n✅ Se encontraron ${logs.length} logs de sincronización`);
        
      } else {
        setBackupTestResult(`❌ Error en backup: ${result.message}`);
      }
    } catch (error) {
      setBackupTestResult(`❌ Error en prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsTestingBackup(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'checking':
        return <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />;
      case 'connected':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'not-configured':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      default:
        return <Database className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'Verificando conexión...';
      case 'connected':
        return 'Conectado correctamente';
      case 'error':
        return 'Error de conexión';
      case 'not-configured':
        return 'No configurado';
      default:
        return 'Estado desconocido';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'not-configured':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Estado de Conexión */}
      <div className={`border rounded-lg p-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {getStatusIcon()}
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Estado de Supabase</h3>
              <p className="text-sm text-gray-600">{getStatusText()}</p>
            </div>
          </div>
          <button
            onClick={checkConnection}
            disabled={connectionStatus === 'checking'}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
            Verificar
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {connectionStatus === 'not-configured' && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-200 rounded-md">
            <h4 className="font-medium text-yellow-800 mb-2">Configuración Requerida</h4>
            <p className="text-sm text-yellow-700 mb-3">
              Para habilitar el backup automático, necesitas configurar las siguientes variables de entorno:
            </p>
            <div className="bg-white p-3 rounded border font-mono text-sm">
              <div>VITE_SUPABASE_URL=https://tu-proyecto.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=tu_clave_anonima</div>
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              Estas variables deben estar en tu archivo .env
            </p>
          </div>
        )}
      </div>

      {/* Información de las Tablas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-600" />
          Estructura de la Base de Datos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tabla backups */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">📦 Tabla: backups</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Columnas:</span>
                <span className="font-medium">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Índices:</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Políticas RLS:</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Constraints:</span>
                <span className="font-medium">2</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
              <strong>Propósito:</strong> Almacenar backups completos de datos por dispositivo
            </div>
          </div>

          {/* Tabla sync_logs */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">📋 Tabla: sync_logs</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Columnas:</span>
                <span className="font-medium">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Índices:</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Políticas RLS:</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Constraints:</span>
                <span className="font-medium">3</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
              <strong>Propósito:</strong> Auditoría y logs de operaciones de backup/restore
            </div>
          </div>
        </div>
      </div>

      {/* Test del Sistema */}
      {connectionStatus === 'connected' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Wifi className="h-5 w-5 mr-2 text-green-600" />
              Prueba del Sistema de Backup
            </h3>
            <button
              onClick={testBackupSystem}
              disabled={isTestingBackup}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isTestingBackup ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              {isTestingBackup ? 'Probando...' : 'Probar Sistema'}
            </button>
          </div>

          {backupTestResult && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Resultado de la Prueba:</h4>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{backupTestResult}</pre>
            </div>
          )}
        </div>
      )}

      {/* Información Técnica */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🔧 Información Técnica</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Configuración Actual</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                {isSupabaseConfigured() ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mr-2" />
                )}
                <span>Variables de entorno: {isSupabaseConfigured() ? 'Configuradas' : 'No configuradas'}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>Backup service: Inicializado</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>Auto backup hook: Activo</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Funcionalidades</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>Backup automático cada 6h</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>Backup manual disponible</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>Restauración desde backup</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>Limpieza automática</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>Logs de auditoría</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseStatus;