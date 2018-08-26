import * as THREE from 'three'

onmessage = function (event) {
  const url = event.data
  if(url && typeof url === 'string'){
    fetch(url)
      .then(res => res.arrayBuffer())
      .then(res => handleFetchedMesh(res, url))
      .then(data => {
        const msg = {}
        msg['vertexPositions'] = data.meshInfo.vertexPositions
        msg['indices'] = data.meshInfo.indices
        msg['vertexNormals'] = data.meshInfo.vertexNormals
        msg['color'] = data.meshInfo.color
        //@ts-ignore
        postMessage(msg, [data.arraybuffer])
      })
      .catch((e)=>console.log('fetch failed', e))
  }
}

const jubrainMap = new Map([[128,{"rgb":[85,107,47]}],[129,{"rgb":[148,0,211]}],[133,{"rgb":[238,232,170]}],[206,{"rgb":[239,134,0]}],[113,{"rgb":[144,238,144]}],[112,{"rgb":[238,238,14]}],[111,{"rgb":[144,238,144]}],[109,{"rgb":[144,238,144]}],[110,{"rgb":[5,198,198]}],[108,{"rgb":[42,60,252]}],[73,{"rgb":[255,200,100]}],[74,{"rgb":[255,200,100]}],[75,{"rgb":[255,200,100]}],[72,{"rgb":[255,200,100]}],[125,{"rgb":[0,255,127]}],[252,{"rgb":[19,255,80]}],[126,{"rgb":[19,255,120]}],[127,{"rgb":[17,250,140]}],[136,{"rgb":[218,112,214]}],[130,{"rgb":[255,165,0]}],[131,{"rgb":[255,69,0]}],[134,{"rgb":[175,238,238]}],[135,{"rgb":[175,238,238]}],[208,{"rgb":[0,0,153]}],[132,{"rgb":[152,251,152]}],[27,{"rgb":[0,146,63]}],[33,{"rgb":[132,194,37]}],[30,{"rgb":[117,197,240]}],[31,{"rgb":[231,120,23]}],[107,{"rgb":[0,100,209]}],[106,{"rgb":[0,209,56]}],[239,{"rgb":[0,50,150]}],[238,{"rgb":[0,147,209]}],[2,{"rgb":[255,10,10]}],[1,{"rgb":[255,255,0]}],[212,{"rgb":[0,147,209]}],[211,{"rgb":[0,209,56]}],[124,{"rgb":[36,157,120]}],[123,{"rgb":[139,71,137]}],[3,{"rgb":[34,200,240]}],[4,{"rgb":[54,255,240]}],[5,{"rgb":[34,200,100]}],[39,{"rgb":[205,0,0]}],[184,{"rgb":[205,0,0]}],[183,{"rgb":[205,0,0]}],[46,{"rgb":[205,0,0]}],[66,{"rgb":[255,0,51]}],[58,{"rgb":[255,153,0]}],[59,{"rgb":[204,255,102]}],[61,{"rgb":[255,204,204]}],[60,{"rgb":[153,153,255]}],[68,{"rgb":[255,255,51]}],[192,{"rgb":[0,255,0]}],[116,{"rgb":[210,180,140]}],[115,{"rgb":[216,191,216]}],[114,{"rgb":[216,150,240]}],[8,{"rgb":[250,30,250]}],[7,{"rgb":[155,100,250]}],[120,{"rgb":[255,218,185]}],[119,{"rgb":[255,239,213]}],[10,{"rgb":[176,224,230]}],[9,{"rgb":[221,160,221]}],[118,{"rgb":[205,133,63]}],[117,{"rgb":[255,192,203]}],[6,{"rgb":[0,0,255]}],[18,{"rgb":[102,0,102]}],[290,{"rgb":[51,0,102]}],[187,{"rgb":[204,51,0]}],[185,{"rgb":[153,204,0]}],[286,{"rgb":[250,128,114]}],[142,{"rgb":[42,60,252]}],[240,{"rgb":[176,196,222]}],[241,{}],[219,{"rgb":[255,20,147]}],[251,{"rgb":[17,250,140]}]])

/* coord is a tuple of 3 */

const handleFetchedMesh = (arraybuffer : ArrayBuffer, url) => {
  let dv = new DataView(arraybuffer)
  let numVertices = dv.getUint32(0, true)
  const vertexOffset = 4
  let rgb
  try{
    const match = /\-[0-9].*?$/.exec(url)
    rgb = jubrainMap.get(Number(match[0].replace('-',''))).rgb
  }catch(e){
    rgb = [255,255,255]
  }
  return {
    arraybuffer,
    meshInfo: decodeTriangles(vertexOffset, arraybuffer, numVertices, rgb),
  }
}

// const groupBy = (array: any, num: number) => array.length === 0
//   ? []
//   : array.reduce((acc, curr, index) => index % num === 0
//     ? acc.concat([[curr]])
//     : acc.slice(0, acc.length -1 ).concat([ acc[acc.length -1].concat(curr) ]), [])


const decodeTriangles = (vertexOffset: number = 4, arrayBuffer : ArrayBuffer, numVertices: number, rgb : [number, number, number]) => {

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