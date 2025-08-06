import * as THREE from "three";
import { EnumMeshType, EnumWorkerEvents } from "./util";
import { DRACOLoader } from "../thirdparty/DRACOLoader.js";

const loader = new DRACOLoader();
loader.setDecoderPath("/thirdparty/draco/");
loader.preload();

async function handleWorkerEvent(
  arg: { method: any; params: any },
): Promise<{ result: any; transfers: ArrayBuffer[] } | undefined> {
  const { method, params } = arg;
  switch (method) {
    case EnumWorkerEvents.LOAD_BY_URL: {
      const { url, meshType } = params;
      if (!url) throw new Error(`load by url, url missing in params`);
      if (!meshType) throw new Error(`meshType needs to be defined`);
      if ((meshType as EnumMeshType) === EnumMeshType.NG_PRECOMP) {
        const { arraybuffer, meshInfo } = await loadLegacyPrecomputedMeshByUrl(
          url,
        );
        return {
          result: meshInfo,
          transfers: [arraybuffer],
        };
      }

      if ((meshType as EnumMeshType) === EnumMeshType.DRACO) {
        throw new Error(`draco decoding should be done in browser`);
      }
    }
    case EnumWorkerEvents.LOAD_NG_MULTIRES_MESH:
      const { jsonUrl, indexUrl, dataUrl } = params
      return {
        result: await loadMultiresolutionPrecomputedMeshByUrl(jsonUrl, indexUrl, dataUrl),
        transfers: []
      }
      break;
    case EnumWorkerEvents.LOAD_BY_FILE: {
      break;
    }
    default:
      throw new Error(`method ${method} not yet implemented`);
  }
}

function respondMessage(
  arg: { id: string; result?: any; error: { code: number; message: string } },
  transfer?: any[],
) {
  postMessage({
    "json.rpc": "2.0",
    ...arg,
    //@ts-ignore
  }, transfer);
}

onmessage = async function (event) {
  const { data } = event;
  if (data["json.rpc"]) {
    const { id, params, method } = data as {
      method: any;
      id: string;
      params: any;
    };
    if (!(method in EnumWorkerEvents)) {
      respondMessage({
        id,
        error: {
          code: 400,
          message: `method: ${method} not yet implemented`,
        },
      });
      return;
    }

    try {
      const { result, transfers } = await handleWorkerEvent({
        params,
        method,
      });
      respondMessage({
        id,
        error: null,
        result,
      }, transfers);
    } catch (error) {
      respondMessage({
        id,
        error: {
          code: 400,
          message: error.toString(),
        },
      });
    }
  }
};

/**
 * draco mesh
 */
async function loadDracoMeshByUrl(url) {
}

/**
 * legacy neuroglancer precomputed meshes
 */

async function loadLegacyPrecomputedMeshByUrl(url: string) {
  const resp = await fetch(url);
  const arraybuffer = await resp.arrayBuffer();
  let dv = new DataView(arraybuffer);
  let numVertices = dv.getUint32(0, true);
  const vertexOffset = 4;
  const rgb = [255, 255, 255];
  return {
    arraybuffer,
    meshInfo: decodeTriangles(vertexOffset, arraybuffer, numVertices, rgb),
  };
}
const decodeTriangles = (
  vertexOffset: number = 4,
  arrayBuffer: ArrayBuffer,
  numVertices: number,
  rgb: number[],
) => {
  let vertexPositions = new Float32Array(
    arrayBuffer,
    vertexOffset,
    numVertices * 3,
  );

  let indexByteOffset = vertexOffset + 12 * numVertices;

  let indices = new Uint32Array(arrayBuffer, indexByteOffset);

  const vertexNormals = new Float32Array(vertexPositions.length);
  const numIndices = indices.length;
  let faceNormal = new THREE.Vector3();
  let v1v0 = new THREE.Vector3();
  let v2v1 = new THREE.Vector3();

  for (let i = 0; i < numIndices; i += 3) {
    let i0 = indices[i] * 3,
      i1 = indices[i + 1] * 3,
      i2 = indices[i + 2] * 3;
    for (let j = 0; j < 3; ++j) {
      v1v0[j] = vertexPositions[i1 + j] - vertexPositions[i0 + j];
      v2v1[j] = vertexPositions[i2 + j] - vertexPositions[i1 + j];
    }
    faceNormal.crossVectors(v1v0, v2v1);
    faceNormal.normalize();

    for (let k = 0; k < 3; ++k) {
      let index = indices[i + k];
      let offset = index * 3;
      for (let j = 0; j < 3; ++j) {
        vertexNormals[offset + j] += faceNormal[j];
      }
    }
  }

  const color = new Float32Array(
    vertexPositions.map((v, i) => (rgb[i % 3] / 255)),
  );

  return { vertexPositions, indices, numVertices, vertexNormals, color };
};

