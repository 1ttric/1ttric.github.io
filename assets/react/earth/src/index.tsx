import ReactDOM from "react-dom";
import React, {FC, Suspense, useEffect, useMemo, useState} from "react";
import {Canvas, useLoader, useThree} from "@react-three/fiber";
import {Loader, OrbitControls, Sphere, useTexture} from "@react-three/drei";
import {
    AdditiveBlending,
    BackSide,
    CanvasTexture,
    Color,
    FrontSide,
    MOUSE,
    Texture,
    TextureLoader,
    Vector3
} from "three";
import pLimit from "p-limit";
import {shuffle} from "lodash";
import SunCalc from "suncalc";

/**
 * Gets a remote cloudmap texture, stitching tiles together to form an equirectangular full-globe map
 */
const useCloudTexture = (): Texture => {
    const [texture, setTexture] = useState<Texture>(new CanvasTexture(document.createElement("canvas")));

    useEffect(() => {
        const ZOOMLEVEL = 3
        const TILESIZE = 256
        const ctx = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
        ctx.canvas.width = 2 ** ZOOMLEVEL * TILESIZE
        ctx.canvas.height = 2 ** ZOOMLEVEL * TILESIZE

        const limit = pLimit(4)
        const promises: (() => Promise<void>)[] = []
        for (let i = 0; i < 2 ** ZOOMLEVEL; i++) {
            for (let j = 0; j < 2 ** ZOOMLEVEL; j++) {
                promises.push(() => new Promise<void>(res => {
                    const img = new Image();
                    img.crossOrigin = "anonymous"
                    img.onload = () => {
                        ctx.filter = 'grayscale(1) invert(1) brightness(5)';
                        ctx.drawImage(img, i * TILESIZE, j * TILESIZE)
                        setTexture(new CanvasTexture(ctx.canvas))
                        res()
                    }
                    img.src = `https://a.sat.owm.io/vane/2.0/weather/CL/${ZOOMLEVEL}/${i}/${j}?appid=9de243494c0b295cca9337e1e96b00e2`
                }))
            }
        }
        shuffle(promises).map(p => limit(p))
    }, [])

    return texture
}

/**
 * Applies a canvas filter to a texture and returns the modified texture
 * @param texture
 * @param filter
 */
const applyFilter = (texture: Texture, filter: string): Texture => {
    const el = texture.image as HTMLImageElement | HTMLCanvasElement;
    const ctx = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
    switch (el.tagName) {
        case "IMG": {
            const elImg = el as HTMLImageElement;
            ctx.canvas.width = elImg.width
            ctx.canvas.height = elImg.height
            ctx.filter = filter
            ctx.drawImage(elImg, 0, 0)
            break;
        }
        case "CANVAS": {
            const elCanvas = el as HTMLCanvasElement;
            ctx.canvas.width = elCanvas.width
            ctx.canvas.height = elCanvas.height
            ctx.filter = filter
            ctx.drawImage(elCanvas, 0, 0)
            break;
        }
        default: {
            throw new Error(`unhandled texture type: ${JSON.stringify(texture)}`)
        }
    }
    return new CanvasTexture(ctx.canvas)
}

