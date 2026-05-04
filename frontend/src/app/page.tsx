import ReviewerCard from "@/components/ReviewerCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Velocity</h1>
        <p className="text-gray-500 font-medium">Reviewer Dashboard</p>
      </div>

      {/* The feed container */}
      <div className="w-full flex justify-center">
        <ReviewerCard />
      </div>
    </main>
  );
}