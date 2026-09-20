export interface HomeAssistant {
  states: {
    [entityId: string]: {
      state: string;
      attributes: Record<string, any>;
    };
  };
  themes?: {
    darkMode: boolean;
  };
  callService(domain: string, service: string, serviceData?: Record<string, unknown>): Promise<unknown>;
}

export interface VolvoCardEntities {
  battery?: string;
  distance_to_empty_battery?: string;
  distance_to_empty_tank?: string;
  fuel_amount?: string;
  fuel_tank_capacity_l?: number;
  charging_connection_status?: string;
  charging_status?: string;
  lock?: string;
  location?: string;
  start_climatisation?: string;
  stop_climatisation?: string;
}

export interface VolvoCardImages {
  exterior_back?: string;
  exterior_side_left?: string;
  fallback?: string;
}

export interface VolvoCardConfig {
  type: string;
  name?: string;
  entities: VolvoCardEntities;
  images?: VolvoCardImages;
}

export type ChargeState = "idle" | "scheduled" | "charging";
export type VehicleKind = "hybrid" | "bev" | "ice" | "unknown";
