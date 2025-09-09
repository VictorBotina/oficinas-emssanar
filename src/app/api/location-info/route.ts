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

const SUPABASE_TIMEOUT = 10000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseApiKey = process.env.SUPABASE_API_KEY;

  if (!supabaseUrl || !supabaseApiKey) {
    console.error('Supabase URL or API Key is not configured.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/of_emssanar`;
  console.log(`[SERVER] Calling Supabase RPC: ${rpcUrl}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT);

    const postBody = { id_dane: id };
    console.log('[SERVER] Supabase POST Body:', JSON.stringify(postBody));

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseApiKey,
        'Authorization': `Bearer ${supabaseApiKey}`,
      },
      body: JSON.stringify(postBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBodyText = await response.text();
    console.log('[SERVER] Supabase Raw Response:', responseBodyText);
    
    if (!response.ok) {
        console.error(`[SERVER] Supabase error: ${response.status} ${response.statusText}`);
        return NextResponse.json({ error: `Failed to fetch from Supabase: ${response.statusText}` }, { status: response.status });
    }

    const result: SupabaseApiResponse = JSON.parse(responseBodyText);

    if (result.success && result.data) {
      return NextResponse.json(result.data);
    } else {
      console.warn('[SERVER] Supabase returned success=false or no data.', { message: result.message });
      return NextResponse.json({ error: result.message || 'No data found for the given ID.' }, { status: 404 });
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[SERVER] Supabase request timeout.');
      return NextResponse.json({ error: 'Request to Supabase timed out.' }, { status: 504 });
    }

    console.error('[SERVER] Internal Server Error:', error.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
