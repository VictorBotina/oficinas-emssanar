import MapPage from './map-page';

export default function Home() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseApiKey = process.env.SUPABASE_API_KEY;

  return <MapPage supabaseUrl={supabaseUrl} supabaseApiKey={supabaseApiKey} />;
}
