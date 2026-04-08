"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateGstin, validatePan } from "@/lib/validation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function toErrorString(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || error.toString();
  try {
    const s = JSON.stringify(error);
    if (s === "{}" || s === "null")
      return "Database error — check that PAN is exactly 10 chars, GSTIN is 15 chars.";
    return s;
  } catch {
    return String(error);
  }
}

export type OnboardingState =
  | {
      errors?: {
        companyName?: string;
        gstin?: string;
        pan?: string;
      };
      message?: string;
      values?: {
        companyName?: string;
        gstin?: string;
        pan?: string;
      };
    }
  | undefined;

export async function saveCompanyProfile(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const authClient = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/auth/login");

  const companyName = (formData.get("companyName") as string)?.trim();
  const gstin = (formData.get("gstin") as string)?.trim().toUpperCase();
  const pan = (formData.get("pan") as string)?.trim().toUpperCase();

  const values = { companyName, gstin, pan };
  const errors: NonNullable<OnboardingState>["errors"] = {};

  if (!companyName || companyName.length < 2) {
    errors.companyName = "Company name must be at least 2 characters";
  }
  const gstinError = validateGstin(gstin);
  if (gstinError) errors.gstin = gstinError;

  const panError = validatePan(pan);
  if (panError) errors.pan = panError;

  if (Object.keys(errors).length > 0) return { errors, values };

  // Derive state code from the first 2 characters of GSTIN (e.g. '27' = Maharashtra)
  const stateCode = gstin.slice(0, 2);

  // Generate company id here so we don't need to select it back through RLS
  // (the SELECT policy requires company_members to exist, which we haven't created yet)
  const companyId = crypto.randomUUID();

  // ── 1. Create company ───────────────────────────────────────────────────────
  const { error: companyError } = await adminClient
    .from("companies")
    .insert({ id: companyId, name: companyName, pan, state_code: stateCode });

  if (companyError) {
    console.error("company insert error", {
      code: companyError.code,
      message: companyError.message,
      details: companyError.details,
      hint: companyError.hint,
      full: JSON.stringify(companyError),
    });
    return {
      message: `Could not create company: ${toErrorString(companyError)}`,
      values,
    };
  }

  // ── 2. Add user as owner (must happen before GSTIN insert due to RLS) ───────
  const { error: memberError } = await adminClient
    .from("company_members")
    .insert({ company_id: companyId, user_id: user.id, role: "owner" });

  if (memberError) {
    console.error("member insert error", memberError);
    return {
      message: `Could not link account: ${toErrorString(memberError)}`,
      values,
    };
  }

  // ── 3. Create primary GSTIN (after company_members so RLS owner check passes)
  const { error: gstinInsertError } = await adminClient.from("gstins").insert({
    company_id: companyId,
    gstin,
    state_code: stateCode,
  });

  if (gstinInsertError) {
    console.error("gstin insert error", gstinInsertError);
    return {
      message: `Could not save GSTIN: ${toErrorString(gstinInsertError)}`,
      values,
    };
  }

  // ── 4. Mark profile as onboarded ────────────────────────────────────────────
  // upsert guards against the edge case where the trigger hasn't created the row yet
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: user.id,
      onboarded: true,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error("profile update error", profileError);
    return {
      message: `Could not update profile: ${toErrorString(profileError)}`,
      values,
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
