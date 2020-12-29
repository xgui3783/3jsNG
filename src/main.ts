import * as THREE from 'three'

import {
  camera,
  renderer,
} from './init'

import {
  setupScene,
  setupGeometry,
  setupMaterial,
  setupControl,
} from './setup'

import { setupDom, loadState, EnumLoadingState } from './dom'

setupControl({
  camera,
  element: renderer.domElement
})

const animateCb = []

const { scene } = setupScene()
const { gridHelperGeometry, testBoxGeometry } = setupGeometry()
const { basicMaterial, phongMaterial } = setupMaterial()

const gridhelper = new THREE.Mesh(
  gridHelperGeometry,
  basicMaterial
)
scene.add(gridhelper)

const testBox = new THREE.Mesh(
  testBoxGeometry,
  phongMaterial
)

scene.add(testBox)
testBox.position.set(0, 0, 0)
camera.lookAt(testBox.position)

animateCb.push(() => {
  const y = testBox.rotation.y
  testBox.rotation.y = y + 0.01
})

const animate = () => {
  for (const cb of animateCb) {
    cb()
  }
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

animate()

/**
 * dom
 */

setupDom({
  defaultMaterial: phongMaterial,
  meshRoot: scene
})

/**
 * on load success, remove test box
 */

loadState.get(({ newVal }) => {
  if (newVal === EnumLoadingState.SUCCESS) {
    scene.remove(testBox)
  }
})