static const unsigned char getAO(
  const unsigned char* voxels,
  const int n1,
  const int n2,
  const int n3
) {
  const bool v1 = n1 != -1 && voxels[n1] != TYPE_AIR,
             v2 = n2 != -1 && voxels[n2] != TYPE_AIR,
             v3 = n3 != -1 && voxels[n3] != TYPE_AIR;
  unsigned char ao = 0;
  if (v1) ao += 20;
  if (v2) ao += 20;
  if ((v1 && v2) || v3) ao += 20;
  return ao;
}

static const unsigned int getLighting(
  const unsigned char* voxels,
  const unsigned char light,
  const unsigned char sunlight,
  const int n1,
  const int n2,
  const int n3
) {
  const bool v1 = n1 != -1 && voxels[n1] == TYPE_AIR,
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
        if (south != -1 && voxels[south] == TYPE_AIR) {
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
