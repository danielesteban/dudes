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
