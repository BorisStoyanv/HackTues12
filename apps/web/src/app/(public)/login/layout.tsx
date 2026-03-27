"use client";

import { PublicRoute } from "@/components/auth/public-route";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicRoute>{children}</PublicRoute>;
}
