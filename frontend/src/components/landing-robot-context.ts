"use client";
import { createContext } from "react";
const ignoreMessage = (message: Record<string, unknown>) => { void message; };
export const LandingRobotContext = createContext({ live: false, send: ignoreMessage });
