# Phase 1 Safety System — Mobile Interface Design

## Product Intent

The mobile experience is designed as a calm, privacy-first personal safety companion. It prioritizes **one-handed, portrait (9:16) use** and keeps the emergency action permanently accessible while avoiding accidental activation. The visual language follows mainstream iOS conventions: clear hierarchy, generous touch targets, grouped settings, readable status labels, native sheets for confirmation, and restrained use of critical red only for active emergencies.

## Screen List and Layout

| Screen | Primary content and functionality | Layout decisions |
|---|---|---|
| Welcome / onboarding | Introduces the three independent alert paths and privacy-by-default policy. | Three short slides with a primary “Continue” button anchored in the thumb zone. |
| Sign in / register | Email or phone registration, login, and secure-session controls. | Single-column form with field validation and a persistent, reachable submit action. |
| Home safety dashboard | Prominent SOS control, readiness indicators for contacts/location, trigger summaries, and a route shortcut. | Large central press-and-hold SOS control; compact status cards below; no dense information above the main action. |
| Emergency contacts | Trusted-contact list with add, edit, and delete flows. | Standard iOS-style list rows, a visible “Add contact” action, and edit forms in sheets. |
| Voice SOS setup | Predefined emergency phrase, microphone permission status, and listening enablement. | Explanation first, then one simple enable control and transparent status. |
| Shake setup | Sensitivity calibration and active/inactive status. | A minimal calibration panel with explicit pattern requirements and a test indicator. |
| Emergency in progress | Trigger source, risk band, location acquisition and dispatch status, online/SMS fallback state, and cancel window. | Full-screen high-contrast status view; actions are intentionally limited to prevent confusion in a crisis. |
| Safe route | Destination input, route alternatives, risk labels, and selection of a safer heuristic route. | List-first route comparison with a simple visual path panel; the safest recommendation is clearly marked. |
| Safety & privacy | Independent controls for audio recording, photo capture, and live location, each with consent and permission state. | Grouped settings with descriptive labels; all controls default to off and never bundle consent. |
| Profile | Name, phone/email, notification preferences, sign-out, and account management. | Standard grouped form sections with clear save feedback. |

## Key User Flows

| Flow | Steps |
|---|---|
| Manual emergency | User presses and holds SOS → location capture starts → context engine evaluates trigger, time, and location → incident is dispatched online when available or SMS fallback is opened when offline → emergency status screen reports the outcome. |
| Voice emergency | User enables predefined phrase detection → phrase is recognized where platform permissions allow → the same emergency pipeline runs without bypassing the decision engine. |
| Shake emergency | User completes calibration → repeated acceleration pattern satisfies the motion threshold → the same emergency pipeline runs and reports the trigger source. |
| Privacy controls | User opens Safety & Privacy → chooses one optional capability → receives a permission explanation → explicitly enables or declines it; other capabilities remain unchanged. |
| Safer route | User enters a destination → app evaluates route candidates using static risk conditions and time → app displays route options and recommends the lowest heuristic-risk route. |

## Color Choices

| Role | Color | Purpose |
|---|---|---|
| Safety navy | `#12355B` | Primary navigation and reliable, calm brand foundation. |
| Signal teal | `#0E8C86` | Ready states, location/route highlights, and primary non-emergency actions. |
| Alert red | `#C83C4B` | SOS control and emergency-only critical actions. |
| Soft mist | `#F4F7FA` | Background surfaces that reduce visual strain. |
| Ink | `#18212B` | Main text with strong contrast. |
| Amber | `#C98215` | Attention states such as incomplete setup or medium risk. |

## Interaction and Accessibility

The application will use 44-point minimum touch targets, meaningful text labels alongside icons, distinct text descriptions in addition to color, and short status language suitable for urgent situations. A press-and-hold interaction and confirmation countdown protect against accidental manual SOS activation, while all automated triggers use threshold/pattern safeguards before invoking the shared decision pipeline.
