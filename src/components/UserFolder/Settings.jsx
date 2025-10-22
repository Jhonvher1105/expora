import { User, Album, Ticket, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import Header from './Header';
import Footer from '../generalFile/Footer';

import '../cssFile/temp.css';



const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
        ...prev,
        [name]: value
    }));
};

export default function Settings() {

    const [showAcc, setShowAcc] = useState(true);
    const [showBooking, setShowBooking] = useState(false);
    const [showCoupon, setCoupon] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [Eye, EyeOff] = useState(true);
    const [showSave, setShowSave] = useState(false);
    const [showEdit, setShowEdit] = useState(true);

    const handleAccBtn = () =>{
        setShowAcc(true);
        setShowBooking(false);
        setCoupon(false);
    }
    const handleBookingBtn = () =>{
        setShowBooking(true);
        setShowAcc(false);
        setCoupon(false);
    }
    const handleCouBtn = () =>{
        setShowBooking(true);
        setShowAcc(false);
        setCoupon(true);
    }

    const handleEditClick = () => {
        setShowSave(true);
        setShowEdit(false);
    };

    const handleCancelBtn = () => {
        setShowSave(false);
        setShowEdit(true);
    };


    return (
        <>
            <Header />
            <div className="setting_container">
                <aside className="setting_aside">
                    <h3>Settings</h3>

                    <div className='setting_nav_container'>
                        <nav>
                            <button className='nav_btn_group' onClick={handleAccBtn}>
                                <User className="sett_nav_icon" size={26} />
                                <span>Account</span>
                            </button>

                            {/* <button className='nav_btn_group' onClick={handleCouBtn}>
                                <Ticket className="sett_nav_icon" size={26} />
                                <span>Coupon</span>
                            </button> */}
                        </nav>
                    </div>
                </aside>
                <main className="settings_main">
                    {showAcc && (
                        <article className="settings_Pass_Arti">
                            <h2>Account Setting</h2>
                            <form className="Change_Pass_Form">
                                <fieldset className='field_input'>
                                    <legend>Current Password</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="Current Password"
                                            className="password-input"
                                            required
                                        />
                                    </div>
                                </fieldset>
                                <fieldset className='field_input'>
                                    <legend>New Password</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="New Password"
                                            className="password-input"
                                            required
                                        />
                                    </div>
                                </fieldset>
                                <fieldset className='field_input'>
                                    <legend>New Password</legend>
                                    <div className="input-group">
                                        <User className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="New Password"
                                            className="password-input"
                                            required
                                        />
                                    </div>
                                </fieldset>
                                <div className="btn-group">
                                    {showEdit && (
                                        <button
                                            type="button"
                                            className="save-btn"
                                            id="editBtn"
                                            onClick={handleEditClick}
                                        >
                                            Edit
                                        </button>
                                    )}

                                    {showSave && (
                                        <button type="button" className="save-btn" id="saveBtn" >Save Changes</button>
                                    )}

                                    <button type="button" className="cancel-btn" onClick={handleCancelBtn}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </article>


                    )}
                    {showBooking && (
                        <article className="settings_components_grp" >
                            <fieldset className='field_input'>
                                <legend>New Password</legend>
                                <div className="input-group">
                                    <User className="input-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Current Password"
                                        className="password-input"
                                        required
                                    />
                                </div>
                            </fieldset>
                        </article>
                    )}
                </main>
            </div>
            <Footer />
        </>
    );

}