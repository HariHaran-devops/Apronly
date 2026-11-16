
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole =
  | "candidate"
  | "restaurant_staff"
  | "admin"
  | "support";

export interface UserAccess {
  userId: string;
  email: string | undefined;
  roles: AppRole[];
}

function getDefaultWorkspacePath(roles: AppRole[]): string {
  // Admin has the highest default landing priority.
  if (roles.includes("admin")) {
    return "/ops";
  }

  if (roles.includes("restaurant_staff")) {
    return "/partner";
  }

  if (roles.includes("candidate")) {
    return "/app";
  }

  // Support does not receive admin access.
  // Its dedicated workspace will be implemented separately.
  return "/auth/complete";
}

/**
 * Retrieves the authenticated user and their database-assigned roles.
 *
 * Never trusts user metadata for authorization.
 * Role assignments are read from the protected user_roles table.
 */
export async function getCurrentUserAccess(): Promise<UserAccess> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: roleRecords, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("Authorization role lookup failed:", {
      code: roleError.code,
      message: roleError.message,
    });

    // Fail closed. Never grant access when authorization
    // cannot be verified.
    throw new Error("Unable to verify account permissions.");
  }

  const validRoles: AppRole[] = [
    "candidate",
    "restaurant_staff",
    "admin",
    "support",
  ];

  const roles = (roleRecords ?? [])
    .map((record) => record.role)
    .filter((role): role is AppRole =>
      validRoles.includes(role as AppRole)
    );

  return {
    userId: user.id,
    email: user.email,
    roles,
  };
}

/**
 * Requires at least one of the specified roles.
 *
 * Users with multiple roles retain all their permissions.
 * The default workspace is only used for redirection.
 */
export async function requireAnyRole(
  allowedRoles: AppRole[]
): Promise<UserAccess> {
  const access = await getCurrentUserAccess();

  const hasPermission = allowedRoles.some((role) =>
    access.roles.includes(role)
  );

  if (!hasPermission) {
    redirect(getDefaultWorkspacePath(access.roles));
  }

  return access;
}

/**
 * Returns the default landing page for an authenticated user.
 */
export async function redirectToDefaultWorkspace(): Promise<never> {
  const access = await getCurrentUserAccess();

  redirect(getDefaultWorkspacePath(access.roles));
}
