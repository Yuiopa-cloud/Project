import { Suspense } from "react";
import { AdminDashboard } from "./admin-dashboard";

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
