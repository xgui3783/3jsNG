import Worker from "./worker.ts?worker"

export enum EnumWorkerEvents {
  LOAD_BY_URL,
  LOAD_BY_FILE,

  READIED_THREE_MESH,
}

export enum EnumMeshType {
  NG_PRECOMP='NG_PRECOMP',
  DRACO='DRACO',
}


export function getUuid(){
  return crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
}
  
export function getWorkerAsync(){

  const map = new Map<string, { rs: Function, rj: Function }>()
  const w = new Worker() 

  w.onmessage = (ev: MessageEvent) => {
    const { data } = ev
    if (data['json.rpc']) {
      const { id, result, error } = data
      if (!map.has(id)) {
        throw new Error(`workerAsyncWrapper map does not have id ${id}`)
      }
      const { rs, rj } = map.get(id)
      map.delete(id)
      
      if (error) {
        rj(error.message || error)
        return
      }
      rs(result)
    }
  }
  
  return {
    postMessage: (arg: { method: EnumWorkerEvents, params: any }) => {
      const id = getUuid()
      w.postMessage({
        ...arg,
        'json.rpc': '2.0',
        'id': id,
      })
      return new Promise<any>((rs, rj) => {
        map.set(id, { rs, rj })
      })
    }
  }
}