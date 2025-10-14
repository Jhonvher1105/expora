import { BrowserRouter,Route,Routes } from "react-router-dom";

import Header from './Header';
import Body from './Body'

function UserMain() {
    return <html>
        <header>
            {<Header/>}
        </header>
        <body>
            {<Body/>}
        </body>
    </html>
}
export default UserMain;