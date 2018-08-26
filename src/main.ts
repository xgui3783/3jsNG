import * as THREE from 'three'
(<any> window).THREE = THREE
import 'three/examples/js/controls/TrackballControls'
import 'three/examples/js/controls/DeviceOrientationControls'

let vrDisplay, nonvrControl, vrControl, effect

const canvas : HTMLCanvasElement = document.querySelector('canvas')

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer:true,
  canvas : canvas
})

renderer.setPixelRatio(window.devicePixelRatio)

const camera = new THREE.PerspectiveCamera( 70, canvas.clientWidth / canvas.clientHeight, 0.01, 5e10)
const cameraContainer = new THREE.Object3D()
// cameraContainer.add(camera)
camera.position.set(0,0,0)

const scene = new THREE.Scene()
const lookAtcontainer = new THREE.Object3D()
const center = new THREE.Object3D()
const meshContainer = new THREE.Object3D()

const helperGeometry = new THREE.BoxBufferGeometry( 1e10, 1e10, 1e10, 4, 4, 4 )
const helperMaterial = new THREE.MeshBasicMaterial( { color: 0x333333, wireframe: true } )
const helper = new THREE.Mesh( helperGeometry, helperMaterial )
helper.position.set(1.3e8,1.3e8,0)
scene.add( helper )

meshContainer.position.set(-7.55e7, -1.115e8, -6.75e7)
center.add(meshContainer)
lookAtcontainer.add(center)
scene.add(lookAtcontainer)

center.position.set(0,0,2.3e8)
lookAtcontainer.rotateZ(Math.PI)
lookAtcontainer.rotateY(Math.PI/2)

const directionalLight2 = new THREE.DirectionalLight(0xffffff,0.2)
scene.add(directionalLight2)
directionalLight2.position.set(0,0,0)
directionalLight2.lookAt(scene.position)

const directionalLight = new THREE.DirectionalLight(0xffffff,0.6)
scene.add(directionalLight)
directionalLight.position.set(1,1,0)
directionalLight.lookAt(scene.position)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

document.body.appendChild(renderer.domElement)
renderer.render(scene,camera)

const jubrainRegionIndices = [ 65535, 128, 129, 133, 206, 113, 112, 111, 109, 110, 108, 73, 74, 75, 72, 125, 252, 126, 127, 136, 130, 131, 134, 135, 208, 132, 27, 33, 30, 31, 107, 106, 239, 238, 2, 1, 212, 211, 124, 123, 3, 4, 5, 39, 184, 183, 46, 66, 58, 59, 61, 60, 68, 192, 116, 115, 114, 8, 7, 120, 119, 10, 9, 118, 117, 6, 18, 290, 187, 185, 286, 142, 240, 241, 219, 251]
const jubrainRoot = `https://neuroglancer.humanbrainproject.org/precomputed/JuBrain/v2.2c/MPM/mesh/`

const phongMaterial = new THREE.MeshPhongMaterial({
  color: 0xaaaaaa, specular: 0xffffff, shininess: 1.1,
  side: THREE.DoubleSide, vertexColors: THREE.VertexColors
})

const lamertMaterial = new THREE.MeshLambertMaterial({
  vertexColors : THREE.VertexColors
})
const meshBasicMaterial = new THREE.MeshBasicMaterial({
  color: 0xaaaaaa,
  vertexColors: THREE.VertexColors
})

function handleWebworkerResponse (ev: MessageEvent) {
  const { vertexPositions, indices, color,vertexNormals } = ev.data
  const geometry = new THREE.BufferGeometry()
  
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.addAttribute('position', new THREE.BufferAttribute(vertexPositions, 3, false))
  geometry.addAttribute('color', new THREE.BufferAttribute(color, 3, true))
  geometry.addAttribute('normal', new THREE.BufferAttribute(vertexNormals, 3, true))
  
  const meshBrain = new THREE.Mesh(geometry, phongMaterial)
  
  meshContainer.add(meshBrain)
}

const w = new Worker(`webworker.js`)

