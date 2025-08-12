import { supabase, isSupabaseConfigured } from './supabase';
import { CarnetSocio, SocioMember } from '../types/carnets';

const getDeviceId = (): string => {
  return localStorage.getItem('device-id') || 'unknown-device';
};

// Tipos para Supabase
interface SupabaseCarnet {
  id: string;
  numero_carnet: string;
  lote: string;
  barrio: string;
  tipo: 'INDIVIDUAL' | 'FAMILIAR';
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'BAJA';
  fecha_creacion: string;
  fecha_vencimiento?: string;
  fecha_baja?: string;
  motivo_baja?: string;
  creado_por: string;
  dado_de_baja_por?: string;
  observaciones?: string;
  metadata: any;
  device_id: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseSocio {
  id: string;
  carnet_id: string;
  lote: string;
  condicion: 'TITULAR' | 'FAMILIAR_1' | 'FAMILIAR_2' | 'FAMILIAR_3' | 'FAMILIAR_ADHERENTE';
  nombre_completo: string;
  telefono: string;
  dni: string;
  email: string;
  barrio: string;
  vinculo: string;
  fecha_alta: string;
  fecha_baja?: string;
  motivo_baja?: string;
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'BAJA';
  observaciones?: string;
  device_id: string;
  created_at: string;
  updated_at: string;
}

// Convertir de formato local a Supabase
const carnetToSupabase = (carnet: CarnetSocio): SupabaseCarnet => ({
  id: carnet.id,
  numero_carnet: carnet.numeroCarnet,
  lote: carnet.lote,
  barrio: carnet.barrio,
  tipo: carnet.tipo,
  estado: carnet.estado,
  fecha_creacion: carnet.fechaCreacion,
  fecha_vencimiento: carnet.fechaVencimiento,
  fecha_baja: carnet.fechaBaja,
  motivo_baja: carnet.motivoBaja,
  creado_por: carnet.creadoPor,
  dado_de_baja_por: carnet.dadoDeBajaPor,
  observaciones: carnet.observaciones,
  metadata: carnet.metadata,
  device_id: getDeviceId(),
  created_at: carnet.createdAt,
  updated_at: carnet.updatedAt
});

const socioToSupabase = (socio: SocioMember, carnetId: string): SupabaseSocio => ({
  id: socio.id,
  carnet_id: carnetId,
  lote: socio.lote,
  condicion: socio.condicion,
  nombre_completo: socio.nombreCompleto,
  telefono: socio.telefono,
  dni: socio.dni,
  email: socio.email,
  barrio: socio.barrio,
  vinculo: socio.vinculo,
  fecha_alta: socio.fechaAlta,
  fecha_baja: socio.fechaBaja,
  motivo_baja: socio.motivoBaja,
  estado: socio.estado,
  observaciones: socio.observaciones,
  device_id: getDeviceId(),
  created_at: socio.createdAt,
  updated_at: socio.updatedAt
});

// Convertir de Supabase a formato local
const supabaseToCarnet = (
  carnetData: SupabaseCarnet, 
  titular: SupabaseSocio, 
  familiares: SupabaseSocio[]
): CarnetSocio => ({
  id: carnetData.id,
  numeroCarnet: carnetData.numero_carnet,
  lote: carnetData.lote,
  barrio: carnetData.barrio,
  tipo: carnetData.tipo,
  estado: carnetData.estado,
  titular: supabaseToSocio(titular),
  familiares: familiares.map(supabaseToSocio),
  fechaCreacion: carnetData.fecha_creacion,
  fechaVencimiento: carnetData.fecha_vencimiento,
  fechaBaja: carnetData.fecha_baja,
  motivoBaja: carnetData.motivo_baja,
  creadoPor: carnetData.creado_por,
  dadoDeBajaPor: carnetData.dado_de_baja_por,
  observaciones: carnetData.observaciones,
  metadata: carnetData.metadata,
  createdAt: carnetData.created_at,
  updatedAt: carnetData.updated_at
});

const supabaseToSocio = (socioData: SupabaseSocio): SocioMember => ({
  id: socioData.id,
  lote: socioData.lote,
  condicion: socioData.condicion,
  nombreCompleto: socioData.nombre_completo,
  telefono: socioData.telefono,
  dni: socioData.dni,
  email: socioData.email,
  barrio: socioData.barrio,
  vinculo: socioData.vinculo,
  fechaAlta: socioData.fecha_alta,
  fechaBaja: socioData.fecha_baja,
  motivoBaja: socioData.motivo_baja,
  estado: socioData.estado,
  observaciones: socioData.observaciones,
  createdAt: socioData.created_at,
  updatedAt: socioData.updated_at
});

export class SupabaseCarnetsService {
  private deviceId: string;
  private isEnabled: boolean;

  constructor() {
    this.deviceId = getDeviceId();
    this.isEnabled = isSupabaseConfigured();
  }

