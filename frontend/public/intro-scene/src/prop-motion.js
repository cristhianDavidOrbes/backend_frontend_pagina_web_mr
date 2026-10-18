// Distances along the same physical route drive the car, road and wheel roll.
export const EXIT_APPROACH = 3.15;
export const EXIT_RADIUS = 1.8;
export const EXIT_ARC = Math.PI * EXIT_RADIUS / 2;

export function exitRoute(distance) {
  const s = Math.max(0, distance);
  if (s <= EXIT_APPROACH) return { x: 1.5, z: -3.05 - s, yaw: Math.PI / 2 };
  if (s < EXIT_APPROACH + EXIT_ARC) {
    const angle = (s - EXIT_APPROACH) / EXIT_RADIUS;
    return {
      x: 1.5 + EXIT_RADIUS * (1 - Math.cos(angle)),
      z: -6.2 - EXIT_RADIUS * Math.sin(angle),
      yaw: Math.PI / 2 - angle,
    };
  }
  return { x: 1.5 + EXIT_RADIUS + s - EXIT_APPROACH - EXIT_ARC, z: -6.2 - EXIT_RADIUS, yaw: 0 };
}

export function carDeparture(time) {
  const elapsed = Math.max(0, time - 9.4);
  const distance = Math.min(28, 5.5 * elapsed + 1.6 * elapsed * elapsed);
  return { ...exitRoute(distance), distance };
}
