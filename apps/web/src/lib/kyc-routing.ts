import { AuthUser, UserRole } from "@/lib/auth-store";

type KycRoute =
  | "/dashboard"
  | "/dashboard/verification"
  | "/dashboard/verification/status"
  | "/onboarding/role"
  | "/onboarding/kyc"
  | "/onboarding/verification"
  | "/login";

type RouteContext = {
  hasProfile: boolean;
  user: AuthUser | null;
  hasPendingVeriffSession?: boolean;
};

export function getKycRetryRoute(role: UserRole | null | undefined): KycRoute {
  return role === "funder" ? "/onboarding/kyc" : "/onboarding/verification";
}

export function buildKycRetryUrl(
  role: UserRole | null | undefined,
  status?: string | null,
  reason?: string | null,
) {
  const params = new URLSearchParams();

  if (status) {
    params.set("veriff_status", status);
  }

  if (reason) {
    params.set("veriff_reason", reason);
  }

  const route = getKycRetryRoute(role);
  const query = params.toString();

  return query ? `${route}?${query}` : route;
}

export function getRequiredAuthenticatedRoute({
  hasProfile,
  user,
  hasPendingVeriffSession = false,
}: RouteContext): KycRoute {
  if (hasPendingVeriffSession) {
    return "/dashboard/verification/status";
  }

  if (!hasProfile || !user?.role) {
    return "/onboarding/role";
  }

  if (user.role === "funder") {
    return user.kyc_status === "verified"
      ? "/dashboard"
      : "/onboarding/kyc";
  }

  const hasRegionAnchor = Boolean(user.geo_verified || user.home_region);
  if (!hasRegionAnchor) {
    return "/onboarding/verification";
  }

  return user.kyc_status === "verified"
    ? "/dashboard"
    : "/onboarding/verification";
}

export function canAccessDashboardPath({
  pathname,
  hasPendingVeriffSession,
  requiredRoute,
}: {
  pathname: string;
  hasPendingVeriffSession: boolean;
  requiredRoute: KycRoute;
}) {
  if (pathname === "/dashboard/verification" || pathname === "/dashboard/verification/status") {
    return true;
  }

  if (hasPendingVeriffSession) {
    return pathname === "/dashboard" || pathname === "/dashboard/verification" || pathname === "/dashboard/verification/status";
  }

  return requiredRoute === "/dashboard";
}
