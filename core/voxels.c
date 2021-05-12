#include "../vendor/AStar/AStar.h"
#define FNL_IMPL
#include "../vendor/FastNoiseLite.h"

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

static const unsigned char seaLevel = 5;

static const unsigned char getAO(
  const unsigned char* voxels,
  const int n1,
  const int n2,
  const int n3
) {
  const unsigned char v1 = n1 != -1 && voxels[n1] != TYPE_AIR,
                      v2 = n2 != -1 && voxels[n2] != TYPE_AIR,
                      v3 = n3 != -1 && voxels[n3] != TYPE_AIR;
  unsigned char ao = 0;
  if (v1) ao += 20;
  if (v2) ao += 20;
  if ((v1 && v2) || v3) ao += 20;
  return ao;
}

static const unsigned int getColorFromNoise(unsigned char noise) {
  noise = 255 - noise;
  if (noise < 85) {
    return (
      ((255 - noise * 3) << 16)
      | (0 << 8)
      | (noise * 3)
    );
  }
  if (noise < 170) {
    noise -= 85;
    return (
      (0 << 16)
      | ((noise * 3) << 8)
      | (255 - noise * 3)
    );
  }
  noise -= 170;
  return (
    ((noise * 3) << 16)
    | ((255 - noise * 3) << 8)
    | 0
  );
}

static const unsigned int getLighting(
  const unsigned char* voxels,
  const unsigned char light,
  const unsigned char sunlight,
  const int n1,
  const int n2,
  const int n3
) {
  const unsigned char v1 = n1 != -1 && voxels[n1] == TYPE_AIR,
                      v2 = n2 != -1 && voxels[n2] == TYPE_AIR,
                      v3 = n3 != -1 && voxels[n3] == TYPE_AIR;
  unsigned char n = 1;
  float avgLight = light;
  float avgSunlight = sunlight;
  if (v1) {
    avgLight += voxels[n1 + VOXEL_LIGHT];
    avgSunlight += voxels[n1 + VOXEL_SUNLIGHT];
    n++;
  }
  if (v2) {
    avgLight += voxels[n2 + VOXEL_LIGHT];
    avgSunlight += voxels[n2 + VOXEL_SUNLIGHT];
    n++;
  }
  if ((v1 || v2) && v3) {
    avgLight += voxels[n3 + VOXEL_LIGHT];
    avgSunlight += voxels[n3 + VOXEL_SUNLIGHT];
    n++;
  }
  avgLight = avgLight / n / maxLight * 0xFF;
  avgSunlight = avgSunlight / n / maxLight * 0xFF;
  return (
    (getAO(voxels, n1, n2, n3) << 16) | (((unsigned char) avgLight) << 8) | ((unsigned char) avgSunlight)
  );
}

