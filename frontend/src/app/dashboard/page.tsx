import { Suspense } from "react"
import ReviewerDashboard from "@/components/ReviewerDashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <ReviewerDashboard />
    </Suspense>
  )
}