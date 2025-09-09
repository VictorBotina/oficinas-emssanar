export type Location = {
  id_dane: string;
  nombre: string;
  latitud: number;
  longitud: number;
  departamento?: string;
};

export type LocationInfo = {
  municipio: string;
  departamento: string;
  direccion: string;
  horario_atencion: string;
  servicios_sub: string;
  servicios_cont: string;
};
