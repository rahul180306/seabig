import AppleLikeMap from "@/components/AppleLikeMap";

export const revalidate = 0;

export default function MapPage() {

  return (
    <main className="px-4 sm:px-6 pb-10" style={{ paddingTop: 120 }}>
      <div className="mx-auto max-w-7xl">
        <section className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_28px_rgba(0,0,0,0.15)] p-4 sm:p-6">
          <h1 className="mb-4 text-2xl font-bold text-black">India Map</h1>
          <div style={{ height: "70vh" }}>
            <AppleLikeMap center={[20.5937, 78.9629]} zoom={4} />
          </div>
        </section>
      </div>
    </main>
  );
}
