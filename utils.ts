import { createDefine } from "fresh";
import type { Session } from "./utils/session.ts";

export interface State {
  session?: Session;
}

export const define = createDefine<State>();