static const int getVoxel(
  const World* world,
  const int x,
  const int y,
  const int z
) {
  if (
    x < 0 || y >= world->width
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

static void growBox(
  unsigned char* box,
  const unsigned char x,
  const unsigned char y,
  const unsigned char z
) {
  if (box[0] > x) box[0] = x;
  if (box[1] > y) box[1] = y;
  if (box[2] > z) box[2] = z;
  if (box[3] < x) box[3] = x;
  if (box[4] < y) box[4] = y;
  if (box[5] < z) box[5] = z;
}

static void pushFace(
  unsigned char* box,
  unsigned int* faces,
  unsigned int* indices,
  unsigned char* vertices,
  const int chunkX, const int chunkY, const int chunkZ,
  const unsigned char r, const unsigned char g, const unsigned char b,
  const int wx1, const int wy1, const int wz1, const unsigned int l1,
  const int wx2, const int wy2, const int wz2, const unsigned int l2,
  const int wx3, const int wy3, const int wz3, const unsigned int l3,
  const int wx4, const int wy4, const int wz4, const unsigned int l4
) {
  const float ao1 = ((l1 >> 16) & 0xFF) / 255.0f,
                      ao2 = ((l2 >> 16) & 0xFF) / 255.0f,
                      ao3 = ((l3 >> 16) & 0xFF) / 255.0f,
                      ao4 = ((l4 >> 16) & 0xFF) / 255.0f;
  const unsigned int  vertex = *faces * 4,
                      vertexOffset = vertex * 8,
                      indexOffset = *faces * 6,
                      flipFace = ao1 + ao3 > ao2 + ao4 ? 1 : 0; // Fixes interpolation anisotropy
  const unsigned char x1 = wx1 - chunkX,
                      y1 = wy1 - chunkY,
                      z1 = wz1 - chunkZ,
                      x2 = wx2 - chunkX,
                      y2 = wy2 - chunkY,
                      z2 = wz2 - chunkZ,
                      x3 = wx3 - chunkX,
                      y3 = wy3 - chunkY,
                      z3 = wz3 - chunkZ,
                      x4 = wx4 - chunkX,
                      y4 = wy4 - chunkY,
                      z4 = wz4 - chunkZ;
  (*faces)++;
  // Is this crazy? I dunno. You tell me.
  vertices[vertexOffset] = x1;
  vertices[vertexOffset + 1] = y1;
  vertices[vertexOffset + 2] = z1;
  vertices[vertexOffset + 3] = r * (1.0f - ao1);
  vertices[vertexOffset + 4] = g * (1.0f - ao1);
  vertices[vertexOffset + 5] = b * (1.0f - ao1);
  vertices[vertexOffset + 6] = (l1 >> 8) & 0xFF;
  vertices[vertexOffset + 7] = l1 & 0xFF;
  vertices[vertexOffset + 8] = x2;
  vertices[vertexOffset + 9] = y2;
  vertices[vertexOffset + 10] = z2;
  vertices[vertexOffset + 11] = r * (1.0f - ao2);
  vertices[vertexOffset + 12] = g * (1.0f - ao2);
  vertices[vertexOffset + 13] = b * (1.0f - ao2);
  vertices[vertexOffset + 14] = (l2 >> 8) & 0xFF;
  vertices[vertexOffset + 15] = l2 & 0xFF;
  vertices[vertexOffset + 16] = x3;
  vertices[vertexOffset + 17] = y3;
  vertices[vertexOffset + 18] = z3;
  vertices[vertexOffset + 19] = r * (1.0f - ao3);
  vertices[vertexOffset + 20] = g * (1.0f - ao3);
  vertices[vertexOffset + 21] = b * (1.0f - ao3);
  vertices[vertexOffset + 22] = (l3 >> 8) & 0xFF;
  vertices[vertexOffset + 23] = l3 & 0xFF;
  vertices[vertexOffset + 24] = x4;
  vertices[vertexOffset + 25] = y4;
  vertices[vertexOffset + 26] = z4;
  vertices[vertexOffset + 27] = r * (1.0f - ao4);
  vertices[vertexOffset + 28] = g * (1.0f - ao4);
  vertices[vertexOffset + 29] = b * (1.0f - ao4);
  vertices[vertexOffset + 30] = (l4 >> 8) & 0xFF;
  vertices[vertexOffset + 31] = l4 & 0xFF;
  indices[indexOffset] = vertex + flipFace;
  indices[indexOffset + 1] = vertex + flipFace + 1;
  indices[indexOffset + 2] = vertex + flipFace + 2;
  indices[indexOffset + 3] = vertex + flipFace + 2;
  indices[indexOffset + 4] = vertex + ((flipFace + 3) % 4);
  indices[indexOffset + 5] = vertex + flipFace;
  growBox(box, x1, y1, z1);
  growBox(box, x2, y2, z2);
  growBox(box, x3, y3, z3);
  growBox(box, x4, y4, z4);
}

static void generateBillboard(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  const int x,
  const int y,
  const int z,
  const unsigned int tint,
  const int width,
  const int height,
  const int depth
) {
  const unsigned int color = getColorFromNoise(tint);
  const int legs = height / 3;
  for (int bz = 0; bz < depth; bz++) {
    for (int by = 0; by < height; by++) {
      for (int bx = 0; bx < width; bx++) {
        if (
          (
            by < legs
            && (bx + 1) % 4 < 2
          ) || (
            by > legs
            && by < height - 1
            && bz == depth - 1
          )
        ) {
          continue;
        }
        const int type = (
          (by == legs || by == height - 1)
          && bz == depth - 1
          && (bx + 1) % 4 >= 2
        ) ? TYPE_LIGHT : TYPE_STONE;
        const int voxel = getVoxel(world, x + bx, y + by, z + bz);
        voxels[voxel] = type;
        voxels[voxel + VOXEL_R] = fmin(fmax((int) ((color >> 16) & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
        voxels[voxel + VOXEL_G] = fmin(fmax((int) ((color >> 8) & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
        voxels[voxel + VOXEL_B] = fmin(fmax((int) (color & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
        const int heightmapIndex = (bz + z) * world->width + (bx + x);
        if (heightmap[heightmapIndex] < y + by) {
          heightmap[heightmapIndex] = y + by;
        }
      }
    }
  }
}

static void generateBuilding(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  const int x,
  const int z,
  const unsigned int tint,
  const int size,
  const int height,
  const int floorHeight,
  const int windowsWidth
) {
  for (int bz = 0; bz < size; bz++) {
    for (int y = 0; y < height; y++) {
      for (int bx = 0; bx < size; bx++) {
        const int fy = y % floorHeight;
        const int f = floor(y / floorHeight);
        if (
          (
            // Floors
            fy < 2
            && bx != 0 && bx != size - 1
            && bz != 0 && bz != size - 1
            && !(
              // Stairs north hole
              f % 2 != 0 && bx >= size / 2 - 5 && bx < size / 2 - 1
              && (bz > size / 5)
              && (bz < size / 2 - (fy == 1 ? 4 : 5))
            ) && !(
              // Stairs south hole
              f % 2 == 0 && bx >= size / 2 + 1 && bx < size / 2 + 5
              && (bz >= size / 2 + (fy == 1 ? 4 : 5))
              && (bz < size - 1 - (size / 5))
            )
          ) || (
            // Exterior walls X
            fy >= 2
            && (bx == 0 || bx == 1 || bx == size - 1 || bx == size - 2)
            && (
              // Windows
              fy < 5
              || fy > floorHeight - (bx == 0 || bx == size - 1 ? 4 : 5)
              || bz % windowsWidth < 4
            )
          ) || (
            // Exterior walls Z
            fy >= 2
            && (bz == 0 || bz == 1 || bz == size - 1 || bz == size - 2)
            && (
              // Windows
              fy < 5
              || fy > floorHeight - (bz == 0 || bz == size - 1 ? 4 : 5)
              || bx % windowsWidth < 4
            )
          ) || (
            // Lights
            (fy == 2 || fy == floorHeight - 1)
            && (bx == 2 || bx == size - 3 || bz == 2 || bz == size - 3)
          ) || (
            // Interior walls X
            ((bz > 0 && bz < size / 2 - 4) || (bz > size / 2 + 3 && bz < size - 1)) && (bx == size / 2 - 1 || bx == size / 2)
          ) || (
            // Interior walls Z
            ((bx > 0 && bx < size / 2 - 4) || (bx > size / 2 + 3 && bx < size - 1)) && (bz == size / 2 - 1 || bz == size / 2)
          ) || (
            // Stairs North
            y < height - 4
            && f % 2 == 0
            && (bz - size / 2 + floorHeight + 5) == fy && bx >= size / 2 - 5 && bx < size / 2 - 1
          ) || (
            // Stairs North top
            fy >= 2 && fy < 4
            && f % 2 != 0
            && bx >= size / 2 - 6 && bx < size / 2 - 1
            && (bz >= size / 5)
            && (bz < size / 2 - 4)
            && (bz == size / 5 || bx == size / 2 - 6)
          ) || (
            // Stairs South
            y < height - 4
            && f % 2 != 0
            && ((size - 1 - bz) - size / 2 + floorHeight + 5) == fy && bx >= size / 2 + 1 && bx < size / 2 + 5
          ) || (
            // Stairs South top
            fy >= 2 && fy < 4
            && f % 2 == 0
            && bx >= size / 2 + 1 && bx < size / 2 + 6
            && (bz >= size / 2 + 4)
            && (bz <= size - 1 - (size / 5))
            && (bz == size - 1 - (size / 5) || bx == size / 2 + 5)
          )
        ) {
          unsigned char type = TYPE_STONE;
          if (fy == 0) {
            const float bdx = bx - size / 2 + 0.5f;
            const float bdz = bz - size / 2 + 0.5f;
            const int bdist = sqrt(bdx * bdx + bdz * bdz);
            if (bdist / 2 == size / ((y / floorHeight) + 8)) {
              type = TYPE_LIGHT;
            }
          } else if (
            fy == 2
            && bx != 0 && bx != size - 1
            && bz != 0 && bz != size - 1
            && (bx == 2 || bx == size - 3 || bz == 2 || bz == size - 3)
          ) {
            type = TYPE_LIGHT;
          }
          const unsigned int color = getColorFromNoise((tint * (f + 1)) % 0xFF);
          const int voxel = getVoxel(world, x + bx, y, z + bz);
          voxels[voxel] = type;
          voxels[voxel + VOXEL_R] = fmin(fmax((int) ((color >> 16) & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
          voxels[voxel + VOXEL_G] = fmin(fmax((int) ((color >> 8) & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
          voxels[voxel + VOXEL_B] = fmin(fmax((int) (color & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
          if (y <= seaLevel) {
            voxels[voxel + VOXEL_R] /= 2;
            voxels[voxel + VOXEL_G] /= 2;
          }
          const int heightmapIndex = (bz + z) * world->width + (bx + x);
          if (heightmap[heightmapIndex] < y) {
            heightmap[heightmapIndex] = y;
          }
        }
      }
    }
  }
}

static void generateLamp(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  const int x,
  const int y,
  const int z,
  const unsigned int color
) {
  for (int i = 0; i < 2; i++) {
    const int ly = y + i;
    const int voxel = getVoxel(world, x, ly, z);
    voxels[voxel] = i == 1 ? TYPE_LIGHT : TYPE_STONE;
    voxels[voxel + VOXEL_R] = fmin(fmax((int) ((color >> 16) & 0xFF) + (rand() % 0x22) * (i == 1 ? 2 : -1), 0), 0xFF);
    voxels[voxel + VOXEL_G] = fmin(fmax((int) ((color >> 8) & 0xFF) + (rand() % 0x22) * (i == 1 ? 2 : -1), 0), 0xFF);
    voxels[voxel + VOXEL_B] = fmin(fmax((int) (color & 0xFF) + (rand() % 0x22) * (i == 1 ? 2 : -1), 0), 0xFF);
    const int heightmapIndex = z * world->width + x;
    if (heightmap[heightmapIndex] < ly) {
      heightmap[heightmapIndex] = ly;
    }
  }
}

static const int branchOffsets[] = {
  0, 1, 0,
  -2, 0, 0,
  2, 0, 0,
  0, 0, -2,
  0, 0, 2
};

static void growTree(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  const unsigned int color,
  const int trunk,
  const int branches,
  const int size,
  int* queue,
  const unsigned int queueLength,
  int* next
) {
  unsigned int nextLength = 0;
  for (unsigned int i = 0; i < queueLength; i += 2) {
    const int voxel = queue[i];
    const int distance = queue[i + 1];
    const int index = voxel / VOXELS_STRIDE,
          z = floor(index / (world->width * world->height)),
          y = floor((index % (world->width * world->height)) / world->width),
          x = floor((index % (world->width * world->height)) % world->width);
    const unsigned char isTrunk = distance <= trunk;
    if (isTrunk) {
      for (int j = -1; j <= 1; j++) {
        for (int k = -1; k <= 1; k++) {
          const int n = getVoxel(world, x + j, y, z + k);
          voxels[n] = TYPE_TREE;
          voxels[n + VOXEL_R] = fmax((int) ((color >> 16) & 0xFF) / 2 - (rand() % 0x11), 0);
          voxels[n + VOXEL_G] = fmax((int) ((color >> 8) & 0xFF) / 2 - (rand() % 0x11), 0);
          voxels[n + VOXEL_B] = fmax((int) (color & 0xFF) / 2 - (rand() % 0x11), 0);
        }
      }
    } else {
      const int f = floor(((distance - trunk) / size) * 0x33);
      voxels[voxel] = TYPE_TREE;
      if (distance < branches) {
        voxels[voxel + VOXEL_R] = fmin(fmax((int) ((color >> 16) & 0xFF) / 2 + f - (rand() % 0x11), 0), 0xFF);
        voxels[voxel + VOXEL_G] = fmin(fmax((int) ((color >> 8) & 0xFF) / 2 + f - (rand() % 0x11), 0), 0xFF);
        voxels[voxel + VOXEL_B] = fmin(fmax((int) (color & 0xFF) / 2 + f - (rand() % 0x11), 0), 0xFF);
      } else {
        voxels[voxel + VOXEL_R] = fmin(fmax((int) ((color >> 16) & 0xFF) + f - (rand() % 0x11), 0), 0xFF);
        voxels[voxel + VOXEL_G] = fmin(fmax((int) ((color >> 8) & 0xFF) + f - (rand() % 0x11), 0), 0xFF);
        voxels[voxel + VOXEL_B] = fmin(fmax((int) (color & 0xFF) + f - (rand() % 0x11), 0), 0xFF);
      }
    }
    const int heightmapIndex = z * world->width + x;
    if (heightmap[heightmapIndex] < y) {
      heightmap[heightmapIndex] = y;
    }
    if (distance == trunk) {
      for (int j = 0; j < 15; j += 3) {
        const int n = getVoxel(world, x + branchOffsets[j], y + branchOffsets[j + 1], z + branchOffsets[j + 2]);
        if (n != -1 && voxels[n] == TYPE_AIR) {
          next[nextLength++] = n; 
          next[nextLength++] = distance + 1; 
        }
      }
    } else if (isTrunk) {
      const int n = getVoxel(world, x, y + 1, z);
      if (n != -1 && (distance < 2 || voxels[n] == TYPE_AIR)) {
        next[nextLength++] = n; 
        next[nextLength++] = distance + 1; 
      } else if (distance > trunk * 0.25f) {
        next[nextLength++] = voxel; 
        next[nextLength++] = trunk; 
      }
    } else if (distance < size) {
      int count = 0;
      for (int j = 0; j < 6; j++) {
        const int ni = rand() % 6;
        const int n = getVoxel(world, x + neighbors[ni * 3], y + neighbors[ni * 3 + 1], z + neighbors[ni * 3 + 2]);
        if (n != -1 && voxels[n] == TYPE_AIR) {
          next[nextLength++] = n; 
          next[nextLength++] = distance + 1;
          count++;
          if (count >= 2) {
            break;
          }
        }
      }
    }
  }
  if (nextLength > 0) {
    growTree(
      world,
      heightmap,
      voxels,
      color,
      trunk,
      branches,
      size,
      next,
      nextLength,
      queue
    );
  }
}

static void generateTree(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  const int x,
  const int y,
  const int z,
  const unsigned int color,
  const int size,
  const int radius,
  int* queueA,
  int* queueB
) {
  queueA[0] = getVoxel(world, x, fmax(y - 1, 0), z);
  queueA[1] = 0;
  growTree(
    world,
    heightmap,
    voxels,
    color,
    size,
    size + floor(radius * 0.75f),
    size + radius,
    queueA,
    2,
    queueB
  );
}

void generate(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  int* queueA,
  int* queueB,
  const int seed,
  const int type
) {
  fnl_state noise = fnlCreateState();
  noise.seed = seed;
  noise.fractal_type = FNL_FRACTAL_FBM;
  const int centerX = world->width * 0.5f;
  const int centerZ = world->depth * 0.5f;
  const int radius = sqrt(centerX * centerX + centerZ * centerZ) * 0.65f;
  const int maxTerrainHeight = world->height / (type == 1 ? 3.0f : 2.5f);
  for (int z = 0; z < world->depth; z++) {
    for (int y = 0; y < maxTerrainHeight; y++) {
      for (int x = 0; x < world->width; x++) {
        const int dx = x - centerX;
        const int dz = z - centerZ;
        const int distance = sqrt(dx * dx + dz * dz);
        if (distance > radius) {
          continue;
        }
        const float n = fabs(fnlGetNoise3D(&noise, (float) x * 0.5f, (float) y, (float) z * 0.5f));
        if (y == 0 || y < n * maxTerrainHeight) {
          const int voxel = getVoxel(world, x, y, z);
          voxels[voxel] = TYPE_DIRT;
          const unsigned int color = getColorFromNoise(0xFF * n);
          voxels[voxel + VOXEL_R] = (color >> 16) & 0xFF;
          voxels[voxel + VOXEL_G] = (color >> 8) & 0xFF;
          voxels[voxel + VOXEL_B] = color & 0xFF;
          if (y <= seaLevel) {
            voxels[voxel + VOXEL_R] /= 2;
            voxels[voxel + VOXEL_G] /= 2;
          }
          const int heightmapIndex = z * world->width + x;
          if (heightmap[heightmapIndex] < y) {
            heightmap[heightmapIndex] = y;
          }
        }
      }
    }
  }

  srand(seed);
  if (type == 1) {
    // Rescue gameplay building
    const int grid = 40;
    const int width = 120;
    const int depth = 120;
    const int count = (width / grid) * (depth / grid);
    const int height = floor((world->height - 16) / count) * count;
    const int originX = world->width / 2 - width / 2;
    const int originZ = world->depth / 2 - depth / 2;
    const int step = (height - maxTerrainHeight * 0.7f) / (count - 1);
    for (int i = 0; i < count - 1; i++) {
      queueA[i] = (i + 3) * step;
    }
    for (int i = count - 2; i >= 0; i--) {
      const int random = rand() % i;
      const int temp = queueA[i];
      queueA[i] = queueA[random];
      queueA[random] = temp;
    }
    const int center = (ceil(depth / grid / 2) * (width / grid) + ceil(width / grid / 2));
    queueA[count - 1] = queueA[center];
    queueA[center] = height;
    for (int bz = 0, i = 0; bz < depth; bz += grid) {
      for (int bx = 0; bx < width; bx += grid, i++) {
        const int bHeight = queueA[i];
        const unsigned int color = getColorFromNoise(rand() % 255);
        for (int z = 0; z < grid; z++) {
          for (int y = 0; y < bHeight; y++) {
            for (int x = 0; x < grid; x++) {
              if (
                y > bHeight - 3
                && (
                  (x > 0 && x < grid - 1 && z > 0 && z < grid - 1)
                )
              ) {
                continue;
              }
              const int voxel = getVoxel(world, originX + bx + x, y, originZ + bz + z);
              int type = (
                y > bHeight - 2
                || (
                  (y - 1) % step < 4
                  && ((x + 6) % 8 < 4 || (z + 6) % 8 < 4)
                )
              ) ? TYPE_LIGHT : TYPE_STONE;
              voxels[voxel] = type;
              voxels[voxel + VOXEL_R] = fmin(fmax((int) ((color >> 16) & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
              voxels[voxel + VOXEL_G] = fmin(fmax((int) ((color >> 8) & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
              voxels[voxel + VOXEL_B] = fmin(fmax((int) (color & 0xFF) + (rand() % 0x11) * (type == TYPE_LIGHT ? 2 : -1), 0), 0xFF);
              if (y <= seaLevel) {
                voxels[voxel + VOXEL_R] /= 2;
                voxels[voxel + VOXEL_G] /= 2;
              }
              const int heightmapIndex = (originZ + bz + z) * world->width + (originX + bx + x);
              if (heightmap[heightmapIndex] < y) {
                heightmap[heightmapIndex] = y;
              }
            }
          }
        }
      }
    }
    const int bx = world->width / 2 - 6;
    const int bz = world->depth / 2 - grid / 2;
    generateBillboard(
      world,
      heightmap,
      voxels,
      bx,
      heightmap[bz * world->width + bx] - 1,
      bz,
      rand(),
      12,
      14,
      3
    );
  } else {
    // Default city with inner plaza
    const int grid = 80;
    const int plaza = grid * 2;
    {
      const int street = 6;
      const int floorHeight = 12 + (rand() % 4);
      const int floors = 2;
      const unsigned int tint = rand();
      generateBuilding(
        world,
        heightmap,
        voxels,
        world->width / 2 - grid / 2 + street,
        world->depth / 2 - grid / 2 + street,
        tint,
        grid - street * 2,
        floors * floorHeight + 4,
        floorHeight,
        (1 + (rand() % 2)) * 8
      );
      const int bx = world->width / 2 - 6;
      const int bz = world->depth / 2 - grid / 2 + street + 1;
      generateBillboard(
        world,
        heightmap,
        voxels,
        bx,
        heightmap[bz * world->width + bx] - 1,
        bz,
        tint,
        12,
        14,
        3
      );
    }
    const int from = fmax(world->width / 2 - grid * 2, 0);
    const int to = fmin(world->width / 2 + grid * 2, world->width);
    for (int z = from; z < to; z += grid) {
      for (int x = from; x < to; x += grid) {
        const int dx = x + grid / 2 - centerX;
        const int dz = z + grid / 2 - centerZ;
        const int distance = sqrt(dx * dx + dz * dz);
        if (
          distance < plaza / 2 || distance > plaza
        ) {
          continue;
        }
        const int street = (rand() % 2) * 8 + 6;
        const int floorHeight = 12 + (rand() % 4);
        generateBuilding(
          world,
          heightmap,
          voxels,
          x + street,
          z + street,
          rand(),
          grid - street * 2,
          (floor((rand() % (world->height - floorHeight * 3 - 8)) / floorHeight) + 3) * floorHeight + 4,
          floorHeight,
          (1 + (rand() % 2)) * 8
        );
      }
    }
  }

  {
    const int grid = 32;
    for (int z = 0; z < world->depth; z += grid) {
      for (int x = 0; x < world->width; x += grid) {
        const int lx = x + rand() % grid;
        const int lz = z + rand() % grid;
        const int y = heightmap[lz * world->width + lx];
        const int voxel = getVoxel(world, lx, y, lz);
        if (
          y > seaLevel
          && voxels[voxel] == TYPE_DIRT
          && rand() % 2 == 0
        ) {
          generateLamp(
            world,
            heightmap,
            voxels,
            lx,
            y + 1,
            lz,
            (voxels[voxel + VOXEL_R] << 16) | (voxels[voxel + VOXEL_G] << 8) | voxels[voxel + VOXEL_B]
          );
        }
      }
    }
  }

  {
    const int grid = 16;
    for (int z = 0; z < world->depth; z += grid) {
      for (int x = 0; x < world->width; x += grid) {
        const int tx = x + rand() % grid;
        const int tz = z + rand() % grid;
        const int y = heightmap[tz * world->width + tx];
        if (
          y >= seaLevel / 2
          && voxels[getVoxel(world, tx, y, tz)] == TYPE_DIRT
          && rand() % 2 == 0
        ) {
          const int size = 10 + rand() % 10;
          generateTree(
            world,
            heightmap,
            voxels,
            tx,
            y + 1,
            tz,
            getColorFromNoise(rand() % 0xFF),
            size,
            fmin(size * 0.75f, 8) + rand() % 4,
            queueA,
            queueB
          );
        }
      }
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
  return heightmap[ z * world->width + x];
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

const int mesh(
  const World* world,
  const unsigned char* voxels,
  float* bounds,
  unsigned int* indices,
  unsigned char* vertices,
  const unsigned char chunkSize,
  const int chunkX,
  const int chunkY,
  const int chunkZ
) {
  if (
    chunkX < 0
    || chunkY < 0
    || chunkZ < 0
    || chunkX + chunkSize > world->width
    || chunkY + chunkSize > world->height
    || chunkZ + chunkSize > world->depth
  ) {
    return -1;
  }
  // WELCOME TO THE JUNGLE !!
  unsigned char box[6] = { chunkSize, chunkSize, chunkSize, 0, 0, 0 };
  unsigned int faces = 0;
  for (int z = chunkZ; z < chunkZ + chunkSize; z++) {
    for (int y = chunkY; y < chunkY + chunkSize; y++) {
      for (int x = chunkX; x < chunkX + chunkSize; x++) {
        const int voxel = getVoxel(world, x, y, z);
        if (voxels[voxel] == TYPE_AIR) {
          continue;
        }
        const unsigned char r = voxels[voxel + VOXEL_R],
                            g = voxels[voxel + VOXEL_G],
                            b = voxels[voxel + VOXEL_B];
        const int top = getVoxel(world, x, y + 1, z),
                  bottom = getVoxel(world, x, y - 1, z),
                  south = getVoxel(world, x, y, z + 1),
                  north = getVoxel(world, x, y, z - 1),
                  east = getVoxel(world, x + 1, y, z),
                  west = getVoxel(world, x - 1, y, z);
        if (top != -1 && voxels[top] == TYPE_AIR) {
          const unsigned char light = voxels[top + VOXEL_LIGHT];
          const unsigned char sunlight = voxels[top + VOXEL_SUNLIGHT];
          const int ts = getVoxel(world, x, y + 1, z + 1),
                    tn = getVoxel(world, x, y + 1, z - 1),
                    te = getVoxel(world, x + 1, y + 1, z),
                    tw = getVoxel(world, x - 1, y + 1, z);
          pushFace(
            box,
            &faces,
            indices,
            vertices,
            chunkX, chunkY, chunkZ,
            r, g, b,
            x, y + 1, z + 1,
            getLighting(voxels, light, sunlight, tw, ts, getVoxel(world, x - 1, y + 1, z + 1)),
            x + 1, y + 1, z + 1,
            getLighting(voxels, light, sunlight, te, ts, getVoxel(world, x + 1, y + 1, z + 1)),
            x + 1, y + 1, z,
            getLighting(voxels, light, sunlight, te, tn, getVoxel(world, x + 1, y + 1, z - 1)),
            x, y + 1, z,
            getLighting(voxels, light, sunlight, tw, tn, getVoxel(world, x - 1, y + 1, z - 1))
          );
        }
        if (bottom != -1 && voxels[bottom] == TYPE_AIR) {
          const unsigned char light = voxels[bottom + VOXEL_LIGHT];
          const unsigned char sunlight = voxels[bottom + VOXEL_SUNLIGHT];
          const int bs = getVoxel(world, x, y - 1, z + 1),
                    bn = getVoxel(world, x, y - 1, z - 1),
                    be = getVoxel(world, x + 1, y - 1, z),
                    bw = getVoxel(world, x - 1, y - 1, z);
          pushFace(
            box,
            &faces,
            indices,
            vertices,
            chunkX, chunkY, chunkZ,
            r, g, b,
            x, y, z,
            getLighting(voxels, light, sunlight, bw, bn, getVoxel(world, x - 1, y - 1, z - 1)),
            x + 1, y, z,
            getLighting(voxels, light, sunlight, be, bn, getVoxel(world, x + 1, y - 1, z - 1)),
            x + 1, y, z + 1,
            getLighting(voxels, light, sunlight, be, bs, getVoxel(world, x + 1, y - 1, z + 1)),
            x, y, z + 1,
            getLighting(voxels, light, sunlight, bw, bs, getVoxel(world, x - 1, y - 1, z + 1))
          );
        }
        if (south != -1 && voxels[south] == 0) {
          const unsigned char light = voxels[south + VOXEL_LIGHT];
          const unsigned char sunlight = voxels[south + VOXEL_SUNLIGHT];
          const int st = getVoxel(world, x, y + 1, z + 1),
                    sb = getVoxel(world, x, y - 1, z + 1),
                    se = getVoxel(world, x + 1, y, z + 1),
                    sw = getVoxel(world, x - 1, y, z + 1);
          pushFace(
            box,
            &faces,
            indices,
            vertices,
            chunkX, chunkY, chunkZ,
            r, g, b,
            x, y, z + 1,
            getLighting(voxels, light, sunlight, sw, sb, getVoxel(world, x - 1, y - 1, z + 1)),
            x + 1, y, z + 1,
            getLighting(voxels, light, sunlight, se, sb, getVoxel(world, x + 1, y - 1, z + 1)),
            x + 1, y + 1, z + 1,
            getLighting(voxels, light, sunlight, se, st, getVoxel(world, x + 1, y + 1, z + 1)),
            x, y + 1, z + 1,
            getLighting(voxels, light, sunlight, sw, st, getVoxel(world, x - 1, y + 1, z + 1))
          );
        }
        if (north != -1 && voxels[north] == TYPE_AIR) {
          const unsigned char light = voxels[north + VOXEL_LIGHT];
          const unsigned char sunlight = voxels[north + VOXEL_SUNLIGHT];
          const int nt = getVoxel(world, x, y + 1, z - 1),
                    nb = getVoxel(world, x, y - 1, z - 1),
                    ne = getVoxel(world, x + 1, y, z - 1),
                    nw = getVoxel(world, x - 1, y, z - 1);
          pushFace(
            box,
            &faces,
            indices,
            vertices,
            chunkX, chunkY, chunkZ,
            r, g, b,
            x + 1, y, z,
            getLighting(voxels, light, sunlight, ne, nb, getVoxel(world, x + 1, y - 1, z - 1)),
            x, y, z,
            getLighting(voxels, light, sunlight, nw, nb, getVoxel(world, x - 1, y - 1, z - 1)),
            x, y + 1, z,
            getLighting(voxels, light, sunlight, nw, nt, getVoxel(world, x - 1, y + 1, z - 1)),
            x + 1, y + 1, z,
            getLighting(voxels, light, sunlight, ne, nt, getVoxel(world, x + 1, y + 1, z - 1))
          );
        }
        if (east != -1 && voxels[east] == TYPE_AIR) {
          const unsigned char light = voxels[east + VOXEL_LIGHT];
          const unsigned char sunlight = voxels[east + VOXEL_SUNLIGHT];
          const int et = getVoxel(world, x + 1, y + 1, z),
                    eb = getVoxel(world, x + 1, y - 1, z),
                    es = getVoxel(world, x + 1, y, z + 1),
                    en = getVoxel(world, x + 1, y, z - 1);
          pushFace(
            box,
            &faces,
            indices,
            vertices,
            chunkX, chunkY, chunkZ,
            r, g, b,
            x + 1, y, z + 1,
            getLighting(voxels, light, sunlight, es, eb, getVoxel(world, x + 1, y - 1, z + 1)),
            x + 1, y, z,
            getLighting(voxels, light, sunlight, en, eb, getVoxel(world, x + 1, y - 1, z - 1)),
            x + 1, y + 1, z,
            getLighting(voxels, light, sunlight, en, et, getVoxel(world, x + 1, y + 1, z - 1)),
            x + 1, y + 1, z + 1,
            getLighting(voxels, light, sunlight, es, et, getVoxel(world, x + 1, y + 1, z + 1))
          );
        }
        if (west != -1 && voxels[west] == TYPE_AIR) {
          const unsigned char light = voxels[west + VOXEL_LIGHT];
          const unsigned char sunlight = voxels[west + VOXEL_SUNLIGHT];
          const int wt = getVoxel(world, x - 1, y + 1, z),
                    wb = getVoxel(world, x - 1, y - 1, z),
                    ws = getVoxel(world, x - 1, y, z + 1),
                    wn = getVoxel(world, x - 1, y, z - 1);
          pushFace(
            box,
            &faces,
            indices,
            vertices,
            chunkX, chunkY, chunkZ,
            r, g, b,
            x, y, z,
            getLighting(voxels, light, sunlight, wn, wb, getVoxel(world, x - 1, y - 1, z - 1)),
            x, y, z + 1,
            getLighting(voxels, light, sunlight, ws, wb, getVoxel(world, x - 1, y - 1, z + 1)),
            x, y + 1, z + 1,
            getLighting(voxels, light, sunlight, ws, wt, getVoxel(world, x - 1, y + 1, z + 1)),
            x, y + 1, z,
            getLighting(voxels, light, sunlight, wn, wt, getVoxel(world, x - 1, y + 1, z - 1))
          );
        }
      }
    }
  }

  const float halfWidth = 0.5f * (box[3] - box[0]),
              halfHeight = 0.5f * (box[4] - box[1]),
              halfDepth = 0.5f * (box[5] - box[2]);
  bounds[0] = 0.5f * (box[0] + box[3]);
  bounds[1] = 0.5f * (box[1] + box[4]);
  bounds[2] = 0.5f * (box[2] + box[5]);
  bounds[3] = sqrt(
    halfWidth * halfWidth
    + halfHeight * halfHeight
    + halfDepth * halfDepth
  );

  return faces;
}

// Physics

const int colliders(
  const World* world,
  const unsigned char* voxels,
  unsigned char* colliders,
  unsigned char* map,
  const unsigned char chunkSize,
  const int chunkX,
  const int chunkY,
  const int chunkZ
) {
  if (
    chunkX < 0
    || chunkY < 0
    || chunkZ < 0
    || chunkX + chunkSize > world->width
    || chunkY + chunkSize > world->height
    || chunkZ + chunkSize > world->depth
  ) {
    return -1;
  }
  unsigned char width, height, depth;
  int collider = 0;
  for (unsigned char z = 0; z < chunkSize; z++) {
    for (unsigned char y = 0; y < chunkSize; y++) {
      for (unsigned char x = 0; x < chunkSize; x++) {
        if (
          voxels[getVoxel(world, chunkX + x, chunkY + y, chunkZ + z)] == TYPE_AIR
          || map[z * chunkSize * chunkSize + y * chunkSize + x]
        ) {
          continue;
        }

        for (unsigned char i = z + 1; i <= chunkSize; i++) {
          if (
            i == chunkSize
            || voxels[getVoxel(world, chunkX + x, chunkY + y, chunkZ + i)] == TYPE_AIR
            || map[i * chunkSize * chunkSize + y * chunkSize + x]
          ) {
            depth = i - z;
            break;
          }
        }

        height = chunkSize - y;
        for (unsigned char i = z; i < z + depth; i++) {
          for (unsigned char j = y + 1; j <= y + height; j++) {
            if (
              j == chunkSize
              || voxels[getVoxel(world, chunkX + x, chunkY + j, chunkZ + i)] == TYPE_AIR
              || map[i * chunkSize * chunkSize + j * chunkSize + x]
            ) {
              height = j - y;
            }
          }
        }

        width = chunkSize - x;
        for (unsigned char i = z; i < z + depth; i++) {
          for (unsigned char j = y; j < y + height; j++) {
            for (unsigned char k = x + 1; k <= x + width; k++) {
              if (
                k == chunkSize
                || voxels[getVoxel(world, chunkX + k, chunkY + j, chunkZ + i)] == TYPE_AIR
                || map[i * chunkSize * chunkSize + j * chunkSize + k]
              ) {
                width = k - x;
              }
            }
          }
        }

        for (unsigned char i = z; i < z + depth; i++) {
          for (unsigned char j = y; j < y + height; j++) {
            for (unsigned char k = x; k < x + width; k++) {
              map[i * chunkSize * chunkSize + j * chunkSize + k] = 1;
            }
          }
        }

        colliders[collider] = x;
        colliders[collider + 1] = y;
        colliders[collider + 2] = z;
        colliders[collider + 3] = width;
        colliders[collider + 4] = height;
        colliders[collider + 5] = depth;
        collider += 6;
      }
    }
  }

  return collider / 6;
}

// Pathfinding

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

static const unsigned char canWalk(
  const PathContext* context,
  const int x,
  const int y,
  const int z
) {
  if (y <= seaLevel) {
    return 0;
  }
  const int voxel = getVoxel(context->world, x, y, z);
  if (voxel == -1 || context->voxels[voxel] == TYPE_AIR) {
    return 0;
  }
  for (int h = 1; h <= context->height; h++) {
    const int voxel = getVoxel(context->world, x, y + h, z);
    if (
      voxel == -1
      || context->voxels[voxel] != TYPE_AIR
      || context->obstacles[voxel / VOXELS_STRIDE]
    ) {
      return 0;
    }
  }
  return 1;
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
  const int fromY = fmax(originY - radius, seaLevel + 1);
  const int toY = fmin(fmin(originY, groundHeight) + radius, world->height - 5);
  if (groundHeight <= seaLevel || toY <= fromY) {
    return 0;
  }
  point[1] = fromY + rand() % (toY - fromY);
  const int voxel = getVoxel(world, point[0], point[1], point[2]);
  if (
    voxels[voxel] != TYPE_AIR || obstacles[voxel / VOXELS_STRIDE]
  ) {
    return 0;
  }
  for (int y = point[1] - 1; y > seaLevel; y--) {
    const int type = voxels[getVoxel(world, point[0], y, point[2])];
    if (type == TYPE_AIR || type == TYPE_TREE) {
      continue;
    }
    unsigned char isValid = 1;
    for (int h = 1; h <= height; h++) {
      const int voxel = getVoxel(world, point[0], y + h, point[2]);
      if (
        voxels[voxel] != TYPE_AIR
        || obstacles[voxel / VOXELS_STRIDE]
      ) {
        isValid = 0;
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
