/** The moving book-door and its real wall aperture share these coordinates. */
// Move forward along the right wall, leaving more space beside the plant.
// The door, plaster opening and retracting skirting share this same center.
// The back of the .19 m jamb sits exactly on the wall's inner face (x=6.45).
export const DOOR_MOUNT = { x: 6.45 - .19 / 2, y: -1.55, z: 1.15, yaw: -Math.PI / 2, width: 1.1, height: 2.4 };
const phase = (t, a, b) => {
  const p = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return p * p * (3 - 2 * p);
};
export function doorPose(t) {
  const install = phase(t, 5.1, 6.15);
  return {
    position: [.6 + (DOOR_MOUNT.x - .6) * install, -1.5 + (DOOR_MOUNT.y + 1.5) * install, DOOR_MOUNT.z * install],
    growth: phase(t, 2.3, 3.05),
    yaw: DOOR_MOUNT.yaw * phase(t, 5.3, 6.15),
    // Keep plaster AND skirting intact until the last part of docking.
    aperture: phase(t, 5.9, 6.15),
    angle: -.85 * phase(t, 3.25, 4.1) * (1 - phase(t, 4.35, 5.1)),
    installed: install === 1,
  };
}
