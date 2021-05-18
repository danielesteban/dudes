#include "../../vendor/AStar/AStar.c"

typedef struct {
  int x;
  int y;
  int z;
} PathNode;

typedef struct {
  const World* world;
  const unsigned char* voxels;
  const unsigned char* obstacles;
  const int height;
} PathContext;

static const bool canWalk(
  const PathContext* context,
  const int x,
  const int y,
  const int z
) {
  if (y < context->world->seaLevel) {
    return false;
  }
  const int voxel = getVoxel(context->world, x, y, z);
  if (voxel == -1 || context->voxels[voxel] == TYPE_AIR) {
    return false;
  }
  for (int h = 1; h <= context->height; h++) {
    const int voxel = getVoxel(context->world, x, y + h, z);
    if (
      voxel == -1
      || context->voxels[voxel] != TYPE_AIR
      || context->obstacles[voxel / VOXELS_STRIDE]
    ) {
      return false;
    }
  }
  return true;
}

static void PathNodeNeighbors(ASNeighborList neighbors, void* pathNode, void* pathContext) {
  PathNode* node = (PathNode*) pathNode;
  PathContext* context = (PathContext*) pathContext;

  if (canWalk(context, node->x + 1, node->y - 1, node->z)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x + 1, node->y, node->z}, 1);
  } else if (canWalk(context, node->x + 1, node->y, node->z)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x + 1, node->y + 1, node->z}, 2);
  } else if (canWalk(context, node->x + 1, node->y - 2, node->z)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x + 1, node->y - 1, node->z}, 2);
  }

  if (canWalk(context, node->x - 1, node->y - 1, node->z)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x - 1, node->y, node->z}, 1);
  } else if (canWalk(context, node->x - 1, node->y, node->z)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x - 1, node->y + 1, node->z}, 2);
  } else if (canWalk(context, node->x - 1, node->y - 2, node->z)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x - 1, node->y - 1, node->z}, 2);
  }

  if (canWalk(context, node->x, node->y - 1, node->z + 1)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x, node->y, node->z + 1}, 1);
  } else if (canWalk(context, node->x, node->y, node->z + 1)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x, node->y + 1, node->z + 1}, 2);
  } else if (canWalk(context, node->x, node->y - 2, node->z + 1)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x, node->y - 1, node->z + 1}, 2);
  }

  if (canWalk(context, node->x, node->y - 1, node->z - 1)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x, node->y, node->z - 1}, 1);
  } else if (canWalk(context, node->x, node->y, node->z - 1)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x, node->y + 1, node->z - 1}, 2);
  } else if (canWalk(context, node->x, node->y - 2, node->z - 1)) {
    ASNeighborListAdd(neighbors, &(PathNode){node->x, node->y - 1, node->z - 1}, 2);
  }
}

static float PathNodeHeuristic(void* fromNode, void* toNode, void* context) {
  PathNode* from = (PathNode*) fromNode;
  PathNode* to = (PathNode*) toNode;
  return abs(from->x - to->x) + abs(from->y - to->y) + abs(from->z - to->z);
}

static int EarlyExit(size_t visitedCount, void* visitingNode, void* goalNode, void* context) {
  if (visitedCount > 4096) {
    return -1;
  }
  return 0;
}

static const ASPathNodeSource PathNodeSource = {
  sizeof(PathNode),
  &PathNodeNeighbors,
  &PathNodeHeuristic,
  &EarlyExit,
  NULL
};

const int findPath(
  const World* world,
  const unsigned char* voxels,
  const unsigned char* obstacles,
  int* results,
  const int height,
  const int fromX,
  const int fromY,
  const int fromZ,
  const int toX,
  const int toY,
  const int toZ
) {
  if (
    fromX < 0
    || fromY < 0
    || fromZ < 0
    || fromX >= world->width
    || fromY >= world->height
    || fromZ >= world->depth
    || toX < 0
    || toY < 0
    || toZ < 0
    || toX >= world->width
    || toY >= world->height
    || toZ >= world->depth
  ) {
    return -1;
  }
  ASPath path = ASPathCreate(
    &PathNodeSource,
    &(PathContext){world, voxels, obstacles, height},
    &(PathNode){fromX, fromY, fromZ},
    &(PathNode){toX, toY, toZ}
  );
  const int nodes = ASPathGetCount(path);
  for (int i = 0, p = 0; i < nodes; i++, p += 4) {
    PathNode* node = ASPathGetNode(path, i);
    const int light = getVoxel(world, node->x, node->y + 1, node->z);
    results[p] = node->x;
    results[p + 1] = node->y;
    results[p + 2] = node->z;
    results[p + 3] = (
      (((unsigned char) ((float) voxels[light + VOXEL_LIGHT] / maxLight * 0xFF)) << 8)
      | ((unsigned char) ((float) voxels[light + VOXEL_SUNLIGHT] / maxLight * 0xFF))
    );
  }
  ASPathDestroy(path);
  return nodes;
}

const unsigned char findTarget(
  const World* world,
  const int* heightmap,
  const unsigned char* voxels,
  const unsigned char* obstacles,
  int* point,
  const int height,
  const int radius,
  const int originX,
  const int originY,
  const int originZ
) {
  const int fromX = fmax(originX - radius, 1);
  const int toX = fmin(originX + radius, world->width - 1);
  const int fromZ = fmax(originZ - radius, 1);
  const int toZ = fmin(originZ + radius, world->depth - 1);
  point[0] = fromX + rand() % (toX - fromX);
  point[2] = fromZ + rand() % (toZ - fromZ);
  const int groundHeight = heightmap[(point[2] * world->width) + point[0]];
  const int fromY = fmax(originY - radius, world->seaLevel);
  const int toY = fmin(fmin(originY, groundHeight) + radius, world->height - 5);
  if (groundHeight < world->seaLevel || toY <= fromY) {
    return 0;
  }
  point[1] = fromY + rand() % (toY - fromY);
  const int voxel = getVoxel(world, point[0], point[1], point[2]);
  if (
    voxels[voxel] != TYPE_AIR || obstacles[voxel / VOXELS_STRIDE]
  ) {
    return 0;
  }
  for (int y = point[1] - 1; y >= world->seaLevel; y--) {
    const int type = voxels[getVoxel(world, point[0], y, point[2])];
    if (type == TYPE_AIR || type == TYPE_TREE) {
      continue;
    }
    bool isValid = true;
    for (int h = 1; h <= height; h++) {
      const int voxel = getVoxel(world, point[0], y + h, point[2]);
      if (
        voxels[voxel] != TYPE_AIR
        || obstacles[voxel / VOXELS_STRIDE]
      ) {
        isValid = false;
        break;
      }
    }
    if (isValid) {
      point[1] = y + 1;
      return 1;
    }
  }
  return 0;
}
