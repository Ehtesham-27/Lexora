import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

export const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = "Enter your password",
  required = true,
  error
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input-group">
      <div className={`password-input-wrapper ${error ? "has-error" : ""}`}>
        <Lock size={18} className="password-icon" />
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="password-field"
        />
        <button
          type="button"
          className="toggle-visibility-btn"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <span className="field-error-message">{error}</span>}

      <style>{`
        .password-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .password-input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--surface-main);
          box-shadow: var(--shadow-clay-inset);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .password-input-wrapper:focus-within {
          box-shadow: var(--shadow-clay-inset-focus);
        }

        .password-input-wrapper.has-error {
          border-color: #E26D5C;
        }

        .password-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .password-field {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-main);
          font-size: 0.96rem;
          min-width: 0;
        }
        .password-field::placeholder {
          color: var(--text-muted);
        }

        .toggle-visibility-btn {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }
        .toggle-visibility-btn:hover {
          color: var(--text-main);
        }

        .field-error-message {
          font-size: 0.8rem;
          color: #D34B38;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
