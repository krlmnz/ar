import { Suspense } from "react";
import { LoginForm } from "@/components/studio/login-form";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