const App3D: FC = () => {
    const {gl, scene, camera} = useThree()
    const skyMap = useLoader(TextureLoader, "/images/earth/starmap_2020_4k.jpg") as Texture

    const [colorMap, bumpMap, specularMap, lightMap] = useTexture([
        "/images/earth/world.200412.3x5400x2700.jpg",
        "/images/earth/earthbump4k.jpg",
        "/images/earth/earthspec4k-inverted.jpg",
        "/images/earth/earthlights4k.jpg",
    ]) as Texture[];
    const lightMapFiltered = useMemo(() => applyFilter(lightMap, "grayscale(1) contrast(1.2) brightness(0.4)"), [lightMap])
    const cloudMap = useCloudTexture();

    const [sunPosXYZ, setSunPosXYZ] = useState<Vector3>();

    useEffect(() => {
        const interval = setInterval(() => {
            const sunPos = SunCalc.getPosition(new Date(), 180, 0)
            setSunPosXYZ(new Vector3(Math.cos(sunPos.azimuth), -Math.sin(sunPos.altitude), Math.sin(sunPos.azimuth)))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <>
            <OrbitControls
                autoRotate
                autoRotateSpeed={0.1}
                enableDamping
                minDistance={1.5}
                maxDistance={1.9}
                enablePan={false}
                mouseButtons={{LEFT: MOUSE.ROTATE, RIGHT: MOUSE.ROTATE, MIDDLE: MOUSE.ROTATE}}/>
            <Sphere args={[1000, 32, 64]}>
                <meshBasicMaterial attach="material" map={skyMap} side={BackSide}/>
            </Sphere>

            <ambientLight intensity={0.01}/>
            {
                !!sunPosXYZ && <directionalLight intensity={5} position={sunPosXYZ}/>
            }

            <Sphere name="earth" args={[1, 128, 256]}>
                <meshPhysicalMaterial
                    attach="material"
                    roughness={1}
                    map={colorMap}
                    displacementMap={bumpMap}
                    displacementScale={0.01}
                    roughnessMap={specularMap}
                    emissive={new Color("#ebe6c2")}
                    emissiveMap={lightMapFiltered}
                />
            </Sphere>
            <Sphere name="clouds" args={[1.002, 128, 256]}>
                <meshStandardMaterial
                    transparent
                    color="white"
                    attach="material"
                    displacementMap={bumpMap}
                    displacementScale={0.01}
                    alphaMap={cloudMap}
                />
            </Sphere>
            <Sphere name="atmosphere" args={[1.004, 128, 256]}>
                <shaderMaterial
                    transparent
                    // uniforms={{
                    //     c: {value: 0},
                    //     p: {value: 6},
                    //     glowColor: {value: new Color("#7ab8d0")},
                    //     viewVector: {value: camera.position}
                    // }}
                    // vertexShader={`
                    //     uniform vec3 viewVector;
                    //     uniform float c;
                    //     uniform float p;
                    //     varying float intensity;
                    //     void main()
                    //     {
                    //         vec3 vNormal = normalize( normalMatrix * normal );
                    //         vec3 vNormel = normalize( normalMatrix * viewVector );
                    //         intensity = pow( c - dot(vNormal, vNormel), p );
                    //         gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                    //     }
                    // `}
                    // fragmentShader={`
                    //     uniform vec3 glowColor;
                    //     varying float intensity;
                    //     void main()
                    //     {
                    //         vec3 glow = glowColor * intensity;
                    //         gl_FragColor = vec4( glow, 1.0 );
                    //     }
                    // `}
                    vertexShader={`
                    varying vec3 vertexNormal;
                    void main() {
                        vertexNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.95);
                    }
                    `}
                    fragmentShader={`
                    varying vec3 vertexNormal;
                    void main() {
                        float intensity = pow(0.3 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
                        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
                    }
                    `}
                    side={FrontSide}
                    blending={AdditiveBlending}
                />
            </Sphere>
        </>
    )
}

const App: FC = () => {
    return <div style={{position: "absolute", inset: "0", width: "100vw", height: "100vh"}}>
        <div id="debug" style={{
            position: "absolute",
            "left": 0,
            "top": 0,
            "width": "800px",
            "height": "400px",
            overflow: "scroll",
            zIndex: "100",
            backgroundColor: "black",
            visibility: "hidden"
        }}/>
        <Canvas style={{width: "100%", height: "100%"}}
                gl={{physicallyCorrectLights: true}}>
            <Suspense fallback={null}>
                <App3D/>
            </Suspense>
        </Canvas>
        <Loader/>
    </div>
}


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById("react-app")
);
