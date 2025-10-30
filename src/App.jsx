import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/generalFile/LandingPage";
import Registration from "./login2/Registration";
import LogIn2 from "./login2/LogIn2";
import UserHomePage from "./components/UserFolder/UserMain";
import Profile from './components/UserFolder/Profile';
import Settings from './components/UserFolder/Settings';
import HostBody from './components/hostFolder/HBody';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage/>}></Route>
                <Route path="/Registration" element={<Registration />} />
                <Route path="/LogIn" element={<LogIn2/>}/>
                <Route path="/Home" element={<UserHomePage />} />
                <Route path="/Profile" element={<Profile/>}/>
                <Route path="/Settings" element={<Settings/>}/>
                <Route path="/HostPage" element={<HostBody/>}/>
            </Routes>
        </BrowserRouter>
    );
}
export default App;
