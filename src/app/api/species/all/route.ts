export async function GET() {
	return new Response(JSON.stringify({ error: 'API removed' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
}
