import React, { useState } from "react";
import { BookOpen, User, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../hooks/useAuth";

export const SignupPage = ({ onSwitchToLogin, onReturnToApp }) => {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormFeedback(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setFormFeedback({ type: "error", message: "Please fill in all required fields." });
      return;
    }
    if (trimmedName.length < 2) {
      setFormFeedback({ type: "error", message: "Name must be at least 2 characters long." });
      return;
    }
    if (password.length < 8) {
      setFormFeedback({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setFormFeedback({ type: "error", message: "Password must contain at least one letter and one number." });
      return;
    }
    if (password !== confirmPassword) {
      setFormFeedback({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (!agreeTerms) {
      setFormFeedback({ type: "error", message: "Please agree to the Terms of Service." });
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(trimmedName, trimmedEmail, password, confirmPassword);
      // On success, AuthContext sets authenticated user and App transitions seamlessly
    } catch (err) {
      if (err.code === "EMAIL_ALREADY_EXISTS" || err.status === 409) {
        setFormFeedback({
          type: "error",
          message: "An account with this email address already exists."
        });
      } else if (err.code === "NETWORK_ERROR") {
        setFormFeedback({
          type: "error",
          message: "Unable to reach Lexora servers. Check your internet connection."
        });
      } else if (Array.isArray(err.details) && err.details.length > 0) {
        setFormFeedback({
          type: "error",
          message: err.details[0]?.message || err.message || "Registration validation failed."
        });
      } else {
        setFormFeedback({
          type: "error",
          message: err.message || "Failed to create account. Please try again."
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = () => {
    setFormFeedback({
      type: "info",
      message: "Google Sign-In is not supported in this version."
    });
  };

  return (
    <div className="auth-page-wrapper">
      {onReturnToApp && (
        <button className="auth-back-btn" onClick={onReturnToApp}>
          <ArrowLeft size={16} />
          <span>Back to Lexora</span>
        </button>
      )}

      <div className="auth-card clay-card">
        {/* Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-clay">
            <BookOpen size={24} />
          </div>
          <h2 className="auth-title font-serif">Create an Account</h2>
          <p className="auth-subtitle">
            Start expanding your English vocabulary with personalized collections and daily practice.
          </p>
        </div>

        {formFeedback && (
          <div className={`auth-feedback-banner ${formFeedback.type}`}>
            <span>{formFeedback.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="signup-name" className="field-label">Full Name</label>
            <div className="clay-field-input-wrapper">
              <User size={18} className="field-icon" />
              <input
                id="signup-name"
                type="text"
                className="clay-inner-field"
                placeholder="Eleanor Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="signup-email" className="field-label">Email Address</label>
            <div className="clay-field-input-wrapper">
              <Mail size={18} className="field-icon" />
              <input
                id="signup-email"
                type="email"
                className="clay-inner-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="signup-password" className="field-label">Password</label>
            <PasswordInput
              id="signup-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="signup-confirm-password" className="field-label">Confirm Password</label>
            <PasswordInput
              id="signup-confirm-password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isSubmitting}
            />
          </div>

          {/* Terms checkbox */}
          <div className="checkbox-row">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="checkbox-clay" />
              <span className="checkbox-label">
                I agree to the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> & <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="clay-btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? "Creating Account..." : "Create Account"}</span>
            <ArrowRight size={17} />
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or sign up with</span>
        </div>

        {/* Google OAuth Button UI */}
        <button type="button" className="google-auth-btn" onClick={handleGoogleClick} disabled={isSubmitting}>
          <svg className="google-svg" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign up with Google</span>
        </button>

        {/* Footer switch */}
        <div className="auth-footer-prompt">
          <span>Already have an account?</span>
          <button className="auth-link-btn" onClick={onSwitchToLogin} disabled={isSubmitting}>
            Sign in
          </button>
        </div>
      </div>

      <style>{`
        .auth-page-wrapper {
          width: 100%;
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 20px 10px;
        }

        .auth-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
          align-self: center;
          transition: color 0.15s ease;
        }
        .auth-back-btn:hover {
          color: var(--accent-primary);
        }

        .auth-card {
          width: 100%;
          max-width: 460px;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .auth-brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
        }

        .auth-logo-clay {
          width: 54px;
          height: 54px;
          border-radius: var(--radius-md);
          background-color: var(--surface-lavender);
          box-shadow: var(--shadow-clay-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          margin-bottom: 4px;
        }

        .auth-title {
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .auth-subtitle {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .auth-feedback-banner {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          font-weight: 500;
          text-align: center;
        }
        .auth-feedback-banner.error {
          background-color: var(--pastel-peach);
          color: var(--pastel-peach-text);
        }
        .auth-feedback-banner.info {
          background-color: var(--pastel-blue);
          color: var(--pastel-blue-text);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .clay-field-input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset);
          border-radius: var(--radius-md);
          padding: 12px 16px;
        }
        .clay-field-input-wrapper:focus-within {
          box-shadow: var(--shadow-clay-inset-focus);
        }

        .field-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .clay-inner-field {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.96rem;
          color: var(--text-main);
          min-width: 0;
        }

        /* Checkbox */
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }
        .checkbox-container input {
          display: none;
        }
        .checkbox-clay {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .checkbox-container input:checked + .checkbox-clay {
          background-color: var(--accent-primary);
          box-shadow: var(--shadow-clay-sm);
        }
        .checkbox-container input:checked + .checkbox-clay::after {
          content: "✓";
          color: #FFF;
          font-size: 0.75rem;
          font-weight: 800;
        }
        .checkbox-label {
          font-size: 0.84rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .auth-submit-btn {
          width: 100%;
          padding: 13px;
          font-size: 1rem;
          margin-top: 4px;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          gap: 12px;
        }
        .auth-divider::before, .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background-color: var(--border-dark-subtle);
        }

        .google-auth-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px;
          border-radius: var(--radius-pill);
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-sm);
          border: 1px solid var(--border-subtle);
          color: var(--text-main);
          font-size: 0.92rem;
          font-weight: 600;
          transition: all 0.18s ease;
        }
        .google-auth-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-clay-md);
        }

        .auth-footer-prompt {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .auth-link-btn {
          font-weight: 700;
          color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
};
