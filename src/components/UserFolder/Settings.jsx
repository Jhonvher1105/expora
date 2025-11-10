import { User, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { 
    reauthenticateWithCredential, 
    EmailAuthProvider, 
    updatePassword,
    onAuthStateChanged
} from "firebase/auth";

import Header from './Header';
import Footer from '../generalFile/Footer';

import '../cssFile/temp.css';

export default function Settings() {
    const [currentUser, setCurrentUser] = useState(null);
    const [showAcc, setShowAcc] = useState(true);
    const [showBooking, setShowBooking] = useState(false);
    const [showCoupon, setCoupon] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showSave, setShowSave] = useState(false);
    const [showEdit, setShowEdit] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    // Track current user
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
        // Clear errors when user types
        if (error) setError("");
        if (success) setSuccess("");
    };

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
    const handleCouBtn = () => {
        setShowBooking(false);
        setShowAcc(false);
        setCoupon(true);
    };

    const handleEditClick = () => {
        setShowSave(true);
        setShowEdit(false);
        // Reset form when editing
        setFormData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        });
        setError("");
        setSuccess("");
    };

    const handleCancelBtn = () => {
        setShowSave(false);
        setShowEdit(true);
        // Reset form on cancel
        setFormData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        });
        setError("");
        setSuccess("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        if (!currentUser) {
            setError("You must be logged in to change your password.");
            setLoading(false);
            return;
        }

        // Validation
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError("Please fill in all fields.");
            setLoading(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            setError("New password must be at least 6 characters long.");
            setLoading(false);
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New passwords do not match.");
            setLoading(false);
            return;
        }

        if (formData.currentPassword === formData.newPassword) {
            setError("New password must be different from current password.");
            setLoading(false);
            return;
        }

        try {
            // Re-authenticate user with current password
            const credential = EmailAuthProvider.credential(
                currentUser.email,
                formData.currentPassword
            );
            await reauthenticateWithCredential(currentUser, credential);

            // Update password
            await updatePassword(currentUser, formData.newPassword);

            setSuccess("Password updated successfully! ✅");
            setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
            setShowSave(false);
            setShowEdit(true);
        } catch (error) {
            console.error("Error updating password:", error);
            if (error.code === "auth/wrong-password") {
                setError("Current password is incorrect.");
            } else if (error.code === "auth/weak-password") {
                setError("New password is too weak. Please choose a stronger password.");
            } else {
                setError(error.message || "Failed to update password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
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
                            <h2>Account Settings</h2>
                            <form className="Change_Pass_Form" onSubmit={handleSubmit}>
                                {error && (
                                    <div style={{
                                        padding: "12px",
                                        background: "rgba(239, 68, 68, 0.2)",
                                        color: "var(--error, #ef4444)",
                                        borderRadius: "var(--radius-md, 8px)",
                                        marginBottom: "16px",
                                        border: "1px solid rgba(239, 68, 68, 0.3)"
                                    }}>
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div style={{
                                        padding: "12px",
                                        background: "rgba(16, 185, 129, 0.2)",
                                        color: "var(--success, #10b981)",
                                        borderRadius: "var(--radius-md, 8px)",
                                        marginBottom: "16px",
                                        border: "1px solid rgba(16, 185, 129, 0.3)"
                                    }}>
                                        {success}
                                    </div>
                                )}
                                <fieldset className='field_input'>
                                    <legend>Current Password</legend>
                                    <div className="input-group" style={{ position: "relative" }}>
                                        <User className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="currentPassword"
                                            value={formData.currentPassword || ""}
                                            onChange={handleChange}
                                            placeholder="Enter current password"
                                            className="password-input"
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                            required={!showEdit}
                                        />
                                        {!showEdit && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: "absolute",
                                                    right: "12px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "var(--text-secondary, rgba(255, 255, 255, 0.6))",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        )}
                                    </div>
                                </fieldset>
                                <fieldset className='field_input'>
                                    <legend>New Password</legend>
                                    <div className="input-group" style={{ position: "relative" }}>
                                        <User className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="newPassword"
                                            value={formData.newPassword || ""}
                                            onChange={handleChange}
                                            placeholder="Enter new password (min. 6 characters)"
                                            className="password-input"
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                            required={!showEdit}
                                        />
                                        {!showEdit && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: "absolute",
                                                    right: "12px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "var(--text-secondary, rgba(255, 255, 255, 0.6))",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        )}
                                    </div>
                                </fieldset>
                                <fieldset className='field_input'>
                                    <legend>Confirm New Password</legend>
                                    <div className="input-group" style={{ position: "relative" }}>
                                        <User className="input-icon" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword || ""}
                                            onChange={handleChange}
                                            placeholder="Confirm new password"
                                            className="password-input"
                                            disabled={showEdit}
                                            readOnly={showEdit}
                                            required={!showEdit}
                                        />
                                        {!showEdit && (
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                style={{
                                                    position: "absolute",
                                                    right: "12px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "var(--text-secondary, rgba(255, 255, 255, 0.6))",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        )}
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
                                        <button 
                                            type="submit" 
                                            className="save-btn" 
                                            id="saveBtn"
                                            disabled={loading}
                                        >
                                            {loading ? "Updating..." : "Save Changes"}
                                        </button>
                                    )}

                                    {showSave && (
                                        <button 
                                            type="button" 
                                            className="cancel-btn" 
                                            onClick={handleCancelBtn}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                    )}
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