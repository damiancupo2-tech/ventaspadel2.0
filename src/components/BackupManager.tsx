import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Cloud, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Trash2,
  RefreshCw,
  Database
} from 'lucide-react';
import { useAutoBackup } from '../hooks/useAutoBackup';
import { BackupRecord, SyncLog } from '../utils/supabase';

const BackupManager: React.FC = () => {
  const { isEnabled, createBackup, getBackups, restoreBackup, getLogs } = useAutoBackup();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'backups' | 'logs'>('backups');

  useEffect(() => {
    if (isEnabled) {
      loadData();
    }
  }, [isEnabled]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [backupList, logList] = await Promise.all([
        getBackups(),
        getLogs()
      ]);
      setBackups(backupList);
      setLogs(logList);
    } catch (error) {
      console.error('Error cargando datos de backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const result = await createBackup();
      if (result.success) {
        alert('Backup creado exitosamente');
        await loadData();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('Error al crear backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!window.confirm('¿Está seguro de restaurar este backup? Se sobrescribirán todos los datos actuales.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await restoreBackup(backupId);
      if (result.success) {
        alert('Datos restaurados exitosamente');
        window.location.reload(); // Recargar para mostrar los datos restaurados
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('Error al restaurar backup');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-yellow-800">Backup Automático No Configurado</h3>
            <p className="text-yellow-700 mt-1">
              Para habilitar el backup automático, configure las variables de entorno de Supabase:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-600 mt-2">
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setSelectedTab('backups')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'backups'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="h-4 w-4 inline mr-2" />
            Backups
          </button>
          <button
            onClick={() => setSelectedTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'logs'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Historial
          </button>
        </nav>
      </div>

      <div className="p-6">
        {selectedTab === 'backups' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Cloud className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Backups en la Nube</h3>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
                <button
                  onClick={handleCreateBackup}
                  disabled={isLoading}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Crear Backup
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Backup Automático Activo</p>
                  <p>Se crean backups automáticamente cada 6 horas y se mantienen los últimos 30.</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>✅ 12 tablas principales</div>
                    <div>✅ Carnets de socios</div>
                    <div>✅ Contadores de recibos</div>
                    <div>✅ Historial de transacciones</div>
                    <div>✅ Configuración del sistema</div>
                    <div>✅ Datos de clases (futuro)</div>
                  </div>
                </div>
              </div>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-8">
                <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay backups disponibles</h3>
                <p className="text-gray-500 mb-4">Cree su primer backup para proteger sus datos</p>
                <button
                  onClick={handleCreateBackup}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Crear Primer Backup
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div key={backup.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <Database className="h-5 w-5 text-gray-600 mr-2" />
                          <h4 className="font-medium text-gray-900">
                            Backup {backup.backup_type === 'full' ? 'Completo' : 'Incremental'}
                          </h4>
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            v{backup.version}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Creado: {new Date(backup.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRestore(backup.id)}
                          disabled={isLoading}
                          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Restaurar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-gray-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Historial de Sincronización</h3>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros disponibles</h3>
                <p className="text-gray-500">Los registros de backup aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {log.action === 'backup' ? 'Backup' : 'Restauración'}
                          </p>
                          <p className="text-sm text-gray-600">{log.message}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager;