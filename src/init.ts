import * as THREE from 'three'
(<any> window).THREE = THREE
import 'three/examples/js/controls/TrackballControls'
import 'three/examples/js/controls/OrbitControls'

const canvas: HTMLCanvasElement = document.querySelector('canvas#canvas')
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
  canvas
})

const camera = new THREE.PerspectiveCamera(70, canvas.clientWidth/ canvas.clientHeight, 1, 5e10)
camera.position.set(-1e6,-1e6,-1e6)
camera.lookAt(0, 0, 0)

function resizehandle(){
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = (window.innerWidth / window.innerHeight)
  camera.updateProjectionMatrix()
}

window.addEventListener('resize', resizehandle, {
  passive: true,
  capture: false
})
resizehandle()

export {
  camera,
  canvas,
  renderer
}