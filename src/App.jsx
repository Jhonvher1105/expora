import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/generalFile/LandingPage";
import Registration from "./login2/Registration";
import LogIn2 from "./login2/LogIn2";
import UserHomePage from "./components/UserFolder/UserMain";
import Profile from './components/UserFolder/Profile';
import Settings from './components/UserFolder/Settings';
import HostBody from './components/hostFolder/HBody';
import FavPage from './components/UserFolder/FavPage';
import Rewards from './components/UserFolder/Rewards';
import PointsHistory from './components/UserFolder/PointsHistory';
import MyBooking from './components/UserFolder/MyBooking';
import AdminDashboard from './components/admin/AdminDashboard';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';

import HostingType from './components/ui/HostingType';
import Service from './components/ui/AddService';

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
                <Route path="/FavPage" element={<FavPage/>}/>
                <Route path="/Rewards" element={<Rewards/>}/>
                <Route path="/PointsHistory" element={<PointsHistory/>}/>
                <Route path="/MyBooking" element={<MyBooking/>}/>
                
                <Route path="/HostingType" element={<HostingType/>}/>
                <Route path="/Service" element={<Service/>}/>

                {/* Admin Routes */}
                <Route path="/Admin" element={
                    <ProtectedAdminRoute>
                        <AdminDashboard />
                    </ProtectedAdminRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}
export default App;
