import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // In a real application, you would use the id to fetch data from a database.
  // const { searchParams } = new URL(request.url);
  // const id = searchParams.get('id');

  // For now, we return a mocked response.
  const mockData = {
    municipio: "Pasto",
    departamento: "Nariño",
    direccion: "Cra 42 #18a - 94 C.C Valle De Atriz, 1 Piso Local 111* Valle De Atriz",
    horario_atencion: "Lunes a viernes 7:00 a.m. a 3:00 p.m.",
    servicios_sub: "test_sub",
    servicios_cont: "test_cont"
  };

  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({ success: true, data: mockData });
}
