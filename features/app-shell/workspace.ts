"use client";

import { createContext, useContext } from "react";
import type { useWorkspaceState } from "@/features/app-shell/use-workspace-state";

/** Lo que cada sección puede leer del espacio de trabajo (ver use-workspace-state.tsx). */
export type Workspace = ReturnType<typeof useWorkspaceState>;

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace se usa dentro de <ProgressClient>.");
  return workspace;
}
