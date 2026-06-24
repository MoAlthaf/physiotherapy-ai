"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExerciseRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sessions");
  }, [router]);
  return null;
}
