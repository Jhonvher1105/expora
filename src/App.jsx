import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/generalFile/LandingPage";
import Registration from "./login2/Registration";
import LogIn2 from "./login2/LogIn2";
import ForgotPassword from "./login2/ForgotPassword";
import VerifyEmail from "./login2/VerifyEmail";
import UserHomePage from "./components/UserFolder/UserMain";
import GuestProfile from './components/UserFolder/GuestProfile';
import HostProfile from './components/hostFolder/HostProfile';
import Settings from './components/UserFolder/Settings';
import HostSettings from './components/hostFolder/HostSettings';
import HostBody from './components/hostFolder/HBody';
import HostBooking from './components/hostFolder/HostBooking';
import Earnings from './components/hostFolder/Earnings';
import FavPage from './components/UserFolder/FavPage';
import SuggestionsPage from './components/UserFolder/SuggestionsPage';
import Rewards from './components/UserFolder/Rewards';
import PointsHistory from './components/UserFolder/PointsHistory';
import MyBooking from './components/UserFolder/MyBooking';
import WalletPage from './components/UserFolder/WalletPage';
import AdminDashboard from './components/admin/AdminDashboard';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';

import HostingType from './components/ui/HostingType';
import Service from './components/ui/AddService';
import SharedListing from './components/ui/SharedListing';
import RandomAddBtn from './components/ui/RandomAddBtn';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage/>}></Route>
                <Route path="/Registration" element={<Registration />} />
                <Route path="/LogIn" element={<LogIn2/>}/>
                <Route path="/forgot-password" element={<ForgotPassword/>}/>
                <Route path="/verify-email" element={<VerifyEmail/>}/>
                <Route path="/Home" element={<UserHomePage />} />
                <Route path="/Profile" element={<GuestProfile/>}/>
                <Route path="/HostProfile" element={<HostProfile/>}/>
                <Route path="/Settings" element={<Settings/>}/>
                <Route path="/HostSettings" element={<HostSettings/>}/>
                <Route path="/HostPage" element={<HostBody/>}/>
                <Route path="/HostBooking" element={<HostBooking/>}/>
                <Route path="/HostEarnings" element={<Earnings/>}/>
                <Route path="/FavPage" element={<FavPage/>}/>
                <Route path="/SuggestionsPage" element={<SuggestionsPage/>}/>
                <Route path="/Rewards" element={<Rewards/>}/>
                <Route path="/PointsHistory" element={<PointsHistory/>}/>
                <Route path="/MyBooking" element={<MyBooking/>}/>
                <Route path="/WalletPage" element={<WalletPage/>}/>
                
                <Route path="/HostingType" element={<HostingType/>}/>
                <Route path="/Service" element={<Service/>}/>
                <Route path="/random_Btn" element={<RandomAddBtn/>}/>
                
                {/* Shared Listing Routes */}
                <Route path="/listing/:category/:id" element={<SharedListing />}/>
                <Route path="/SharedListing" element={<SharedListing />}/>

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
