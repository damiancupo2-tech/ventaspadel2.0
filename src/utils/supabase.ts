import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Generar device_id si no existe
const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem('device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device-id', deviceId);
    console.log('🆔 Nuevo device_id creado:', deviceId);
  } else {
    console.log('🆔 Device_id existente:', deviceId);
  }
  return deviceId;
};

const deviceId = getOrCreateDeviceId();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'app.device_id': deviceId
    }
  }
});

// Función para actualizar el device_id en las headers
export const updateDeviceIdHeader = (deviceId: string) => {
  console.log('🔄 Actualizando device_id en headers:', deviceId);
  // Actualizar las headers globales con el device_id
  supabase.rest.headers = {
    ...supabase.rest.headers,
    'app.device_id': deviceId
  };
};

// Verificar si Supabase está configurado
export const isSupabaseConfigured = () => {
  const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url');
  console.log('⚙️ Supabase configurado:', isConfigured);
  console.log('🔗 URL:', supabaseUrl);
  console.log('🔑 Key length:', supabaseAnonKey?.length || 0);
  return isConfigured;
};

// Tipos para las tablas de backup
export interface BackupRecord {
  id: string;
  backup_type: 'full' | 'incremental';
  data: any;
  created_at: string;
  device_id: string;
  version: string;
}

export interface SyncLog {
  id: string;
  action: 'backup' | 'restore';
  status: 'success' | 'error';
  message: string;
  created_at: string;
  device_id: string;
}