import ReactDOM from "react-dom";
import React, {useEffect, useRef, useState} from "react";
import Webcam from "react-webcam";
import cv from "@techstark/opencv-js";
import {every, filter, meanBy, range, some, zip} from "lodash";
import Plot from "react-plotly.js";
import {Data} from "plotly.js";
import {div, mul, Rank, real, scalar, Tensor, tensor1d} from "@tensorflow/tfjs";

// The factor by which to scale the image before performing Haar analysis. Speeds things up quite a bit, at the cost of accuracy.
const RESIZE_FACTOR = 0.25
// The length of the sliding window over which to compute mean current facial position
const FACE_POSITION_WINDOW_SIZE = 10
// The sampling frequency in Hz
const FFT_SAMPLE_RATE = 1 / 10
// The number of color samples to keep for FFT
const FFT_SAMPLES = 80

const sleep = async (ms: number) => new Promise<void>(res => setTimeout(() => res(), ms))

// Converts an image blob string to a cv2 Mat
const imageStrToMat = async (imgStr: string, newWidth?: number, newHeight?: number): Promise<cv.Mat> => {
    const el: HTMLImageElement = document.createElement("img")
    if (newWidth !== undefined) el.width = Math.floor(newWidth / 10)
    if (newHeight !== undefined) el.height = Math.floor(newHeight / 10)
    el.src = imgStr
    await new Promise<void>(res => el.onload = () => res())
    return cv.imread(el);
}