Promise.all(jubrainRegionIndices
  .map(val => fetch(`${jubrainRoot}${val}:0`)
    .then(res => res.json())
    .then(json => json.fragments)))
  .then(arrOfArr => arrOfArr
    .reduce((acc, curr) => acc.concat(curr),[])
    .map(item => {
      w.postMessage(`${jubrainRoot}${item}`)
      w.onmessage = handleWebworkerResponse
    })
  )

const animation = () => {
  if(nonvrControl){
    nonvrControl.update()
  }
  if(vrControl){
    vrControl.update()
  }

  if(effect){
    effect.render(scene,camera)
  }else{
    renderer.render(scene,camera)
  }
  
  if(vrDisplay){
    vrDisplay.requestAnimationFrame(animation)
  }else{
    requestAnimationFrame(animation)
  }
}

// const getVrPromise = new Promise((resolve,reject) => {
//   if('getVRDisplays' in navigator){
//     navigator.getVRDisplays()
//       .then(displays => {
//         if(displays.length > 0){
//           resolve(displays[0])
//         }else{
//           reject('navigator.getVRDisplay resolved properly, but failed to find any VR displays')
//         }
//       })
//       .catch(reject)
//   }else{
//     reject('your device does not support getVRDisplays')
//   }
// })

function VRFrameData () {
  this.leftViewMatrix = new Float32Array(16);
  this.rightViewMatrix = new Float32Array(16);
  this.leftProjectionMatrix = new Float32Array(16);
  this.rightProjectionMatrix = new Float32Array(16);
  this.pose = null;
};

(<any> window).VRFrameData = VRFrameData

const getVrPromise = new Promise((resolve,reject) => {
  // resolve(new CardboardVRDisplay({}))
  reject()
})

getVrPromise
  .then(display => {
    console.log('getVrPromise successful')
    vrDisplay = display
    //@ts-ignore
    vrControl = new THREE.DeviceOrientationControls(camera)
    // vrControl = new THREE.VRControls(camera)
    // effect = new THREE.VREffect(renderer)
    effect.setSize(window.innerWidth, window.innerHeight)
    vrDisplay.requestAnimationFrame(animation)
  })
  .catch(e => {
    console.log('getVrPromise failed.', e)
    //@ts-ignore
    nonvrControl = new THREE.DeviceOrientationControls(camera)
    requestAnimationFrame(animation)
  })

/* firebase */
declare var firebase: any;
// Initialize Firebase
const config = {
  apiKey: "AIzaSyBq4fJdgbys419up-pHaXecXv5PWNCeWKc",
  authDomain: "websocket-40105.firebaseapp.com",
  databaseURL: "https://websocket-40105.firebaseio.com",
  projectId: "websocket-40105",
  storageBucket: "websocket-40105.appspot.com",
  messagingSenderId: "643659482319"
};
firebase.initializeApp(config);

// const correctionQuaternion = new THREE.Quaternion(0,0.7,0,0.7)
// const correctionQuaternion = new THREE.Quaternion(1,0,-1,0)
const correctionQuaternion = new THREE.Quaternion(0,0,0,1)
correctionQuaternion.normalize()

const database = firebase.database()
const ref = database.ref('perspectiveState');
(window as any).center = center;
(window as any).camera = camera;
ref.on('value', (snapshot) => {
  // console.log('value update', snapshot.val(), correctionQuaternion)
  // center.setRotationFromQuaternion(correctionQuaternion.clone().multiply(new THREE.Quaternion(...snapshot.val())))
  const vals = snapshot.val()

  // center.setRotationFromQuaternion(new THREE.Quaternion(vals[1],vals[2],vals[3],vals[0]))

  center.setRotationFromQuaternion(
    // new THREE.Quaternion(vals[1],vals[2],vals[3],vals[0])
    // correctionQuaternion.clone().multiply( new THREE.Quaternion(vals[1],vals[2],vals[3],vals[0]) )
    (new THREE.Quaternion(vals[0],vals[1],vals[2],vals[3])).inverse().multiply(correctionQuaternion)
  )
    
  // center.applyQuaternion()
})

// center.setRotationFromQuaternion(correctionQuaternion)
