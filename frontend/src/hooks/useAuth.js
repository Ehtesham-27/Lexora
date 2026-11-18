import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

/**
 * useAuth — hook to consume AuthContext inside any component.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

export default useAuth;
