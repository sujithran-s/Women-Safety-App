# Project TODO

- [x] Create mobile interface plan and domain model for the Phase 1 safety system
- [x] Implement onboarding, registration, login, secure session handling, and profile management
- [x] Implement trusted emergency contact add, edit, and delete flows
- [x] Implement a persistent, press-and-hold manual SOS control
- [x] Implement the distinct unit-testable rule-based Context-Aware Emergency Decision Engine
- [x] Route manual SOS, voice SOS, and shake detection exclusively through the shared decision engine
- [x] Capture GPS location and attach it to every incident payload
- [x] Implement predefined voice SOS setup and platform-capable activation behavior
- [x] Implement shake pattern calibration and threshold/window-based detection
- [x] Implement emergency dispatch status experience, online notification dispatch, and moment-of-trigger network checking
- [x] Implement automatic offline SMS fallback without requiring a reachable backend
- [x] Implement privacy-by-default independent audio, photo, and live-location controls with permission status
- [x] Implement optional evidence collection only when the respective privacy control is enabled
- [x] Implement static/heuristic safer-route recommendation without ML
- [x] Add server data model and authenticated APIs for contacts, incidents, profile, notification delivery, and privacy settings
- [x] Add unit and integration tests for engine risk bands, trigger routing, location payloads, online dispatch, and offline fallback
- [x] Exclude wearable, BLE, ML/LLM, authority dashboard, fake call, locator, and community alert functionality
- [x] Generate custom app icon, update app branding configuration, and validate the application before first checkpoint
