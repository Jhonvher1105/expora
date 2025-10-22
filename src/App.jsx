import { BrowserRouter, Routes, Route } from "react-router-dom";
import Registration from "./login2/Registration";
import LogIn2 from "./login2/LogIn2";
import UserHomePage from "./components/UserFolder/UserMain";
import Profile from './components/UserFolder/Profile';
import Settings from './components/UserFolder/Settings';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LogIn2/>}></Route>
                <Route path="/Registration" element={<Registration />} />
                <Route path="/Home" element={<UserHomePage />} />
                <Route path="/LogIn" element={<LogIn2/>}/>
                <Route path="/Profile" element={<Profile/>}/>
                <Route path="/Settings" element={<Settings/>}/>
            </Routes>
        </BrowserRouter>
    );
}
export default App;