const App = () => {
    const [cvInitialized, setCvInitialized] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const classifierRef = useRef<cv.CascadeClassifier>();
    const webcamRef = useRef<Webcam>(null);
    const canvasFaceTracker = useRef<HTMLCanvasElement>(null);
    const canvasImgCropped = useRef<HTMLCanvasElement>(null);
    const recentFacePosition = useRef<(cv.Rect | null)[]>([]);
    const colorOverTime = useRef<([number, number, number] | null)[]>([]);
    const colorFouriers = useRef<[Tensor<Rank>, Tensor<Rank>, Tensor<Rank>] | null>(null);
    const [triggerRender, setTriggerRender] = useState(0);

    const processFrame = async (imgStr: string) => {
        if (!canvasFaceTracker.current || !canvasImgCropped.current || !classifierRef.current) return
        const img = await imageStrToMat(imgStr)
        const imgDebug = img.clone()
        const imgSmall = new cv.Mat();
        cv.resize(imgDebug, imgSmall, new cv.Size(0, 0), RESIZE_FACTOR, RESIZE_FACTOR, cv.INTER_NEAREST)
        const grey = new cv.Mat();
        cv.cvtColor(imgSmall, grey, cv.COLOR_RGBA2GRAY, 0);
        const faces = new cv.RectVector();
        // TODO: Is any performance gain possible here from limiting Haar minSize?
        classifierRef.current.detectMultiScale(grey, faces, 1.1, 3, 0, new cv.Size(0, 0), new cv.Size(0, 0));
        if (!faces.size()) recentFacePosition.current.push(null)
        for (let i = 0; i < faces.size(); ++i) {
            const face = faces.get(i);
            if (i === 0) {
                recentFacePosition.current.push(new cv.Rect(
                    face.x / RESIZE_FACTOR, face.y / RESIZE_FACTOR,
                    face.width / RESIZE_FACTOR, face.height / RESIZE_FACTOR
                ))
            }
            cv.rectangle(
                imgDebug,
                new cv.Point(face.x / RESIZE_FACTOR, face.y / RESIZE_FACTOR),
                new cv.Point((face.x + face.width) / RESIZE_FACTOR, (face.y + face.height) / RESIZE_FACTOR),
                [70, 70, 70, 255]
            );
        }
        if (recentFacePosition.current.length >= FACE_POSITION_WINDOW_SIZE) recentFacePosition.current.shift()

        const smoothedFace = some(recentFacePosition.current) &&
            new cv.Rect(
                meanBy(filter(recentFacePosition.current), "x"),
                meanBy(filter(recentFacePosition.current), "y"),
                meanBy(filter(recentFacePosition.current), "width"),
                meanBy(filter(recentFacePosition.current), "height"),
            )
        if (smoothedFace) {
            // If we have successfully computed a smoothed facial position, now crop down to the forehead and calculate its colors
            const p0Face = new cv.Point(smoothedFace.x, smoothedFace.y);
            const p1Face = new cv.Point(smoothedFace.x + smoothedFace.width, smoothedFace.y + smoothedFace.height);
            const p0Forehead = new cv.Point(((p1Face.x - p0Face.x) * 0.3) + p0Face.x, ((p1Face.y - p0Face.y) * 0) + p0Face.y)
            const p1Forehead = new cv.Point(((p1Face.x - p0Face.x) * 0.7) + p0Face.x, ((p1Face.y - p0Face.y) * 0.25) + p0Face.y)
            cv.rectangle(imgDebug, p0Face, p1Face, [255, 0, 255, 255]);
            cv.rectangle(imgDebug, p0Forehead, p1Forehead, [255, 0, 255, 255]);
            const imgCropped = img.roi(new cv.Rect(p0Forehead, new cv.Size(p1Forehead.x - p0Forehead.x, p1Forehead.y - p0Forehead.y)))
            colorOverTime.current.push(cv.mean(imgCropped).slice(0, 3) as [number, number, number])

            canvasImgCropped.current.width = imgCropped.cols
            canvasImgCropped.current.height = imgCropped.rows
            cv.imshow(canvasImgCropped.current as HTMLCanvasElement, imgCropped);
            imgCropped.delete()
        } else {
            colorOverTime.current.push(null)
        }
        if (colorOverTime.current.length >= FFT_SAMPLES) {
            colorOverTime.current.shift()
        }

        canvasFaceTracker.current.width = img.cols
        canvasFaceTracker.current.height = img.rows
        cv.imshow(canvasFaceTracker.current as HTMLCanvasElement, imgDebug);

        imgSmall.delete();
        img.delete();
        grey.delete();
        faces.delete();
    }

    // Wait for openCV to initialize
    useEffect(() => {
        const asyncEffect = async () => {
            await new Promise<void>(res => cv.onRuntimeInitialized = () => res())
            setCvInitialized(true)
        }
        asyncEffect().catch(console.error)
    })

    // Load the Haar cascade classifier
    useEffect(() => {
        const asyncEffect = async () => {
            if (!cvInitialized) return;
            cv.FS_createDataFile(
                "/",
                "haar.xml",
                new Uint8Array(await (await fetch(
                    "https://cdn.jsdelivr.net/gh/opencv/opencv/data/haarcascades/haarcascade_frontalface_default.xml"
                )).arrayBuffer()),
                true,
                false,
                false
            );
            classifierRef.current = new cv.CascadeClassifier();
            classifierRef.current.load("haar.xml");
            setModelLoaded(true)
        }
        asyncEffect().catch(console.error)
        return () => classifierRef?.current?.delete()
    }, [cvInitialized]);

    // Capture and process screenshots every so often
    useEffect(() => {
        const interval = setInterval(async () => {
            console.debug("capturing frame", Date.now() / 1000)
            if (!modelLoaded) return;
            const imgStr = webcamRef?.current?.getScreenshot()
            if (!imgStr) return;
            // processFrame(imgStr).catch(console.error)
        }, FFT_SAMPLE_RATE * 1000);
        return () => clearInterval(interval);
    }, [webcamRef.current, modelLoaded]);

    // Periodically perform FFT on the color data to determine BPM
    useEffect(() => {
        const interval = setInterval(() => {
            if (!every(colorOverTime.current)) return
            const ffts = zip(...colorOverTime.current).map(channel => real(tensor1d(channel as number[]).rfft()).abs())
            colorFouriers.current = ffts as [Tensor<Rank>, Tensor<Rank>, Tensor<Rank>]
        }, 100)
        return () => clearInterval(interval)
    }, [])

    // Periodically rerender
    useEffect(() => {
        const interval = setInterval(() => setTriggerRender(i => i + 1), 500)
        return () => clearInterval(interval)
    })

    return <div style={{display: "block"}}>
        cv initialized: {JSON.stringify(cvInitialized)}
        <br/>
        model loaded: {JSON.stringify(modelLoaded)}
        <Webcam
            ref={webcamRef}
            // style={{position: "absolute", right: "100%"}}
            muted
            mirrored
            screenshotQuality={1}
            screenshotFormat="image/jpeg"
        />
        <canvas ref={canvasFaceTracker}/>
        <Plot
            data={zip(...colorOverTime.current.map(c => c ?? [0, 0, 0]) as number[][]).map(chan => {
                const data = {
                    x: range(chan.length),
                    y: chan,
                    type: "scatter"
                } as Data
                return data;
            })}
            layout={{
                width: 1000,
                height: 300,
                title: "Raw",
            }}
        />
        <Plot
            data={colorFouriers.current?.map(channel => {
                const data = {
                    x: div(mul(range(Math.ceil(FFT_SAMPLES / 2)), scalar(1 / FFT_SAMPLE_RATE)), FFT_SAMPLES).dataSync(),
                    y: channel.dataSync(),
                    type: "scatter"
                } as Data
                return data;
            }) ?? []}
            layout={{
                width: 1000,
                height: 300,
                title: "FFT",
                yaxis: {range: [0, 20]}
            }}
        />
        <canvas ref={canvasImgCropped}/>
    </div>
}


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById("react-app")
);
