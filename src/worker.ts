import * as THREE from 'three'
import { EnumWorkerEvents, EnumMeshType } from './util'

async function handleWorkerEvent(arg: { method: any, params: any }): Promise<{ result: any, transfers: ArrayBuffer[] }> {
  const { method, params } = arg
  switch (method) {
  case EnumWorkerEvents.LOAD_BY_URL: {
    const { url, meshType } = params
    if (!url) throw new Error(`load by url, url missing in params`)
    if (!meshType) throw new Error(`meshType needs to be defined`)
    if ((meshType as EnumMeshType) === EnumMeshType.NG_PRECOMP) {
      const { arraybuffer, meshInfo } = await loadLegacyPrecomputedMeshByUrl(url)
      return {
        result: meshInfo,
        transfers: [arraybuffer]
      }
    }
    
    if ((meshType as EnumMeshType) === EnumMeshType.DRACO) {
      throw new Error(`draco decoding should be done in browser`)
    }
  }
  case EnumWorkerEvents.LOAD_BY_FILE: {

    break
  }
  default:
    throw new Error(`method ${method} not yet implemented`)
  }
}

function respondMessage(arg: {id: string, result?: any, error: {code: number, message: string}}, transfer?: any[]) {
  
  postMessage({
    'json.rpc': '2.0',
    ...arg
  //@ts-ignore
  }, transfer)
}

onmessage = async function(event) {
  const { data } = event
  if (data['json.rpc']) {
    const { id, params, method } = data as { method: any, id: string, params: any }
    if (!(method in EnumWorkerEvents)) {
      respondMessage({
        id,
        error: {
          code: 400,
          message: `method: ${method} not yet implemented`
        }
      })
      return
    }

    try {
      const { result, transfers } = await handleWorkerEvent({ params, method })
      respondMessage({
        id,
        error: null,
        result
      }, transfers)
    } catch (e) {
      respondMessage({
        id,
        error: {
          code: 400,
          message: e.toString()
        }
      })
    }
  }
}

/**
 * draco mesh
 */
async function loadDracoMeshByUrl(url) {
  
}


/**
 * legacy neuroglancer precomputed meshes
 */

async function loadLegacyPrecomputedMeshByUrl(url) {
  const resp = await fetch(url)
  const arraybuffer = await resp.arrayBuffer()
  let dv = new DataView(arraybuffer)
  let numVertices = dv.getUint32(0, true)
  const vertexOffset = 4
  const rgb = [255, 255, 255]
  return {
    arraybuffer,
    meshInfo: decodeTriangles(vertexOffset, arraybuffer, numVertices, rgb),
  }
}
const decodeTriangles = (vertexOffset: number = 4, arrayBuffer : ArrayBuffer, numVertices: number, rgb : number[]) => {

  let vertexPositions = new Float32Array(arrayBuffer, vertexOffset, numVertices * 3)

  let indexByteOffset = vertexOffset + 12 * numVertices

  let indices = new Uint32Array(arrayBuffer, indexByteOffset)

  const vertexNormals = new Float32Array(vertexPositions.length)
  const numIndices = indices.length
  let faceNormal = new THREE.Vector3()
  let v1v0 = new THREE.Vector3()
  let v2v1 = new THREE.Vector3()

  for (let i = 0; i< numIndices; i += 3){
    let i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3
    for(let j = 0; j < 3; j += 1){
      const _idx = j === 0
        ? 'x'
        : j === 1
          ? 'y'
          : 'z'
      v1v0[_idx] = vertexPositions[i1 + j] - vertexPositions[i0 + j];
      v2v1[_idx] = vertexPositions[i2 + j] - vertexPositions[i1 + j];
    }
    faceNormal.crossVectors( v1v0,v2v1)
    faceNormal.normalize()

    for (let k = 0; k < 3; ++k) {
      let index = indices[i + k];
      let offset = index * 3;
      for (let j = 0; j < 3; ++j) {
        const _idx = j === 0
        ? 'x'
        : j === 1
          ? 'y'
          : 'z'
        vertexNormals[offset + j] += faceNormal[_idx]
      }
    }
  }
  
  const color = new Float32Array( vertexPositions.map((v, i) => (rgb[i%3] / 255)) )

  return {vertexPositions, indices, numVertices, vertexNormals, color}
}