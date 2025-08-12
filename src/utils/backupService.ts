import { supabase, isSupabaseConfigured, BackupRecord, SyncLog } from './supabase';
import { updateDeviceIdHeader } from './supabase';
import { exportData } from './db';

// Generar ID único del dispositivo
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device-id', deviceId);
  }
  return deviceId;
};

// Versión actual del esquema de datos
const CURRENT_VERSION = '1.0.0';

export class BackupService {
  private deviceId: string;
  private isEnabled: boolean;

  constructor() {
    this.deviceId = getDeviceId();
    this.isEnabled = isSupabaseConfigured();
    
    // Configurar el device_id en las headers de Supabase
    if (this.isEnabled) {
      updateDeviceIdHeader(this.deviceId);
    }
  }

  // Verificar si el servicio está habilitado
  isBackupEnabled(): boolean {
    return this.isEnabled;
  }

  // Crear backup completo
  async createFullBackup(): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled) {
      return { success: false, message: 'Supabase no está configurado' };
    }

    try {
      console.log('🔄 Iniciando backup completo...');
      console.log('🆔 Device ID:', this.deviceId);
      
      // Exportar todos los datos locales
      const data = await exportData();
      console.log('✅ Datos locales exportados:', Object.keys(data));
      
      // Crear registro de backup
      const backupRecord: Omit<BackupRecord, 'id' | 'created_at'> = {
        backup_type: 'full',
        data,
        device_id: this.deviceId,
        version: CURRENT_VERSION
      };
      
      console.log('📦 Creando backup:', {
        backup_type: backupRecord.backup_type,
        device_id: backupRecord.device_id,
        version: backupRecord.version,
        data_keys: Object.keys(data)
      });

      const { error: backupError } = await supabase
        .from('backups')
        .insert([backupRecord]);

      if (backupError) {
        console.error('❌ Error detallado de Supabase:', {
          code: backupError.code,
          message: backupError.message,
          details: backupError.details,
          hint: backupError.hint
        });
        throw backupError;
      }
      
      console.log('✅ Backup creado exitosamente');

      // Registrar log de éxito
      await this.logSync('backup', 'success', 'Backup completo creado exitosamente');

      return { success: true, message: 'Backup creado exitosamente' };
    } catch (error) {
      console.error('❌ Error completo en backup:', error);
      
      let errorMessage = 'Error desconocido';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message;
      } else if (error && typeof error === 'object' && 'code' in error) {
        errorMessage = `Código ${(error as any).code}: ${(error as any).message || 'Error de base de datos'}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      
      await this.logSync('backup', 'error', errorMessage);
      return { success: false, message: `Error al crear backup: ${errorMessage}` };
    }
  }

  // Obtener lista de backups
  async getBackupList(): Promise<BackupRecord[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .eq('device_id', this.deviceId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error obteniendo lista de backups:', error);
      return [];
    }
  }

  // Restaurar desde backup
  async restoreFromBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled) {
      return { success: false, message: 'Supabase no está configurado' };
    }

    try {
      // Obtener el backup
      const { data: backup, error: fetchError } = await supabase
        .from('backups')
        .select('*')
        .eq('id', backupId)
        .eq('device_id', this.deviceId)
        .single();

      if (fetchError || !backup) {
        throw new Error('Backup no encontrado');
      }

      // Importar los datos (esto requiere implementar importData en db.ts)
      const { importData } = await import('./db');
      await importData(backup.data);

      // Registrar log de éxito
      await this.logSync('restore', 'success', `Datos restaurados desde backup ${backupId}`);

      return { success: true, message: 'Datos restaurados exitosamente' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      await this.logSync('restore', 'error', errorMessage);
      return { success: false, message: `Error al restaurar: ${errorMessage}` };
    }
  }

  // Backup automático (llamar periódicamente)
  async autoBackup(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Verificar si ya hay un backup reciente (últimas 24 horas)
      const { data: recentBackups } = await supabase
        .from('backups')
        .select('created_at')
        .eq('device_id', this.deviceId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      // Si ya hay un backup reciente, no crear otro
      if (recentBackups && recentBackups.length > 0) {
        return;
      }

      // Crear backup automático
      await this.createFullBackup();
    } catch (error) {
      console.error('Error en backup automático:', error);
    }
  }

  // Limpiar backups antiguos (mantener solo los últimos 30)
  async cleanOldBackups(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Obtener backups antiguos
      const { data: oldBackups } = await supabase
        .from('backups')
        .select('id')
        .eq('device_id', this.deviceId)
        .order('created_at', { ascending: false })
        .range(30, 1000); // Mantener solo los primeros 30

      if (oldBackups && oldBackups.length > 0) {
        const idsToDelete = oldBackups.map(backup => backup.id);
        
        await supabase
          .from('backups')
          .delete()
          .in('id', idsToDelete);
      }
    } catch (error) {
      console.error('Error limpiando backups antiguos:', error);
    }
  }

  // Registrar log de sincronización
  private async logSync(action: 'backup' | 'restore', status: 'success' | 'error', message: string): Promise<void> {
    try {
      const logRecord: Omit<SyncLog, 'id' | 'created_at'> = {
        action,
        status,
        message,
        device_id: this.deviceId
      };

      await supabase
        .from('sync_logs')
        .insert([logRecord]);
    } catch (error) {
      console.error('Error registrando log:', error);
    }
  }

  // Obtener logs de sincronización
  async getSyncLogs(limit: number = 50): Promise<SyncLog[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('device_id', this.deviceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      return [];
    }
  }
}

// Instancia singleton del servicio
export const backupService = new BackupService();