import type { ComponentType } from "react";
import type { SceneId } from "@/lib/chapters";

export type SceneMode = "cover" | "banner" | "background";

/** Every scene file exports a Main component (cover/banner) and optionally a
 * Background component. `mode` tunes framing/density inside Main. */
export type Scene = {
  Main: ComponentType<{ mode: "cover" | "banner" }>;
  Background?: ComponentType;
};

import * as Agua from "./Agua";
import * as Perfeito from "./Perfeito";
import * as Seco from "./Seco";
import * as Maos from "./Maos";
import * as Triangulo from "./Triangulo";
import * as Construcao from "./Construcao";
import * as Denso from "./Denso";
import * as Borboletas from "./Borboletas";
import * as Cidade from "./Cidade";
import * as Predio from "./Predio";

export const SCENES: Record<SceneId, Scene> = {
  agua: Agua,
  perfeito: Perfeito,
  seco: Seco,
  maos: Maos,
  triangulo: Triangulo,
  construcao: Construcao,
  denso: Denso,
  borboletas: Borboletas,
  cidade: Cidade,
  predio: Predio,
};
