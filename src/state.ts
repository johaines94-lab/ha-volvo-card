import { ChargeState, HomeAssistant, VehicleKind, VolvoCardEntities } from "./types";

export function getState(hass: HomeAssistant, entityId?: string): string | undefined {
  if (!entityId) return undefined;
  return hass.states[entityId]?.state;
}

export function getAttr(hass: HomeAssistant, entityId: string | undefined, attr: string): any {
  if (!entityId) return undefined;
  return hass.states[entityId]?.attributes?.[attr];
}

export function numState(hass: HomeAssistant, entityId?: string): number | undefined {
  const s = getState(hass, entityId);
  if (s === undefined) return undefined;
  const n = parseFloat(s);
  return Number.isNaN(n) ? undefined : n;
}

export function round(n: number | undefined): number {
  return Math.round(n ?? 0);
}

/**
 * Vehicle kind is derived from which entities the user configured, not a
 * config flag — an unconfigured entity means "this vehicle doesn't have
 * that system" (e.g. no fuel entities on a full EV).
 */
export function deriveVehicleKind(entities: VolvoCardEntities): VehicleKind {
  const hasBattery = !!(entities.battery && entities.distance_to_empty_battery);
  const hasFuel = !!(entities.fuel_amount && entities.distance_to_empty_tank);
  if (hasBattery && hasFuel) return "hybrid";
  if (hasBattery) return "bev";
  if (hasFuel) return "ice";
  return "unknown";
}

export function isConnected(hass: HomeAssistant, entities: VolvoCardEntities): boolean {
  const connStatus = (getState(hass, entities.charging_connection_status) || "").toLowerCase();
  return connStatus.includes("connect") && !connStatus.includes("disconnect");
}

export function isCharging(hass: HomeAssistant, entities: VolvoCardEntities): boolean {
  const chargeStateStr = (getState(hass, entities.charging_status) || "").toLowerCase();
  return chargeStateStr.includes("charg") && !chargeStateStr.includes("not");
}

/**
 * Charging state only applies to vehicles with a battery. ICE vehicles are
 * always treated as idle (no plug, no charging UI, no pulse/cable overlay) —
 * this falls out naturally since an ICE config has no charging entities set,
 * so isConnected()/isCharging() are already false, but it's made explicit
 * here rather than relying on that as an implicit side effect.
 */
export function deriveChargeState(
  hass: HomeAssistant,
  entities: VolvoCardEntities,
  kind: VehicleKind
): ChargeState {
  if (kind === "ice") return "idle";
  if (!isConnected(hass, entities)) return "idle";
  return isCharging(hass, entities) ? "charging" : "scheduled";
}

export function statusText(
  hass: HomeAssistant,
  entities: VolvoCardEntities,
  chargeState: ChargeState,
  kind: VehicleKind
): string {
  if (kind === "ice") {
    const isHome = getState(hass, entities.location) === "home";
    const isLocked = getState(hass, entities.lock) === "locked";
    if (isHome && !isLocked) return "Unlocked";
    return "";
  }

  const isHome = getState(hass, entities.location) === "home";
  const isLocked = getState(hass, entities.lock) === "locked";
  const battery = numState(hass, entities.battery) ?? 0;
  const isFullyCharged = battery >= 100;

  if (isHome && !isLocked) return "Unlocked";
  if (chargeState === "scheduled") {
    return isFullyCharged && isLocked ? "Locked" : "Scheduled";
  }
  if (chargeState === "charging") return "Charging";
  if (isLocked) return "Locked";
  return "";
}
