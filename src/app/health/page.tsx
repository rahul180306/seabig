import { apiFetch } from "@/lib/api";

export const revalidate = 0; 

export default async function HealthPage() {
  let statusText = "unknown";
  let ok = false;
  try {
    const data = await apiFetch<{ status: string }>("/health", { cache: "no-store" });
    statusText = data.status;
    ok = statusText === "ok";
  } catch (err: unknown) {
    statusText = err instanceof Error ? err.message : String(err);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Backend Health</h1>
      <p>
        Status: <strong style={{ color: ok ? "green" : "crimson" }}>{statusText}</strong>
      </p>
      <p>
        This page calls your Windows FastAPI backend using NEXT_PUBLIC_API_BASE_URL.
      </p>
    </div>
  );
}
