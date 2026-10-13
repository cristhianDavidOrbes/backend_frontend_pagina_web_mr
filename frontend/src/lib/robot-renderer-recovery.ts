export type RobotRendererMode = "checking" | "loading" | "ready" | "fallback";
export type RobotRendererFailure = "model" | "context" | "unsupported" | "save-data";

export type RobotRendererState = {
  mode: RobotRendererMode;
  attempt: number;
  failures: number;
  reason: RobotRendererFailure | null;
};

export const ROBOT_RENDERER_RETRY_DELAYS = [1500, 5000, 15000] as const;
export const INITIAL_ROBOT_RENDERER: RobotRendererState = {
  mode: "checking", attempt: 0, failures: 0, reason: null,
};

type Action =
  | { type: "initialize"; reason: RobotRendererFailure | null }
  | { type: "failed"; attempt: number; reason: RobotRendererFailure }
  | { type: "ready"; attempt: number }
  | { type: "retry"; attempt: number; resetBudget: boolean }
  | { type: "unsupported"; attempt: number }
  | { type: "stable"; attempt: number };

/** Events belong to a single canvas; late callbacks cannot revive or fail its replacement. */
export function robotRendererReducer(state: RobotRendererState, action: Action): RobotRendererState {
  if (action.type === "initialize") {
    if (state.mode !== "checking") return state;
    return { ...state, mode: action.reason ? "fallback" : "loading", reason: action.reason };
  }
  if (action.attempt !== state.attempt) return state;
  switch (action.type) {
    case "failed":
      return state.mode === "loading" || state.mode === "ready"
        ? { ...state, mode: "fallback", failures: state.failures + 1, reason: action.reason }
        : state;
    case "ready":
      return state.mode === "loading" ? { ...state, mode: "ready", reason: null } : state;
    case "retry":
      return state.mode === "fallback"
        ? { mode: "loading", attempt: state.attempt + 1, failures: action.resetBudget ? 0 : state.failures, reason: null }
        : state;
    case "unsupported":
      return state.mode === "fallback" ? { ...state, reason: "unsupported" } : state;
    case "stable":
      return state.mode === "ready" && state.failures > 0 ? { ...state, failures: 0 } : state;
  }
}
