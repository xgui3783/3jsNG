import * as THREE from 'three'
import { EnumMeshType, EnumWorkerEvents, getWorkerAsync } from './util'

class Reactive<T>{
  public prop: T
  private cb: Function[] = []
  get(cb: (arg: { newVal: T, oldVal: T }) => void){
    this.cb.push(cb)
    return this.prop
  }

  set(val: T){
    for (const cb of this.cb) {
      cb({ newVal: val, oldVal: this.prop })
    }
    this.prop = val
  }
  constructor(defaultVal?: T){
    if (defaultVal) this.prop = defaultVal
  }
}

export enum EnumLoadingState {
  READY,
  LOADING,
  SUCCESS,
  ERROR,
}

export const loadState = new Reactive<EnumLoadingState>()
const meshType = new Reactive<EnumMeshType>(EnumMeshType.NG_PRECOMP)

const legacyBtn = document.getElementById('mesh-type-ng-precomp')
const dracoBtn = document.getElementById('mesh-type-draco')

meshType.get(({ newVal }) => {
  legacyBtn.classList.remove('active')
  dracoBtn.classList.remove('active')
  switch (newVal) {
  case EnumMeshType.DRACO: {
    dracoBtn.classList.add('active')
    break
  }
  case EnumMeshType.NG_PRECOMP: {
    legacyBtn.classList.add('active')
    break
  }
  }
})

export function catchError(message: string) {
  console.log(message)
}

export function setupDom(arg: { meshRoot: THREE.Object3D, defaultMaterial: THREE.MeshPhongMaterial}){
  const { defaultMaterial, meshRoot } = arg
  const { postMessage } = getWorkerAsync()

  /**
   * mesh selector
   */
  const meshTypeSelector: HTMLElement = document.getElementById('mesh-type-selector')

  meshTypeSelector.addEventListener('click', ev => {
    const clickedId = (ev.target as HTMLElement).id
    if ( clickedId === 'mesh-type-ng-precomp') {
      meshType.set(EnumMeshType.NG_PRECOMP)
    } else if (clickedId === 'mesh-type-draco') {
      meshType.set(EnumMeshType.DRACO)
    }
  })

  /**
   * load mesh
   */
  async function loadMesh(dropEv?: DragEvent){
    let loadUrl: string
    if (dropEv) {
      const files = dropEv.dataTransfer.files
      if (files.length !== 1) {
        catchError(`Please drop only one file at a time!`)
        return
      }
      const file = dropEv.dataTransfer.files[0]
      loadUrl = await new Promise<string>((rs, rj) => {

        const reader = new FileReader()
        reader.onload = ev => {
          const result = ev.target.result
          const blob = new Blob([ result ], { type: 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          rs(url)
        }
        reader.onerror = rj
        reader.readAsArrayBuffer(file)
      })
    }

    const input = document.getElementById('load-mesh-url')
    /**
     * logical assignment, if loadURL is already defined, do not assign
     */
    if (!loadUrl) loadUrl = input && (input as HTMLInputElement).value
    if (!loadUrl) return catchError(`URL needs to be defined.`)

    let geometry
    if (meshType.prop === EnumMeshType.NG_PRECOMP) {

      const { 
        vertexPositions,
        indices,
        vertexNormals,
        color,
       } = await postMessage({
        method: EnumWorkerEvents.LOAD_BY_URL,
        params: {
          url: loadUrl,
          meshType: meshType.prop
        }
      })
      geometry = new THREE.BufferGeometry()
      geometry.setIndex(new THREE.BufferAttribute(indices, 1))
      geometry.addAttribute('position', new THREE.BufferAttribute(vertexPositions, 3, false))
      geometry.addAttribute('color', new THREE.BufferAttribute(color, 3, true))
      geometry.addAttribute('normal', new THREE.BufferAttribute(vertexNormals, 3, true))

    } else {
      /**
       * draco loader loaded via async script on HTML
       */
      const { DRACOLoader } = THREE as any
      const loader = new DRACOLoader()
      
      DRACOLoader.setDecoderPath('thirdparty/draco/')
      DRACOLoader.getDecoderModule()
      
      try {
        geometry = await new Promise((rs, rj) => {
          loader.load(
            loadUrl,
            function(geometry) {
              geometry.computeVertexNormals()
              rs(geometry)
            },
            function (xhr) {
              // on progress callback
              console.log('xhr progress')
            },
            function (err) {
              rj(err)
              console.error('error', err)
            }
          )
        })
      } catch (e) {
        catchError(e)
      }
    }

    const mesh = new THREE.Mesh(
      geometry,
      defaultMaterial
    )
    meshRoot.add(mesh)
    loadState.set(EnumLoadingState.SUCCESS)

  }

  const loadMeshBtn = document.getElementById('load-mesh')

  /**
   * TODO terrible way to achieve "reactivity"
   * should probably use weakmap to prevent memleak
   */
  loadState.get(({ newVal }) => {
    switch(newVal) {
    case EnumLoadingState.LOADING: {
      loadMeshBtn.textContent = 'Loading ...'
      loadMeshBtn.classList.add('disabled')
      break
    }
    case EnumLoadingState.READY:
    case EnumLoadingState.ERROR: {
      loadMeshBtn.textContent = 'Load'
      loadMeshBtn.classList.remove('disabled')
      break
    }
    case EnumLoadingState.SUCCESS: {
      const overlay = document.querySelector('#overlay') as HTMLElement
      overlay.style.opacity = '0'
      overlay.style.pointerEvents = 'none'
      break
    }
    }
  })

  loadMeshBtn.addEventListener('click', async () => {
    if (loadState.prop === EnumLoadingState.LOADING) {
      return
    }
    loadState.set(EnumLoadingState.LOADING)
    await loadMesh()
    /**
     * TODO, reset DOM?
     */
  })

  /**
   * setup drop zone
   */
  const dropzone = document.getElementById('drop-zone') as HTMLElement
  const dropOverlay = document.getElementById('drop-overlay')
  dropOverlay.addEventListener('dragenter', ev => {
    ev.preventDefault()
    dropzone.classList.add('drop-active')
  })
  dropOverlay.addEventListener('dragleave', ev => {
    ev.preventDefault()
    dropzone.classList.remove('drop-active')
  })
  dropOverlay.addEventListener('dragover', ev => {
    ev.preventDefault()
  })
  dropOverlay.addEventListener('drop', ev => {
    ev.preventDefault()
    dropzone.classList.remove('drop-active')
    loadMesh(ev)
  })
}