  // Sincronizar carnets locales con Supabase
  async syncCarnetsToSupabase(carnets: CarnetSocio[]): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled) {
      return { success: false, message: 'Supabase no configurado' };
    }

    try {
      console.log('🔄 Sincronizando carnets con Supabase...', carnets.length);

      // Limpiar datos existentes del dispositivo
      await this.clearDeviceData();

      // Insertar carnets
      for (const carnet of carnets) {
        await this.insertCarnetWithMembers(carnet);
      }

      console.log('✅ Sincronización de carnets completada');
      return { success: true, message: `${carnets.length} carnets sincronizados` };
    } catch (error) {
      console.error('❌ Error sincronizando carnets:', error);
      return { 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      };
    }
  }

  // Obtener carnets desde Supabase
  async getCarnetsFromSupabase(): Promise<CarnetSocio[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      console.log('📥 Obteniendo carnets desde Supabase...');

      // Obtener carnets del dispositivo
      const { data: carnetsData, error: carnetsError } = await supabase
        .from('carnets_socios')
        .select('*')
        .eq('device_id', this.deviceId)
        .order('created_at', { ascending: false });

      if (carnetsError) throw carnetsError;

      if (!carnetsData || carnetsData.length === 0) {
        console.log('📭 No hay carnets en Supabase para este dispositivo');
        return [];
      }

      // Obtener todos los miembros
      const { data: sociosData, error: sociosError } = await supabase
        .from('socios_miembros')
        .select('*')
        .eq('device_id', this.deviceId)
        .order('condicion', { ascending: true });

      if (sociosError) throw sociosError;

      // Agrupar miembros por carnet
      const carnets: CarnetSocio[] = carnetsData.map(carnetData => {
        const miembros = sociosData?.filter(s => s.carnet_id === carnetData.id) || [];
        const titular = miembros.find(m => m.condicion === 'TITULAR');
        const familiares = miembros.filter(m => m.condicion !== 'TITULAR');

        if (!titular) {
          console.warn(`⚠️ Carnet ${carnetData.numero_carnet} sin titular`);
          return null;
        }

        return supabaseToCarnet(carnetData, titular, familiares);
      }).filter(Boolean) as CarnetSocio[];

      console.log('✅ Carnets obtenidos desde Supabase:', carnets.length);
      return carnets;
    } catch (error) {
      console.error('❌ Error obteniendo carnets desde Supabase:', error);
      return [];
    }
  }

  // Insertar carnet con sus miembros
  private async insertCarnetWithMembers(carnet: CarnetSocio): Promise<void> {
    // Insertar carnet principal
    const carnetData = carnetToSupabase(carnet);
    const { error: carnetError } = await supabase
      .from('carnets_socios')
      .insert([carnetData]);

    if (carnetError) throw carnetError;

    // Insertar titular
    const titularData = socioToSupabase(carnet.titular, carnet.id);
    const { error: titularError } = await supabase
      .from('socios_miembros')
      .insert([titularData]);

    if (titularError) throw titularError;

    // Insertar familiares
    if (carnet.familiares.length > 0) {
      const familiaresData = carnet.familiares.map(familiar => 
        socioToSupabase(familiar, carnet.id)
      );
      
      const { error: familiaresError } = await supabase
        .from('socios_miembros')
        .insert(familiaresData);

      if (familiaresError) throw familiaresError;
    }
  }

  // Limpiar datos del dispositivo
  private async clearDeviceData(): Promise<void> {
    // Eliminar miembros primero (por foreign key)
    await supabase
      .from('socios_miembros')
      .delete()
      .eq('device_id', this.deviceId);

    // Eliminar carnets
    await supabase
      .from('carnets_socios')
      .delete()
      .eq('device_id', this.deviceId);
  }

  // Sincronizar desde Supabase a local
  async syncFromSupabaseToLocal(): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled) {
      return { success: false, message: 'Supabase no configurado' };
    }

    try {
      console.log('📥 Sincronizando carnets desde Supabase a local...');
      
      const carnets = await this.getCarnetsFromSupabase();
      
      // Guardar en storage local
      const { set } = await import('idb-keyval');
      await set('villanueva-carnets-v2', carnets);
      
      // Notificar actualización
      window.dispatchEvent(new CustomEvent('carnets-updated'));
      
      console.log('✅ Sincronización desde Supabase completada:', carnets.length);
      return { success: true, message: `${carnets.length} carnets sincronizados desde la nube` };
    } catch (error) {
      console.error('❌ Error sincronizando desde Supabase:', error);
      return { 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      };
    }
  }

  // Verificar si hay datos en Supabase
  async hasDataInSupabase(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const { data, error } = await supabase
        .from('carnets_socios')
        .select('id')
        .eq('device_id', this.deviceId)
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }
}

export const supabaseCarnetsService = new SupabaseCarnetsService();