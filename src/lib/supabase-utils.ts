// Definición de las credenciales de Supabase
interface SupabaseCredentials {
  supabaseUrl: string;
  supabaseKey: string;
}

// Opciones para la solicitud a la API
interface SupabaseRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: string;
}

// Función principal para ejecutar una consulta a Supabase
export async function executeSupabaseQuery(
  credentials: SupabaseCredentials,
  options: SupabaseRequestOptions
): Promise<any> {
  const { supabaseUrl, supabaseKey } = credentials;
  const { method, path, body } = options;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL o API key no están definidas.');
  }

  // Asegura que no haya una doble barra en la URL final
  const cleanedUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
  const url = `${cleanedUrl}${path}`;

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: body,
    });
    
    // Si la respuesta no es OK, arroja un error con el estado
    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error de Supabase: ${response.status} - ${response.statusText}. Detalles: ${errorData}`);
    }

    // Si la respuesta está vacía (código 204), devuelve un objeto indicando éxito pero sin datos
    if (response.status === 204) {
        return { success: true, data: null, message: "No content" };
    }

    // Intenta parsear la respuesta como JSON
    const result = await response.json();
    return result;

  } catch (error: any) {
    // Si hay un error en la solicitud, lo propaga
    console.error("Error al ejecutar la consulta a Supabase:", error);
    throw new Error(error.message || 'Error desconocido en la conexión con Supabase.');
  }
}
