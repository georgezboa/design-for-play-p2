export const NIGHT_POWER_LEVELS = Object.freeze({
  // Restoring the grid must not behave like raising a global brightness
  // slider.  The city remains dark; the lamps create the readable space.
  blackoutExposure: 0.20,
  poweredExposure: 0.27,
  blackoutStreetlightFactor: 0,
  poweredStreetlightFactor: 1,
  activePoolCount: 8,
  shadowCasterCount: 2,
  blackoutBulbIntensity: 0.18,
  poweredBulbIntensity: 16,
  blackoutGroundPoolOpacity: 0,
  poweredGroundPoolOpacity: 0.18,
  emergencyBeaconIntensity: 4.5,
  stationLampIntensity: 68,
});

export function getNightPowerPresentation(record = {}) {
  const powered = record.stationLampOn === true;
  return {
    powered,
    exposure: powered ? NIGHT_POWER_LEVELS.poweredExposure : NIGHT_POWER_LEVELS.blackoutExposure,
    streetlightFactor: powered
      ? NIGHT_POWER_LEVELS.poweredStreetlightFactor
      : NIGHT_POWER_LEVELS.blackoutStreetlightFactor,
    activePoolCount: powered ? NIGHT_POWER_LEVELS.activePoolCount : 0,
    shadowCasterCount: powered ? NIGHT_POWER_LEVELS.shadowCasterCount : 0,
    bulbIntensity: powered
      ? NIGHT_POWER_LEVELS.poweredBulbIntensity
      : NIGHT_POWER_LEVELS.blackoutBulbIntensity,
    groundPoolOpacity: powered
      ? NIGHT_POWER_LEVELS.poweredGroundPoolOpacity
      : NIGHT_POWER_LEVELS.blackoutGroundPoolOpacity,
    emergencyBeaconIntensity: powered ? 0 : NIGHT_POWER_LEVELS.emergencyBeaconIntensity,
    stationLampIntensity: powered ? NIGHT_POWER_LEVELS.stationLampIntensity : 0,
  };
}

export function rankStreetlightsByDistance(player = { x: 0, z: 0 }, lights = []) {
  return lights
    .map((entry, index) => ({
      index,
      distanceSq: (entry.x - player.x) ** 2 + (entry.z - player.z) ** 2,
    }))
    .sort((a, b) => a.distanceSq - b.distanceSq)
    .map(({ index }) => index);
}
