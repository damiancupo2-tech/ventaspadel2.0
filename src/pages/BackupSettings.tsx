import React from 'react';
import { Shield, Database, Cloud, Settings, CheckCircle } from 'lucide-react';
import BackupManager from '../components/BackupManager';
import SupabaseStatus from '../components/SupabaseStatus';
import SupabaseTestRunner from '../components/SupabaseTestRunner';

const BackupSettings: React.FC = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Shield className="h-8 w-8 text-green-600 mr-3" />
            Backup y Seguridad
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona los backups automáticos y la seguridad de tus datos
          </p>
        </div>
      </div>

      {/* Información del sistema */}
      <SupabaseStatus />

      {/* Suite de pruebas */}
      <SupabaseTestRunner />

      {/* Estadísticas del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Database className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Almacenamiento Local</p>
              <p className="text-lg font-bold text-gray-900">Activo</p>
              <p className="text-xs text-gray-500">IndexedDB + localStorage</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Cloud className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Backup en la Nube</p>
              <p className="text-lg font-bold text-gray-900">Supabase</p>
              <p className="text-xs text-gray-500">Backup automático cada 6h</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Funcionamiento</p>
              <p className="text-lg font-bold text-gray-900">Híbrido</p>
              <p className="text-xs text-gray-500">Local + Nube</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Datos Respaldados</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>📦 Productos (12 tablas)</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>🛒 Ventas y movimientos</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>🏓 Canchas y servicios</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>👥 Carnets de socios</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>⏰ Turnos y contadores</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span>📜 Historial completo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-blue-900 mb-3">ℹ️ Información del Sistema de Backup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">🔄 Funcionamiento Híbrido:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>La aplicación funciona completamente offline</li>
              <li>Los datos se guardan localmente en tu dispositivo</li>
              <li>Los backups se envían automáticamente a la nube</li>
              <li>Puedes restaurar desde cualquier backup</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">⚡ Backup Automático:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Se ejecuta cada 6 horas automáticamente</li>
              <li>Solo si hay cambios en los datos</li>
              <li>Se mantienen los últimos 30 backups</li>
              <li>Los backups antiguos se eliminan automáticamente</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Gestor de backups */}
      <BackupManager />
    </div>
  );
};

export default BackupSettings;