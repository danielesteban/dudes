#include <math.h>
#include <stdbool.h> 
#include <stdlib.h>

enum BlockTypes {
  TYPE_AIR,
  TYPE_DIRT,
  TYPE_LIGHT,
  TYPE_STONE,
  TYPE_TREE
};

enum VoxelFields {
  VOXEL_TYPE,
  VOXEL_R,
  VOXEL_G,
  VOXEL_B,
  VOXEL_LIGHT,
  VOXEL_SUNLIGHT,
  VOXELS_STRIDE
};

typedef struct {
  const int width;
  const int height;
  const int depth;
  const int seaLevel;
} World;

static const unsigned char maxLight = 16;

static const int neighbors[] = {
  0, -1, 0,
  1, 0, 0,
  -1, 0, 0,
  0, 0, 1,
  0, 0, -1,
  0, 1, 0
};

static const int getVoxel(
  const World* world,
  const int x,
  const int y,
  const int z
) {
  if (
    x < 0 || x >= world->width
    || y < 0 || y >= world->height
    || z < 0 || z >= world->depth
  ) {
    return -1;
  }
  return (z * world->width * world->height + y * world->width + x) * VOXELS_STRIDE;
}

static void floodLight(
  const unsigned char channel,
  const World* world,
  const int* heightmap,
  unsigned char* voxels,
  int* queue,
  const unsigned int size,
  int* next
) {
  unsigned int nextLength = 0;
  for (unsigned int i = 0; i < size; i++) {
    const int voxel = queue[i];
    const unsigned char light = voxels[voxel + channel];
    if (light == 0) {
      continue;
    }
    const int index = voxel / VOXELS_STRIDE,
              z = floor(index / (world->width * world->height)),
              y = floor((index % (world->width * world->height)) / world->width),
              x = floor((index % (world->width * world->height)) % world->width);
    for (unsigned char n = 0; n < 6; n++) {
      const int nx = x + neighbors[n * 3],
                ny = y + neighbors[n * 3 + 1],
                nz = z + neighbors[n * 3 + 2],
                neighbor = getVoxel(world, nx, ny, nz);
      const unsigned char nl = channel == VOXEL_SUNLIGHT && n == 0 && light == maxLight ? (
        light
      ) : (
        light - 1
      );
      if (
        neighbor == -1
        || voxels[neighbor] != TYPE_AIR
        || (
          channel == VOXEL_SUNLIGHT
          && n != 0
          && light == maxLight
          && ny > heightmap[(nz * world->width) + nx]
        )
        || voxels[neighbor + channel] >= nl
      ) {
        continue;
      }
      voxels[neighbor + channel] = nl;
      next[nextLength++] = neighbor;
    }
  }
  if (nextLength > 0) {
    floodLight(
      channel,
      world,
      heightmap,
      voxels,
      next,
      nextLength,
      queue
    );
  }
}

static void removeLight(
  const unsigned char channel,
  const World* world,
  const int* heightmap,
  unsigned char* voxels,
  int* queue,
  const unsigned int size,
  int* next,
  int* floodQueue,
  unsigned int floodQueueSize
) {
  unsigned int nextLength = 0;
  for (int i = 0; i < size; i += 2) {
    const int voxel = queue[i];
    const unsigned char light = queue[i + 1];
    const int index = voxel / VOXELS_STRIDE,
              z = floor(index / (world->width * world->height)),
              y = floor((index % (world->width * world->height)) / world->width),
              x = floor((index % (world->width * world->height)) % world->width);
    for (unsigned char n = 0; n < 6; n++) {
      const int neighbor = getVoxel(
        world,
        x + neighbors[n * 3],
        y + neighbors[n * 3 + 1],
        z + neighbors[n * 3 + 2]
      );
      if (neighbor == -1 || voxels[neighbor] != TYPE_AIR) {
        continue;
      }
      const unsigned char nl = voxels[neighbor + channel];
      if (nl == 0) {
        continue;
      }
      if (
        nl < light
        || (
          channel == VOXEL_SUNLIGHT
          && n == 0
          && light == maxLight
          && nl == maxLight
        )
      ) {
        next[nextLength++] = neighbor;
        next[nextLength++] = nl;
        voxels[neighbor + channel] = 0;
      } else if (nl >= light) {
        floodQueue[floodQueueSize++] = neighbor;
      }
    }
  }
  if (nextLength > 0) {
    removeLight(
      channel,
      world,
      heightmap,
      voxels,
      next,
      nextLength,
      queue,
      floodQueue,
      floodQueueSize
    );
  } else if (floodQueueSize > 0) {
    floodLight(
      channel,
      world,
      heightmap,
      voxels,
      floodQueue,
      floodQueueSize,
      queue
    );
  }
}

