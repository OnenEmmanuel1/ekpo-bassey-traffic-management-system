# JunctionAI Visual & Operational Standards

## 1. Visual Design & Iconography Standards
- **Soft UI Aesthetic**: Maintain clean, soft, light-themed card components with subtle borders (`#e2e8f0` / `#edf2f7`), soft shadows (`0 1px 3px rgba(15, 23, 42, 0.06)`), rounded corners, and solid flat color tokens.
- **Zero Emojis Policy**: NEVER use raw emoji characters (e.g. 🚨, 🚶, 📊, ⚡, 🚑, 🛑, etc.) in the user interface, alerts, navigation, or logs. Always use clean, inline SVG icons (Lucide / Feather style stroke-based icons).
- **Strict No-Gradient Constraint**: All buttons, badges, navigation highlights, and surface fills must be 100% solid flat colors (`var(--itcs-color-*)`).

## 2. Authentication & Credential Standards
- **Standard Default Password**: All developer & test accounts use `passsword123` (with bcrypt hash `$2a$10$iqHT5IgkxmZ7RtCUcxtwveYw.hHr7xFJ82z37kll7Oiz.V8lNsViW`).
- **Default Admin Account**:
  - Email: `admin@junctionai.cr.gov.ng`
  - Password: `passsword123`
