import { NextResponse } from 'next/server';

interface SupabaseLocationData {
  municipio: string;
  departamento: string;
  direccion: string;
  horario_atencion: string;
  servicios_sub: string;
  servicios_cont: string;
}

interface SupabaseApiResponse {
  success: boolean;
  data?: SupabaseLocationData;
  message?: string;
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
    console.error('Supabase URL or API Key is not configured in .env file.');
    return NextResponse.json(
      { success: false, message: 'Server configuration error.' },
      { status: 500 }
    );
  }
  
  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/of_emssanar`;
  console.log(`[SERVER] Supabase RPC URL: ${rpcUrl}`);
  console.log(`[SERVER] Using Supabase API Key: ${supabaseApiKey.substring(0, 10)}...`);

  try {
    const postBody = { id_dane: id };
    
    console.log('[SERVER] Supabase API request POST body:', JSON.stringify(postBody));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT);

    const response = await fetch(rpcUrl, {
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
        console.error('[SERVER] Supabase API error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
        });
        return NextResponse.json(
            { success: false, message: `Error from Supabase: ${response.statusText}` },
            { status: response.status }
        );
    }
    
    const data: SupabaseApiResponse = await response.json();
    
    console.log('[SERVER] Supabase API raw response:', JSON.stringify(data, null, 2));

    if (!data || !data.success) {
        const message = data.message || 'No data found in Supabase response.';
        console.warn('[SERVER] Supabase function returned failure or no data:', { id, message });
        return NextResponse.json({ success: false, message }, { status: 404 });
    }
    
    const locationData = data.data;

    if (!locationData) {
        console.error('[SERVER] Data object is missing in successful Supabase response:', { receivedData: data });
        return NextResponse.json(
            { success: false, message: 'Incomplete data received from server' },
            { status: 502 }
        );
    }

    const requiredFields = ['municipio', 'departamento', 'direccion'];
    const missingFields = requiredFields.filter(field => !locationData[field as keyof SupabaseLocationData]);

    if (missingFields.length > 0) {
      console.error('[SERVER] Missing required fields in response from Supabase function:', {
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
      console.error('[SERVER] Supabase request timeout:', { id, timeout: SUPABASE_TIMEOUT });
      return NextResponse.json(
        { success: false, message: 'Request timeout' },
        { status: 504 }
      );
    }

    console.error('[SERVER] Internal server error:', {
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