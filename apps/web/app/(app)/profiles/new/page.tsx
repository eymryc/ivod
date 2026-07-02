"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ancienne URL — redirige vers /profiles avec ouverture du modal */
export default function NewProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profiles?add=1");
  }, [router]);

  return null;
}
