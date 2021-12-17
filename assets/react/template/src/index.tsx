import ReactDOM from "react-dom";
import React, {FC} from "react";

const App: FC = () => {
    return <div>
        This is a React app
    </div>
}


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById("react-app")
);
