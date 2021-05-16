#define FNL_IMPL
#include "../../vendor/FastNoiseLite.h"

// Warning: This function should only be used at the generation phase and
//          with non-air types. Since it does not propagate the light
//          and always updates the heightmap.
static void setVoxel(
  const World* world,
  unsigned char* voxels,
  int* heightmap,
  const int x,
  const int y,
  const int z,
  const unsigned char type,
  const unsigned int color,
  const unsigned char noise
) {
  const int voxel = getVoxel(world, x, y, z);
  voxels[voxel] = type;
  voxels[voxel + VOXEL_R] = fmin(fmax((int) ((color >> 16) & 0xFF) + (noise ? (rand() % noise) * (type == TYPE_LIGHT ? 2 : -1) : 0), 0), 0xFF);
  voxels[voxel + VOXEL_G] = fmin(fmax((int) ((color >> 8) & 0xFF) + (noise ? (rand() % noise) * (type == TYPE_LIGHT ? 2 : -1) : 0), 0), 0xFF);
  voxels[voxel + VOXEL_B] = fmin(fmax((int) (color & 0xFF) + (noise ? (rand() % noise) * (type == TYPE_LIGHT ? 2 : -1) : 0), 0), 0xFF);
  if (y <= seaLevel) {
    voxels[voxel + VOXEL_R] /= 2;
    voxels[voxel + VOXEL_G] /= 2;
  }
  const int heightmapIndex = z * world->width + x;
  if (heightmap[heightmapIndex] < y) {
    heightmap[heightmapIndex] = y;
  }
}

static const float hue2Rgb(float p, float q, float t) {
	if (t < 0.0f) t += 1.0f;
	if (t > 1.0f) t -= 1.0f;
	if (t < 1.0f / 6.0f) return p + (q - p) * 6.0f * t;
	if (t < 1.0f / 2.0f) return q;
	if (t < 2.0f / 3.0f) return p + (q - p) * 6.0f * (2.0f / 3.0f - t);
	return p;
}

static const unsigned int hsl2Rgb(float h, float s, float l) {
  h = fmod(fmod(h, 1.0f) + 1.0f, 1.0f);
  s = fmin(fmax(s, 0.0f), 1.0f);
  l = fmin(fmax(l, 0.0f), 1.0f);

  float r, g, b;
  if (s == 0) {
    r = g = b = l;
  } else {
    const float q = l < 0.5f ? l * (1.0f + s) : l + s - l * s;
    const float p = 2.0f * l - q;
    r = hue2Rgb(p, q, h + 1.0f / 3.0f);
    g = hue2Rgb(p, q, h);
    b = hue2Rgb(p, q, h - 1.0f / 3.0f);
  }

  return (
    (((unsigned char) round(r * 0xFF) & 0xFF) << 16)
    | (((unsigned char) round(g * 0xFF) & 0xFF) << 8)
    | ((unsigned char) round(b * 0xFF) & 0xFF)
  );
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

static void generateBillboard(
  const World* world,
  unsigned char* voxels,
  int* heightmap,
  const int x,
  const int y,
  const int z,
  const unsigned int color,
  const int width,
  const int height,
  const int depth
) {
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
        setVoxel(
          world, voxels, heightmap,
          x + bx, y + by, z + bz,
          (
            (by == legs || by == height - 1)
            && bz == depth - 1
            && (bx + 1) % 4 >= 2
          ) ? TYPE_LIGHT : TYPE_STONE,
          color,
          0x11
        );
      }
    }
  }
}

static void generateBuilding(
  const World* world,
  unsigned char* voxels,
  int* heightmap,
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
          setVoxel(
            world, voxels, heightmap,
            x + bx, y, z + bz,
            type,
            getColorFromNoise((tint * (f + 1)) % 0xFF),
            0x11
          );
        }
      }
    }
  }
}

