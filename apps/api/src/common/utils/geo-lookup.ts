import geoip from "geoip-lite";

export interface IpLocation {
  city: string | null;
  state: string | null;
}

export function getLocationFromIp(ip: string | null | undefined): IpLocation {
  if (!ip) return { city: null, state: null };
  const cleanIp = ip === "::1" || ip === "127.0.0.1" ? "" : ip.split(",")[0].trim();
  if (!cleanIp) return { city: null, state: null };

  const geo = geoip.lookup(cleanIp);
  if (!geo) return { city: null, state: null };

  return {
    city: geo.city || null,
    state: geo.region || null,
  };
}
