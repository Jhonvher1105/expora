import { BrowserRouter, Route, Routes } from "react-router-dom";

import Header from './Header';
import Body from './HomeBody';
import Footer from '../generalFile/Footer';

function UserMain() {
    return <div>
        <Body />
        <Footer />
    </div>
}
export default UserMain;