static void generateDebugCity(
  const World* world,
  unsigned char* voxels,
  int* heightmap
) {
  const int grid = 80;
  const int plaza = grid * 2;
  {
    const int street = 6;
    const int floorHeight = 12 + (rand() % 4);
    const int floors = 2;
    const unsigned int tint = rand();
    generateBuilding(
      world,
      voxels,
      heightmap,
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
      voxels,
      heightmap,
      bx,
      heightmap[bz * world->width + bx] - 1,
      bz,
      getColorFromNoise(tint % 0xFF),
      12,
      14,
      3
    );
  }
  const int centerX = world->width * 0.5f;
  const int centerZ = world->depth * 0.5f;
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
        voxels,
        heightmap,
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

static void generatePartyBuildings(
  const World* world,
  unsigned char* voxels,
  int* heightmap,
  int* queueA
) {
  const int grid = 40;
  const int width = 120;
  const int depth = 120;
  const int center = (ceil(depth / grid / 2) * (width / grid) + ceil(width / grid / 2));
  const int maxTerrainHeight = world->height / 3.0f;
  int mainBuildingColor;
  {
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
    queueA[count - 1] = queueA[center];
    queueA[center] = height;
    for (int bz = 0, i = 0; bz < depth; bz += grid) {
      for (int bx = 0; bx < width; bx += grid, i++) {
        const int streetX = i == center ? 0 : (1 + (rand() % 2)) * 4;
        const int streetZ = i == center ? 0 : (1 + (rand() % 2)) * 4;
        const int bHeight = queueA[i];
        const unsigned int color = hsl2Rgb((float) rand() / (float) (RAND_MAX), 0.75f, 0.25f + ((float) rand() / (float) (RAND_MAX)) * 0.2f);
        if (i == center) mainBuildingColor = color;
        for (int z = streetZ; z < grid - streetZ; z++) {
          for (int y = 0; y < bHeight; y++) {
            for (int x = streetX; x < grid - streetX; x++) {
              if (
                (
                  // Rooftop
                  y > bHeight - 3
                  && (
                    (x > streetX + 1 && x < grid - streetX - 2 && z > streetZ + 1 && z < grid - streetZ - 2)
                  )
                ) || (
                  // Floors gap
                  y % step == step -2
                  && !(x > streetX && x < grid - streetX - 1 && z > streetZ && z < grid - streetZ - 1)
                ) || (
                  // Main building stage pool
                  i == center
                  && y > bHeight - 7
                  && sqrt(pow((x - (grid / 2) + 0.5f) * 1.5f, 2) + pow((y - bHeight) * 3.0f, 2) + pow((z - (grid / 2) + 0.5f) * 1.5f, 2)) < 22
                )
              ) {
                continue;
              }
              setVoxel(
                world, voxels, heightmap,
                originX + bx + x, y, originZ + bz + z,
                (
                  y > bHeight - 2
                  || (
                    // Windows
                    !(x > streetX && x < grid - streetX - 1 && z > streetZ && z < grid - streetZ - 1)
                    && (y - 1) % step < 4
                    && ((x - streetX + 6) % 8 < 4 || (z - streetZ + 6) % 8 < 4)
                  )
                ) ? TYPE_LIGHT : TYPE_STONE,
                color,
                0x08
              );
            }
          }
        }
      }
    }
  }
  {
    // Stage
    const int width = 16;
    const int height = 6;
    const int depth = 10;
    const int originX = world->width / 2 - width / 2;
    const int originY = queueA[center] - 5;
    const int originZ = world->depth / 2 - grid / 2 + 2;
    for (int z = 0; z < depth; z++) {
      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          if (
            y > 2
            && x > 0
            && x < width - 1
            && z > 0
            && (
              z < depth - 2
              || (z == depth - 2 && (x < width / 2 - 3 || x > width / 2 + 2))
            )
          ) {
            continue;
          }
          setVoxel(
            world, voxels, heightmap,
            originX + x, originY + y, originZ + z,
            y == height - 2 ? TYPE_LIGHT : TYPE_STONE,
            mainBuildingColor,
            0x08
          );
        }
      }
    }
  }
  const unsigned int speakersColor = hsl2Rgb((float) rand() / (float) (RAND_MAX), 0.75f, 0.25f + ((float) rand() / (float) (RAND_MAX)) * 0.2f);
  for (int i = 0; i < 4; i += 1) {
    // Speakers
    const int width = 8;
    const int height = 9;
    const int depth = 8;
    const int originX = world->width / 2 + (i < 2 ? -18 : 18 - width);
    const int originY = queueA[center] - 2 + (i % 2 == 1 ? height : 0);
    const int originZ = world->depth / 2 - grid / 2 + 2;
    for (int z = 0; z < depth; z++) {
      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          if (
            (
              z == depth - 1
              && x > 0 && x < width - 1
              && y > 0 && y < height - 2
            ) || (
              z == depth - 2
              && x > 1 && x < width - 2
              && y > 1 && y < height - 3
            )
          ) {
            continue;
          }
          setVoxel(
            world, voxels, heightmap,
            originX + x, originY + y, originZ + z,
            (
              (
                y == height - 1
                && (x == 0 || x == width - 1 || z == 0 || z == depth - 1)
              ) || (
                z == depth - 3
                && x > 2 && x < width - 3
                && y > 2 && y < height - 4
              )
            ) ? TYPE_LIGHT : TYPE_STONE,
            speakersColor,
            0x08
          );
        }
      }
    }
  }
  const int bx = world->width / 2 - 6;
  const int bz = world->depth / 2 - grid / 2 + 1;
  generateBillboard(
    world,
    voxels,
    heightmap,
    bx,
    heightmap[bz * world->width + bx] - 1,
    bz,
    hsl2Rgb((float) rand() / (float) (RAND_MAX), 0.75f, 0.25f + ((float) rand() / (float) (RAND_MAX)) * 0.2f),
    12,
    14,
    3
  );
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
  unsigned char* voxels,
  int* heightmap,
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
    const bool isTrunk = distance <= trunk;
    if (isTrunk) {
      for (int j = -1; j <= 1; j++) {
        for (int k = -1; k <= 1; k++) {
          const int n = getVoxel(world, x + j, y, z + k);
          voxels[n] = TYPE_TREE;
          voxels[n + VOXEL_R] = fmax((int) ((color >> 16) & 0xFF) / 2 - (rand() % 0x11), 0);
          voxels[n + VOXEL_G] = fmax((int) ((color >> 8) & 0xFF) / 2 - (rand() % 0x11), 0);
          voxels[n + VOXEL_B] = fmax((int) (color & 0xFF) / 2 - (rand() % 0x11), 0);
          const int heightmapIndex = (z + k) * world->width + (x + j);
          if (heightmap[heightmapIndex] < y) {
            heightmap[heightmapIndex] = y;
          }
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
      const int heightmapIndex = z * world->width + x;
      if (heightmap[heightmapIndex] < y) {
        heightmap[heightmapIndex] = y;
      }
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
      voxels,
      heightmap,
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
  unsigned char* voxels,
  int* heightmap,
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
    voxels,
    heightmap,
    color,
    size,
    size + floor(radius * 0.75f),
    size + radius,
    queueA,
    2,
    queueB
  );
}

static void generateTerrain(
  const World* world,
  unsigned char* voxels,
  int* heightmap,
  const int maxHeight,
  const int seed
) {
  fnl_state noise = fnlCreateState();
  noise.seed = seed;
  noise.fractal_type = FNL_FRACTAL_FBM;
  const int centerX = world->width * 0.5f;
  const int centerZ = world->depth * 0.5f;
  const int radius = sqrt(centerX * centerX + centerZ * centerZ) * 0.65f;
  for (int z = 0; z < world->depth; z++) {
    for (int y = 0; y < maxHeight; y++) {
      for (int x = 0; x < world->width; x++) {
        const int dx = x - centerX;
        const int dz = z - centerZ;
        const int distance = sqrt(dx * dx + dz * dz);
        if (distance > radius) {
          continue;
        }
        const float n = fabs(fnlGetNoise3D(&noise, (float) x * 0.5f, (float) y, (float) z * 0.5f));
        if (y == 0 || y < n * maxHeight) {
          setVoxel(
            world, voxels, heightmap,
            x, y, z,
            TYPE_DIRT,
            getColorFromNoise(0xFF * n),
            0
          );
        }
      }
    }
  }
}

static void generateTerrainLamps(
  const World* world,
  unsigned char* voxels,
  int* heightmap
) {
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
        const unsigned int color = (
          (voxels[voxel + VOXEL_R] << 16)
          | (voxels[voxel + VOXEL_G] << 8)
          | voxels[voxel + VOXEL_B]
        );
        for (int i = 1; i < 3; i++) {
          setVoxel(
            world, voxels, heightmap,
            lx, y + i, lz,
            i == 2 ? TYPE_LIGHT : TYPE_STONE,
            color,
            0x11
          );
        }
      }
    }
  }
}

void generate(
  const World* world,
  int* heightmap,
  unsigned char* voxels,
  int* queueA,
  int* queueB,
  const int seed,
  const unsigned char type
) {
  srand(seed);

  generateTerrain(
    world,
    voxels,
    heightmap,
    world->height / (type == 2 ? 3.5f : 2.5f),
    seed
  );

  switch (type) {
    case 1:
      generateDebugCity(
        world,
        voxels,
        heightmap
      );
      break;
    case 2:
      generatePartyBuildings(
        world,
        voxels,
        heightmap,
        queueA
      );
      break;
  }

  generateTerrainLamps(
    world,
    voxels,
    heightmap
  );

  {
    // Trees
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
            voxels,
            heightmap,
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
