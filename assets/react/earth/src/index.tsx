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
import Jimp from "jimp/browser/lib/jimp";
import {DateTime} from "luxon";

const jimpToCanvas = (img: Jimp): HTMLCanvasElement => {
    const ctx = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
    ctx.canvas.width = img.getWidth();
    ctx.canvas.height = img.getHeight();
    ctx.putImageData(new ImageData(
        Uint8ClampedArray.from(img.bitmap.data),
        img.bitmap.width,
        img.bitmap.height
    ), 0, 0)
    return ctx.canvas
}

/**
 *  Taken from https://openweathermap.org/weathermap?layer=clouds
 */
const useOpenWeatherMapCloudTexture = (): Texture => {
    const [texture, setTexture] = useState<Texture>(new CanvasTexture(document.createElement("canvas")));

    useEffect(() => {
        const asyncFn = async () => {
            const ZOOMLEVEL = 3
            const TILESIZE = 256
            const img = new Jimp(2 ** ZOOMLEVEL * TILESIZE, 2 ** ZOOMLEVEL * TILESIZE)
            const chunks: [Jimp, number, number][] = [];

            const limit = pLimit(4)
            const promises: (() => Promise<void>)[] = []
            for (let i = 0; i < 2 ** ZOOMLEVEL; i++) {
                for (let j = 0; j < 2 ** ZOOMLEVEL; j++) {
                    promises.push(() => new Promise<void>(res => {
                        const asyncFn = async () => {
                            const url = `https://a.sat.owm.io/vane/2.0/weather/CL/${ZOOMLEVEL}/${i}/${j}?appid=9de243494c0b295cca9337e1e96b00e2`
                            const chunk = await Jimp.read(url)
                            chunks.push([chunk, i, j])
                            res()
                        }
                        asyncFn().catch(console.error)
                    }))
                }
            }
            await Promise.all(shuffle(promises).map(p => limit(p)))

            for (const [chunk, i, j] of chunks) {
                img.blit(chunk, i * TILESIZE, j * TILESIZE, 1, 9, 256, 256)
            }
            const canvas = jimpToCanvas(img)
            setTexture(new CanvasTexture(canvas))
        }
        asyncFn().catch(console.error)
    }, [])

    return texture
}

/**
 * Taken from https://www.windy.com/-Clouds-clouds
 */
const useWindyCloudTexture = (): Texture => {
    const [texture, setTexture] = useState<Texture>(new CanvasTexture(document.createElement("canvas")));

    useEffect(() => {
        const asyncEffect = async () => {
            const ZOOMLEVEL = 3
            const TILESIZE = 256
            const img = new Jimp(2 ** ZOOMLEVEL * TILESIZE, 2 ** ZOOMLEVEL * TILESIZE)
            const chunks: [Jimp, number, number][] = [];
            const dateLuxon = DateTime.utc()

            const limit = pLimit(16)
            const promises: (() => Promise<void>)[] = []
            for (let i = 0; i < 2 ** ZOOMLEVEL; i++) {
                for (let j = 0; j < 2 ** ZOOMLEVEL; j++) {
                    promises.push(() => new Promise<void>(res => {
                        const asyncFn = async () => {
                            const url = dateLuxon.toFormat(`'https://ims.windy.com/im/v3.0/forecast/ecmwf-hres/'yyyyLLdd'12/'yyyyLLddHH'/wm_grid_257/${ZOOMLEVEL}/${i}/${j}/cloudsrain-surface.jpg'`)
                            const chunk = await Jimp.read(url)
                            chunks.push([chunk, i, j])
                            res()
                        }
                        asyncFn().catch(console.error)
                    }))
                }
            }
            await Promise.all(shuffle(promises).map(p => limit(p)))

            for (const [chunk, i, j] of chunks) {
                img.blit(chunk, i * TILESIZE, j * TILESIZE, 1, 9, 256, 256)
            }
            img.color([
                {apply: "green", params: [-256]}
            ])
            img.grayscale()
            img.brightness(0.35)
            img.contrast(0.8)
            img.normalize()

            const canvas = jimpToCanvas(img)
            setTexture(new CanvasTexture(canvas))
        }
        asyncEffect().catch(console.error)
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
    const skyMap = useLoader(TextureLoader, "/images/earth/starmap_2020_4k.jpg") as Texture
    const [colorMap, bumpMap, specularMap, lightMap] = useTexture([
        "/images/earth/world.200412.3x5400x2700.jpg",
        "/images/earth/earthbump4k.jpg",
        "/images/earth/earthspec4k-inverted.jpg",
        "/images/earth/earthlights4k.jpg",
    ]) as Texture[];
    const lightMapFiltered = useMemo(() => applyFilter(lightMap, "grayscale(1) contrast(1.2) brightness(0.4)"), [lightMap])
    const cloudMap = useWindyCloudTexture();

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
