import ReactDOM from "react-dom";
import React, {FC, useState} from "react";

const App: FC = () => {
    const [cursorPos, setCursorPos] = useState<[number, number]>([Math.random(), 0.5]);
    const [scrollPos, setScrollPos] = useState(50)
    const [locked, setLocked] = useState(false)

    const bgColor = `hsl(${Math.round(cursorPos[0] * 360)}, ${Math.round((1 - cursorPos[1]) * 100)}%, ${Math.round(scrollPos)}%)`
    return <div
        className="absolute inset-0 w-screen h-screen"
        style={{backgroundColor: bgColor}}
        onClick={e => {
            const newLocked = !locked
            setLocked(newLocked)
            if (!newLocked) {
                setCursorPos([e.clientX / window.innerWidth, e.clientY / window.innerHeight])
            }
        }}
        onMouseMove={e => {
            !locked && setCursorPos([e.clientX / window.innerWidth, e.clientY / window.innerHeight])
        }}
        onWheel={e => {
            !locked && setScrollPos(Math.min(Math.max(0, scrollPos + (e.deltaY > 0 ? -1 : 1)), 100))
        }}
    >
    </div>
}


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById("react-app")
);
