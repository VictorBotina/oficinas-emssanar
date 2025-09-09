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
    const postBody = { id_dane: id };
    console.log('Sending to Supabase:', JSON.stringify(postBody, null, 2));

    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseApiKey
      },
      body: JSON.stringify(postBody)
    });
    
    const responseText = await response.text();
    console.log('Raw response from Supabase:', responseText);

    if (!response.ok) {
      console.error('Supabase API error:', responseText);
      return NextResponse.json({ success: false, message: `Error from Supabase: ${response.statusText}` }, { status: response.status });
    }
    
    const data = JSON.parse(responseText);

    const locationData = data[0];

    if (!locationData) {
        return NextResponse.json({ success: false, message: 'Location not found in Supabase response' }, { status: 404 });
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
