import { supabase, isSupabaseConfigured } from './supabase';
import { exportData } from './db';

export interface ConnectionTest {
  step: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

export class SupabaseTestSuite {
  private results: ConnectionTest[] = [];

  async runFullTest(): Promise<ConnectionTest[]> {
    this.results = [];
    
    await this.testConfiguration();
    await this.testConnection();
    await this.testTables();
    await this.testRLS();
    await this.testBackupFlow();
    
    return this.results;
  }

  private addResult(step: string, status: 'success' | 'error', message: string, details?: any) {
    this.results.push({ step, status, message, details });
  }

  private async testConfiguration() {
    try {
      const isConfigured = isSupabaseConfigured();
      
      if (isConfigured) {
        this.addResult('Configuración', 'success', 'Variables de entorno configuradas correctamente');
        
        // Verificar que las URLs no sean placeholders
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (url.includes('supabase.co') && key.length > 50) {
          this.addResult('Validación', 'success', 'Credenciales parecen válidas');
        } else {
          this.addResult('Validación', 'error', 'Las credenciales parecen ser placeholders');
        }
      } else {
        this.addResult('Configuración', 'error', 'Variables de entorno no configuradas');
      }
    } catch (error) {
      this.addResult('Configuración', 'error', `Error en configuración: ${error}`);
    }
  }

  private async testConnection() {
    if (!isSupabaseConfigured()) {
      this.addResult('Conexión', 'error', 'Saltando test - no configurado');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('backups')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      this.addResult('Conexión', 'success', 'Conexión a Supabase exitosa');
    } catch (error) {
      this.addResult('Conexión', 'error', `Error de conexión: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async testTables() {
    if (!isSupabaseConfigured()) {
      this.addResult('Tablas', 'error', 'Saltando test - no configurado');
      return;
    }

    try {
      // Test tabla backups
      const { error: backupsError } = await supabase
        .from('backups')
        .select('id')
        .limit(1);

      if (backupsError) {
        this.addResult('Tabla backups', 'error', `Error en tabla backups: ${backupsError.message}`);
      } else {
        this.addResult('Tabla backups', 'success', 'Tabla backups accesible');
      }

      // Test tabla sync_logs
      const { error: logsError } = await supabase
        .from('sync_logs')
        .select('id')
        .limit(1);

      if (logsError) {
        this.addResult('Tabla sync_logs', 'error', `Error en tabla sync_logs: ${logsError.message}`);
      } else {
        this.addResult('Tabla sync_logs', 'success', 'Tabla sync_logs accesible');
      }
    } catch (error) {
      this.addResult('Tablas', 'error', `Error general en tablas: ${error}`);
    }
  }

  private async testRLS() {
    if (!isSupabaseConfigured()) {
      this.addResult('RLS', 'error', 'Saltando test - no configurado');
      return;
    }

    try {
      // Intentar insertar un registro de prueba
      const testDeviceId = `test-device-${Date.now()}`;
      
      const { error: insertError } = await supabase
        .from('sync_logs')
        .insert([{
          action: 'backup',
          status: 'success',
          message: 'Test de RLS',
          device_id: testDeviceId
        }]);

      if (insertError) {
        this.addResult('RLS Insert', 'error', `Error insertando: ${insertError.message}`);
      } else {
        this.addResult('RLS Insert', 'success', 'Inserción con RLS exitosa');
        
        // Intentar leer el registro
        const { data, error: selectError } = await supabase
          .from('sync_logs')
          .select('*')
          .eq('device_id', testDeviceId);

        if (selectError) {
          this.addResult('RLS Select', 'error', `Error leyendo: ${selectError.message}`);
        } else {
          this.addResult('RLS Select', 'success', `RLS funcionando - encontrados ${data?.length || 0} registros`);
        }
      }
    } catch (error) {
      this.addResult('RLS', 'error', `Error en test RLS: ${error}`);
    }
  }

  private async testBackupFlow() {
    if (!isSupabaseConfigured()) {
      this.addResult('Backup Flow', 'error', 'Saltando test - no configurado');
      return;
    }

    try {
      // Test exportar datos locales
      const localData = await exportData();
      
      if (localData && typeof localData === 'object') {
        this.addResult('Export Local', 'success', `Datos locales exportados: ${Object.keys(localData).length} tablas`);
      } else {
        this.addResult('Export Local', 'error', 'Error exportando datos locales');
        return;
      }

      // Test crear backup real
      const testBackup = {
        backup_type: 'full' as const,
        data: { test: true, timestamp: Date.now() },
        device_id: `test-${Date.now()}`,
        version: '1.0.0'
      };

      const { data: backupData, error: backupError } = await supabase
        .from('backups')
        .insert([testBackup])
        .select()
        .single();

      if (backupError) {
        this.addResult('Backup Creation', 'error', `Error creando backup: ${backupError.message}`);
      } else {
        this.addResult('Backup Creation', 'success', `Backup creado con ID: ${backupData.id}`);
        
        // Test leer backup
        const { data: readData, error: readError } = await supabase
          .from('backups')
          .select('*')
          .eq('id', backupData.id)
          .single();

        if (readError) {
          this.addResult('Backup Read', 'error', `Error leyendo backup: ${readError.message}`);
        } else {
          this.addResult('Backup Read', 'success', 'Backup leído correctamente');
          
          // Limpiar test data
          await supabase.from('backups').delete().eq('id', backupData.id);
          this.addResult('Cleanup', 'success', 'Datos de prueba limpiados');
        }
      }
    } catch (error) {
      this.addResult('Backup Flow', 'error', `Error en flujo de backup: ${error}`);
    }
  }
}

export const testSupabase = async (): Promise<ConnectionTest[]> => {
  const testSuite = new SupabaseTestSuite();
  return await testSuite.runFullTest();
};