/**
 * multiresolution neuroglancer precomputed meshes
 *
 * assumes that there are the following files located at 'url':
 * - {url}/info.json  (the json metadata file)
 * - {url}/0.index    (the index file for the 0-th segment)
 * - {url}/0          (the data file for the 0-th segment)
 */
async function loadMultiresolutionPrecomputedMeshByUrl(
  jsonUrl: string,
  indexUrl: string,
  dataUrl: string,
): Promise<THREE.Geometry[][]> {
  let resp, arrayBuffer;
  // reading info.json
  resp = await fetch(jsonUrl);
  const info = await resp.json();

  // reading the index file
  resp = await fetch(indexUrl);
  arrayBuffer = await resp.arrayBuffer();
  const dv = new DataView(arrayBuffer);
  const index: { [key: string]: any } = {};
  let offsetCounter = 0;
  const offset = () => {
    const res = offsetCounter;
    offsetCounter += 4;
    return res;
  };
  index.chunk_shape = [
    dv.getFloat32(offset(), true),
    dv.getFloat32(offset(), true),
    dv.getFloat32(offset(), true),
  ];
  index.grid_origin = [
    dv.getFloat32(offset(), true),
    dv.getFloat32(offset(), true),
    dv.getFloat32(offset(), true),
  ];
  index.num_lods = dv.getUint32(offset(), true);
  index.lod_scales = [];
  for (let i = 0; i < index.num_lods; i++) {
    index.lod_scales.push(dv.getFloat32(offset(), true));
  }
  index.vertex_offsets = [];
  for (let i = 0; i < index.num_lods; i++) {
    index.vertex_offsets.push([
      dv.getFloat32(offset(), true),
      dv.getFloat32(offset(), true),
      dv.getFloat32(offset(), true),
    ]);
  }
  index.num_fragments_per_lod = [];
  for (let i = 0; i < index.num_lods; i++) {
    index.num_fragments_per_lod.push(dv.getUint32(offset(), true));
  }
  index.fragment_positions = [];
  index.fragment_offsets = [];
  for (let lod = 0; lod < index.num_lods; lod++) {
    index.fragment_positions.push([]);
    index.fragment_offsets.push([]);
    for (let i = 0; i < index.num_fragments_per_lod[lod]; i++) {
      index.fragment_positions.push([
        dv.getFloat32(offset(), true),
        dv.getFloat32(offset(), true),
        dv.getFloat32(offset(), true),
      ]);
    }
    for (let i = 0; i < index.num_fragments_per_lod[lod]; i++) {
      index.fragment_positions.push(dv.getUint32(offset(), true));
    }
  }
  // assert(offset() === dv.length, "index file not read completely *~*");

  // TODO: reading the data file
  resp = await fetch(dataUrl);
  arrayBuffer = await resp.arrayBuffer();
  const chunks: THREE.Geometry[][] = [];
  let _offset = 0;
  for (let i = 0; i < index.num_lods; i++) {
    chunks.push([]);
    for (let j = 0; j < index.num_fragments_per_lod[i]; i++) {
      const buffer = arrayBuffer.slice(
        _offset,
        _offset + index.fragment_offsets[i][j],
      );
      loader.loadBytes(buffer, (geom: THREE.Geometry) => {
        chunks[i].push(geom);
        console.log("data file loaded successfully");
      }, () => {
        console.log("data file couldn't be loaded");
      });
      _offset += index.fragment_offsets[i][j];
    }
  }
}