void propagate(
  const World* world,
  const int* heightmap,
  unsigned char* voxels,
  int* queueA,
  int* queueB,
  int* queueC
) {
  unsigned int lightQueueSize = 0;
  unsigned int sunlightQueueSize = 0;
  for (int z = 0, voxel = 0; z < world->depth; z++) {
    for (int y = 0; y < world->height; y++) {
      for (int x = 0; x < world->width; x++, voxel += VOXELS_STRIDE) {
        if (y == world->height - 1 && voxels[voxel] == TYPE_AIR) {
          voxels[voxel + VOXEL_SUNLIGHT] = maxLight;
          queueA[sunlightQueueSize++] = voxel;
        } else if (voxels[voxel] == TYPE_LIGHT) {
          voxels[voxel + VOXEL_LIGHT] = maxLight;
          queueB[lightQueueSize++] = voxel;
        }
      }
    }
  }
  floodLight(
    VOXEL_SUNLIGHT,
    world,
    heightmap,
    voxels,
    queueA,
    sunlightQueueSize,
    queueC
  );
  floodLight(
    VOXEL_LIGHT,
    world,
    heightmap,
    voxels,
    queueB,
    lightQueueSize,
    queueC
  );
}

void update(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  int* queueA,
  int* queueB,
  int* queueC,
  const unsigned char type,
  const int x,
  const int y,
  const int z,
  const unsigned char r,
  const unsigned char g,
  const unsigned char b
) {
  if (
    x < 1 || x >= world->width - 1
    || y < 1 || y >= world->height - 1
    || z < 1 || z >= world->depth - 1
  ) {
    return;
  }
  const int voxel = getVoxel(world, x, y, z);
  const unsigned char current = voxels[voxel];
  voxels[voxel] = type;
  voxels[voxel + VOXEL_R] = r;
  voxels[voxel + VOXEL_G] = g;
  voxels[voxel + VOXEL_B] = b;
  if (current == type) {
    return;
  }
  const int heightmapIndex = z * world->width + x;
  const int height = heightmap[heightmapIndex];
  if (type == TYPE_AIR) {
    if (y == height) {
      for (int h = y - 1; h >= 0; h--) {
        if (h == 0 || voxels[getVoxel(world, x, h, z)] != TYPE_AIR) {
          heightmap[heightmapIndex] = h;
          break;
        }
      }
    }
  } else if (height < y) {
    heightmap[heightmapIndex] = y;
  }
  if (current == TYPE_LIGHT) {
    const unsigned char light = voxels[voxel + VOXEL_LIGHT];
    voxels[voxel + VOXEL_LIGHT] = 0;
    queueA[0] = voxel;
    queueA[1] = light;
    removeLight(
      VOXEL_LIGHT,
      world,
      heightmap,
      voxels,
      queueA,
      2,
      queueB,
      queueC,
      0
    );
  } else if (current == TYPE_AIR && type != TYPE_AIR) {
    for (unsigned char channel = VOXEL_LIGHT; channel <= VOXEL_SUNLIGHT; channel++) {
      const unsigned char light = voxels[voxel + channel];
      if (light != 0) {
        voxels[voxel + channel] = 0;
        queueA[0] = voxel;
        queueA[1] = light;
        removeLight(
          channel,
          world,
          heightmap,
          voxels,
          queueA,
          2,
          queueB,
          queueC,
          0
        );
      }
    }
  }
  if (type == TYPE_LIGHT) {
    voxels[voxel + VOXEL_LIGHT] = maxLight;
    queueA[0] = voxel;
    floodLight(
      VOXEL_LIGHT,
      world,
      heightmap,
      voxels,
      queueA,
      1,
      queueB
    );
  } else if (type == TYPE_AIR && current != TYPE_AIR) {
    unsigned int lightQueue = 0;
    unsigned int sunlightQueue = 0;
    for (unsigned char n = 0; n < 6; n++) {
      const int neighbor = getVoxel(
        world,
        x + neighbors[n * 3],
        y + neighbors[n * 3 + 1],
        z + neighbors[n * 3 + 2]
      );
      if (neighbor != -1) {
        if (voxels[neighbor + VOXEL_LIGHT] != 0) {
          queueA[lightQueue++] = neighbor;
        }
        if (voxels[neighbor + VOXEL_SUNLIGHT] != 0) {
          queueB[sunlightQueue++] = neighbor;
        }
      }
    }
    if (lightQueue > 0) {
      floodLight(
        VOXEL_LIGHT,
        world,
        heightmap,
        voxels,
        queueA,
        lightQueue,
        queueC
      );
    }
    if (sunlightQueue > 0) {
      floodLight(
        VOXEL_SUNLIGHT,
        world,
        heightmap,
        voxels,
        queueB,
        sunlightQueue,
        queueC
      );
    }
  }
}

int getHeight(
  const World* world,
  const int* heightmap,
  const int x,
  const int z
) {
  if (
    x < 0 || x >= world->width
    || z < 0 || z >= world->depth
  ) {
    return 0;
  }
  return heightmap[z * world->width + x];
}

unsigned short getLight(
  const World* world,
  unsigned char* voxels,
  const int x,
  const int y,
  const int z
) {
  if (
    x < 1 || x >= world->width - 1
    || y < 1 || y >= world->height - 1
    || z < 1 || z >= world->depth - 1
  ) {
    return 0xFF;
  }
  const int voxel = getVoxel(world, x, y, z);
  return (
    (((unsigned char) ((float) voxels[voxel + VOXEL_LIGHT] / maxLight * 0xFF)) << 8)
    | ((unsigned char) ((float) voxels[voxel + VOXEL_SUNLIGHT] / maxLight * 0xFF))
  );
}

#include "generation.c"
#include "mesher.c"
#include "pathfinding.c"
#include "physics.c"
