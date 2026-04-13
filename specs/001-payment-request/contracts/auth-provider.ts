/**
 * authProvider interface for the P2P Payment Request feature.
 *
 * Feature: 001-payment-request
 * Date: 2026-04-09
 *
 * This file defines the method signatures only — no implementation.
 * The actual implementation uses ra-supabase's supabaseAuthProvider()
 * factory with a custom login method (magic link OTP).
 *
 * See: src/providers/index.ts for the concrete instantiation.
 * See: src/auth/LoginPage.tsx for the supabase.auth.signInWithOtp call.
 * See: src/auth/CallbackPage.tsx for the /auth/callback route handler.
 */

// =============================================================================
// Supporting Types
// =============================================================================

/** React Admin AuthProvider error shape */
export interface AuthError {
  message: string;
  status?: number;
}

/**
 * Identity returned by getIdentity.
 * React Admin requires `id` and `fullName`; `avatar` is optional.
 */
export interface UserIdentity {
  /** Supabase auth.users UUID */
  id: string;
  /** Display name from profiles table; falls back to email */
  fullName: string;
  /** Avatar URL from profiles table; undefined if not set */
  avatar?: string;
}

/**
 * Credentials passed to login().
 * For magic-link flow only the email is required.
 * The password field is unused but kept for React Admin interface compatibility.
 */
export interface MagicLinkCredentials {
  email: string;
  password?: never;
}

// =============================================================================
// AuthProvider Interface
// =============================================================================

/**
 * Supabase magic-link authProvider interface.
 *
 * Implements the React Admin AuthProvider contract.
 * All methods return Promises that either resolve (success) or reject
 * (failure) — React Admin handles redirects based on resolution/rejection.
 *
 * Implementation note: ra-supabase's supabaseAuthProvider() handles
 * checkAuth, logout, checkError, getIdentity, and getPermissions.
 * Only login() is customised to call supabase.auth.signInWithOtp().
 */
export interface SupabaseAuthProvider {
  /**
   * Initiates magic-link sign-in.
   *
   * Calls supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } }).
   * Does NOT wait for the session — the session is established in CallbackPage
   * when the user clicks the link and the SIGNED_IN event fires.
   *
   * Resolves: when the OTP request is sent successfully (does not mean user is
   *   authenticated yet — the UI shows "Check your email").
   * Rejects: with AuthError if Supabase returns an error (e.g., rate limit).
   *
   * @param credentials - Object containing `email` field.
   */
  login(credentials: MagicLinkCredentials): Promise<void>;

  /**
   * Signs the user out of Supabase and clears the local session.
   *
   * Calls supabase.auth.signOut().
   * React Admin redirects to /login on resolution.
   *
   * Resolves: always (even if Supabase returns an error, local state is cleared).
   */
  logout(): Promise<void>;

  /**
   * Checks whether the current user has a valid session.
   *
   * Calls supabase.auth.getSession() and inspects the returned session object.
   *
   * Resolves: if session exists and is not expired.
   * Rejects: if no session or session is expired — React Admin redirects to /login.
   */
  checkAuth(): Promise<void>;

  /**
   * Handles HTTP error responses from the dataProvider.
   *
   * If the error status is 401 (Unauthorized) or 403 (Forbidden),
   * rejects so React Admin logs the user out and redirects to /login.
   * Otherwise resolves (non-auth errors are handled by the data layer).
   *
   * @param error - The error object from the dataProvider (has `.status`).
   */
  checkError(error: AuthError): Promise<void>;

  /**
   * Returns the current user's identity for React Admin's useGetIdentity hook.
   *
   * Fetches the authenticated user from supabase.auth.getUser(), then
   * queries the `profiles` table for display_name and avatar_url.
   *
   * Resolves: with UserIdentity object.
   * Rejects: if no authenticated user is found.
   */
  getIdentity(): Promise<UserIdentity>;

  /**
   * Returns the current user's permissions.
   *
   * For v1, permissions are not role-based — all authenticated users have
   * the same access (enforced by RLS). Returns the user's UUID, which can
   * be used in components to distinguish sender vs recipient roles on a
   * per-record basis.
   *
   * Resolves: with the authenticated user's UUID string.
   * Resolves with empty string: if no session (graceful degradation).
   */
  getPermissions(): Promise<string>;
}
