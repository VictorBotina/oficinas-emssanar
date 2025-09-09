import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseApiKey = process.env.SUPABASE_API_KEY;

  if (!supabaseUrl || !supabaseApiKey) {
    return NextResponse.json({ success: false, message: 'Supabase URL or API Key is not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseApiKey,
        'Authorization': `Bearer ${supabaseApiKey}`
      },
      body: JSON.stringify({ id_dane: id })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Supabase API error:', errorData);
      return NextResponse.json({ success: false, message: `Error from Supabase: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    
    const locationData = data[0];

    if (!locationData) {
        return NextResponse.json({ success: false, message: 'Location not found' }, { status: 404 });
    }

    const formattedData = {
        municipio: locationData.nombre_municipio,
        departamento: locationData.nombre_departamento,
        direccion: locationData.direccion,
        horario_atencion: locationData.horario,
        servicios_sub: locationData.servicios_sub,
        servicios_cont: locationData.servicios_cont
    };

    return NextResponse.json({ success: true, data: formattedData });

  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
