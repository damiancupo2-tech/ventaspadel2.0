import { useEffect, useRef } from 'react';
import { backupService } from '../utils/backupService';

export const useAutoBackup = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Solo iniciar si Supabase está configurado
    if (!backupService.isBackupEnabled()) {
      return;
    }

    // Crear backup inicial después de 5 minutos
    const initialTimeout = setTimeout(() => {
      backupService.autoBackup();
    }, 5 * 60 * 1000);

    // Backup automático cada 6 horas
    intervalRef.current = setInterval(() => {
      backupService.autoBackup();
    }, 6 * 60 * 60 * 1000);

    // Limpiar backups antiguos una vez al día
    const cleanupInterval = setInterval(() => {
      backupService.cleanOldBackups();
    }, 24 * 60 * 60 * 1000);

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cleanupInterval) clearInterval(cleanupInterval);
    };
  }, []);

  return {
    isEnabled: backupService.isBackupEnabled(),
    createBackup: () => backupService.createFullBackup(),
    getBackups: () => backupService.getBackupList(),
    restoreBackup: (id: string) => backupService.restoreFromBackup(id),
    getLogs: () => backupService.getSyncLogs()
  };
};