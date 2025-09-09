import { NextResponse } from 'next/server';

// Interfaces para tipado
interface SupabaseLocationData {
  municipio: string;
  departamento: string;
  direccion: string;
  horario_atencion: string;
  servicios_sub: string;
  servicios_cont: string;
}

interface FormattedLocationData {
  municipio: string;
  departamento: string;
  direccion: string;
  horario_atencion: string;
  servicios_sub: string;
  servicios_cont: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: FormattedLocationData;
}

// Timeout para la llamada a Supabase (5 segundos)
const SUPABASE_TIMEOUT = 5000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, message: 'ID is required' },
      { status: 400 }
    );
  }

  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { success: false, message: 'Invalid ID format. Only numbers are allowed' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseApiKey = process.env.SUPABASE_API_KEY;

  if (!supabaseUrl || !supabaseApiKey) {
    console.error('Supabase configuration missing.');
    return NextResponse.json(
      { success: false, message: 'Supabase URL or API Key is not configured' },
      { status: 500 }
    );
  }

  try {
    const postBody = { id_dane: id };
    
    console.log('Supabase API request POST body:', JSON.stringify(postBody));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT);

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/of_emssanar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseApiKey,
        'Authorization': `Bearer ${supabaseApiKey}`,
      },
      body: JSON.stringify(postBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase API error:', {
            status: response.status,
            statusText: response.statusText,
            response: errorText,
        });
        return NextResponse.json(
            { success: false, message: `Error from Supabase: ${response.statusText}` },
            { status: response.status }
        );
    }
    
    const data = await response.json();
    
    console.log('Supabase API raw response:', JSON.stringify(data));

    if (!data || !data.success) {
        const message = data.message || 'No data found in Supabase response.';
        console.warn('Supabase function returned failure or no data:', { id, message });
        return NextResponse.json({ success: false, message }, { status: 404 });
    }
    
    const locationData: SupabaseLocationData = data.data;

    const requiredFields = ['municipio', 'departamento', 'direccion'];
    const missingFields = requiredFields.filter(field => !locationData[field as keyof SupabaseLocationData]);

    if (missingFields.length > 0) {
      console.error('Missing required fields in response from Supabase function:', {
        missingFields,
        receivedData: locationData,
      });
      return NextResponse.json(
        { success: false, message: 'Incomplete data received from server' },
        { status: 502 }
      );
    }

    const formattedData: FormattedLocationData = {
      municipio: locationData.municipio,
      departamento: locationData.departamento,
      direccion: locationData.direccion,
      horario_atencion: locationData.horario_atencion || '',
      servicios_sub: locationData.servicios_sub || '',
      servicios_cont: locationData.servicios_cont || ''
    };

    return NextResponse.json({
      success: true,
      data: formattedData
    } as ApiResponse);

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Supabase request timeout:', { id, timeout: SUPABASE_TIMEOUT });
      return NextResponse.json(
        { success: false, message: 'Request timeout' },
        { status: 504 }
      );
    }

    console.error('Internal server error:', {
      error: error.message,
      stack: error.stack,
      id,
    });
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
