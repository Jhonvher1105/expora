import { BrowserRouter, Routes, Route } from "react-router-dom";
import Registration from "./login2/Registration";
import LogIn2 from "./login2/LogIn2";
import UserHomePage from "./components/UserFolder/UserMain"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LogIn2/>}></Route>
                <Route path="/Registration" element={<Registration />} />
                <Route path="/LogIn2" element={<LogIn2 />} />
                <Route path="/Home" element={<UserHomePage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
