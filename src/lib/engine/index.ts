/**
 * Factory do provider de cálculo. O resto do app importa daqui, nunca da
 * implementação concreta.
 */
import type { EngineProvider } from "./types";
import { LocalEngineProvider, ENGINE_VERSION } from "./local";
import { WorkerEngineProvider } from "./worker";

let instance: EngineProvider | null = null;

export function getEngineProvider(): EngineProvider {
  if (!instance) {
    instance =
      process.env.ECE_PROVIDER === "worker"
        ? new WorkerEngineProvider()
        : new LocalEngineProvider();
  }
  return instance;
}

export { ENGINE_VERSION };
export * from "./types";
export * from "./nbr16401";
