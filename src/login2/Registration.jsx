import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import logo from "../pic/logo.png";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import "./index.css";

function Registration() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpSent, setOtpSent] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        firstName: "",
        middleName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        phoneNumber: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        password: "",
        confirmPassword: "",
        profilePic: null,
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleProfilePicChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            profilePic: e.target.files[0],
        }));
    };

    const handleSendOTP = (e) => {
        e.preventDefault();
        if (formData.email) {
            console.log("Sending OTP to:", formData.email);
            setOtpSent(true);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value && index < 5) {
                document.getElementById(`otp-${index + 1}`)?.focus();
            }
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleVerifyOTP = (e) => {
        e.preventDefault();
        const otpValue = otp.join("");
        if (otpValue.length === 6) {
            console.log("Verifying OTP:", otpValue);
            setStep(2);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            // 1️⃣ Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            const user = userCredential.user;

            // 2️⃣ Send verification email
            await sendEmailVerification(user);

            // 3️⃣ Upload profile picture to Firebase Storage
            let photoURL = "";
            if (formData.profilePic) {
                const storageRef = ref(storage, `profilePictures/${user.uid}`);
                await uploadBytes(storageRef, formData.profilePic);
                photoURL = await getDownloadURL(storageRef);
            }

            // 4️⃣ Save user data to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: formData.email,
                firstName: formData.firstName,
                middleName: formData.middleName,
                lastName: formData.lastName,
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                country: formData.country,
                profilePicture: photoURL,
                emailVerified: user.emailVerified,
                createdAt: new Date(),
            });

            alert("Verification email sent! Please check your inbox.");
            console.log("User data saved successfully!");
        } catch (error) {
            console.error("Registration error:", error);
            alert(error.message);
        }
    };

    return (
        <div className="registration-container">
            <div className="registration-card">
                <div className="div-logIn-logo">
                    <img src={logo} alt="expora logo" className="img-login-logo" />
                    <h2>Expora</h2>
                </div>

                {step === 1 ? (
                    <>
                        <div className="welcome-section">
                            <h1 className="main-heading">Create your account</h1>
                            <p className="sub-heading">Verify your email to get started</p>
                        </div>

                        <form className="form-group">
                            <label className="form-label">Email address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                className="form-input"
                                disabled={otpSent}
                            />
                        </form>

                        {otpSent && (
                            <div className="form-group">
                                <label className="form-label">Enter OTP</label>
                                <p className="otp-helper-text">
                                    We've sent a 6-digit code to {formData.email}
                                </p>
                                <div className="otp-container">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            className="otp-input"
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        setOtpSent(false);
                                        setOtp(["", "", "", "", "", ""]);
                                    }}
                                    className="resend-btn"
                                >
                                    Resend OTP
                                </button>
                            </div>
                        )}

                        <button
                            onClick={otpSent ? handleVerifyOTP : handleSendOTP}
                            className="submit-btn"
                        >
                            {otpSent ? "Verify OTP" : "Send OTP"}
                        </button>

                        <div className="signup-text">
                            Already have an account?{" "}
                            <a href="#" className="link">
                                Sign in
                            </a>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="welcome-section">
                            <h1 className="main-heading">Complete your profile</h1>
                            <p className="sub-heading">
                                Fill in your details to create your account
                            </p>
                        </div>

                        <div className="form-scroll">
                            {/* Profile picture */}
                            <div className="form-group">
                                <label className="form-label">Profile Picture</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProfilePicChange}
                                    className="form-input"
                                />
                            </div>

                            {/* Personal info */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        placeholder="First name"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Middle Name</label>
                                    <input
                                        type="text"
                                        name="middleName"
                                        value={formData.middleName}
                                        onChange={handleInputChange}
                                        placeholder="Middle name"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Last name"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date of Birth *</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleInputChange}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Gender *</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        className="form-input"
                                    >
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                        <option value="prefer-not-to-say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>

                            {/* Contact info */}
                            <div className="form-group">
                                <label className="form-label">Phone Number *</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    placeholder="+63 900 000 0000"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address *</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Street address"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">City *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="City"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State/Province *</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        placeholder="State"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">ZIP/Postal Code *</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={formData.zipCode}
                                        onChange={handleInputChange}
                                        placeholder="ZIP code"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Country *</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        placeholder="Country"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <div className="password-container">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Create a password"
                                        className="form-input password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="eye-btn"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm Password *</label>
                                <div className="password-container">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Confirm your password"
                                        className="form-input password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="eye-btn"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSubmit} className="submit-btn">
                            Create Account
                        </button>

                        <div className="signup-text">
                            Already have an account?{" "}
                            <a href="#" className="link">
                                Sign in
                            </a>
                        </div>
                    </>
                )}
            </div>

            <div className="footer-text">
                By signing up, you agree to our{" "}
                <a href="#" className="link">
                    Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="link">
                    Privacy Policy
                </a>
                .
            </div>
        </div>
    );
}

export default Registration;
