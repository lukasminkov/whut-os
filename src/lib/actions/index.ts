export type { Action, ActionProvider, ActionHelpers, ComposeConfig, ComposeField, ActionVariant } from "./types";
export { registerActionProvider, resolveActions } from "./registry";

// Auto-register built-in providers
import "./providers/email";
