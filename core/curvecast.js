import { Vector3 } from '../vendor/three.js';

const maxSteps = 5;

const gravity = new Vector3(0, -1, 0);
const next = new Vector3();
const restore = {
  direction: new Vector3(),
  origin: new Vector3(),
};
const steps = [...Array(maxSteps + 2)].map(() => new Vector3());
const WorldUp = new Vector3(0, 1, 0);

export default function CurveCast({
  intersects,
  raycaster,
}) {
  const { far: distance, ray: { direction, origin } } = raycaster;
  const points = [];
  let stride = 0.125;
  let hit = false;
  restore.direction.copy(direction);
  restore.origin.copy(origin);
  next.copy(origin);
  for (let i = 0; i < maxSteps; i += 1) {
    stride *= 2;
    origin.copy(next);
    points.push(steps[i].copy(origin));
    next
      .copy(origin)
      .addScaledVector(direction, stride)
      .addScaledVector(gravity, (stride * stride) * 0.05);
    direction
      .subVectors(next, origin);
    raycaster.far = direction.length();
    direction.normalize();
    hit = raycaster.intersectObjects(intersects)[0] || false;
    if (hit) {
      break;
    }
  }
  // If it has hit a wall
  if (hit && hit.face.normal.dot(WorldUp) <= 0) {
    // Do one last bounce to the floor
    origin.copy(hit.point);
    points.push(steps[maxSteps].copy(origin));
    direction.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    direction.y = -1;
    direction.normalize();
    raycaster.far = distance;
    hit = raycaster.intersectObjects(intersects)[0] || false;
    if (hit && hit.face.normal.dot(WorldUp) <= 0) {
      hit = false;
    }
  }
  if (hit) {
    points.push(steps[maxSteps + 1].copy(hit.point));
  }
  direction.copy(restore.direction);
  origin.copy(restore.origin);
  raycaster.far = distance;
  return { hit, points };
}
