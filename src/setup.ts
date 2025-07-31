import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

/**
 * setup scene, lights, etc
 */
export function setupScene(){
  const scene = new THREE.Scene()
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.2)

  scene.add(ambientLight)
  
  scene.add(directionalLight1)
  directionalLight1.position.set(-1, -1, -1)
  directionalLight1.lookAt(0, 0, 0)

  scene.add(directionalLight2)
  directionalLight2.position.set(1, 1, 1)
  directionalLight2.lookAt(0, 0, 0)

  scene.add(directionalLight3)
  directionalLight3.position.set(1, 0.5, 0.5)
  directionalLight3.lookAt(0, 0, 0)

  return {
    scene,
    ambientLight,
    directionalLight1,
    directionalLight2
  }
}

export function setupMaterial(){
  const basicMaterial = new THREE.MeshBasicMaterial({
    color: 0x333333,
    wireframe: true
  })

  const phongMaterial = new THREE.MeshPhongMaterial({
    color: 0xaaaaaa,
    specular: 0xffffff,
    shininess: 1.1,
    side: THREE.DoubleSide,
    vertexColors: THREE.VertexColors
  })
  
  return {
    basicMaterial,
    phongMaterial
  }
}

export function setupGeometry(){
  const gridHelperGeometry = new THREE.BoxBufferGeometry( 1e10, 1e10, 1e10, 4, 4, 4 )
  const testBoxGeometry = new THREE.BoxGeometry(5e5, 5e5, 5e5)
  return {
    gridHelperGeometry,
    testBoxGeometry,
  }
}

export function setupControl({ camera, element }){
  /**
   * only orbital control for now
   */
  const control = new OrbitControls(camera, element)

  /**
   * as the camera is at origin, controls seems to be inverted.
   * set rotate speed to be -ve to invert controls
   */
  control.rotateSpeed = 0.5
  
  return {
    control
  }
}