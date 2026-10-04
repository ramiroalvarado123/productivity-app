import type { SessionUser } from "@/server/auth/session";

/** Lo que recibe cada acción de `POST /api/progress`. */
export type ActionContext = {
  /** El cuerpo del pedido tal cual llegó (se valida dentro de cada acción). */
  p: Record<string, unknown>;
  action: string;
  email: string;
  user: SessionUser;
};
export type ActionHandler = (context: ActionContext) => Promise<Response>;
export type ActionMap = Record<string, ActionHandler>;
