import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import logo from "../pic/logo.png";
import LogIn2 from './LogIn2';
import "./index.css";

import { Link } from "react-router-dom";

// Firebase imports
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

function Registration() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // Step 1 = email verification, Step 2 = user info
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);

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
  });

  // Handle input updates
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // STEP 1: Create account and send verification email
  const handleSendVerification = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      alert("Please enter your email and password.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      setIsLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      setUser(userCredential.user);

      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);
      alert(
        "📩 Verification email sent! Please check your inbox or spam folder."
      );
    } catch (error) {
      console.error("Error creating user:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1.5: Check if user has verified email
  const handleCheckVerification = async () => {
    if (!auth.currentUser) {
      alert("Please create an account first.");
      return;
    }

    await reload(auth.currentUser); // refresh user data
    if (auth.currentUser.emailVerified) {
      alert("✅ Email verified successfully!");
      setStep(2); // move to next step
    } else {
      alert("❌ Email not verified yet. Please check your inbox again.");
    }
  };

  // STEP 1.6: Resend verification email
  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      alert("Please create an account first.");
      return;
    }

    try {
      await sendEmailVerification(auth.currentUser);
      alert("📨 Verification email resent! Check your inbox.");
    } catch (error) {
      console.error(error);
      alert("Failed to resend email. Try again later.");
    }
  };

  // STEP 2: Save profile info to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!auth.currentUser || !auth.currentUser.emailVerified) {
      alert("Please verify your email before submitting your profile.");
      return;
    }

    try {
      setIsLoading(true);
      const uid = auth.currentUser.uid;

      await setDoc(doc(db, "users", uid), {
        email: auth.currentUser.email,
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
        createdAt: new Date(),
      });

      alert("🎉 Registration complete! Welcome to Expora.");
      setStep(1);
      setVerificationSent(false);
      setFormData({
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
      });
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving user data.");
    } finally {
      setIsLoading(false);
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
              <p className="sub-heading">
                Enter your email and password to begin
              </p>
            </div>

            <form className="form-group" onSubmit={handleSendVerification}>
              <label className="form-label">Email address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="form-input"
                required
              />

              <label className="form-label">Password</label>
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a password"
                  className="form-input password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-btn"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <label className="form-label">Confirm Password</label>
              <div className="password-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  className="form-input password-input"
                  required
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

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? "Processing..." : "Send Verification Email"}
              </button>
            </form>

            {verificationSent && (
              <div className="verification-actions">
                <p>✅ Verification email sent. Once verified, click below:</p>
                <button onClick={handleCheckVerification} className="check-btn">
                  Check Verification
                </button>
                <button
                  onClick={handleResendVerification}
                  className="resend-btn"
                >
                  Resend Email
                </button>
              </div>
            )}

            <div className="signup-text">
              Already have an account?{" "}
              <Link to="/LogIn2.jsx">Sign In</Link>
              {/* <a href={LogIn2} className="link">
                Sign in
              </a> */}
            </div>
          </>
        ) : (
          <>
            <div className="welcome-section">
              <h1 className="main-heading">Complete your profile</h1>
              <p className="sub-heading">
                Fill in your personal details to finish registration
              </p>
            </div>

            <form className="form-scroll" onSubmit={handleSubmit}>
              {/* All your profile inputs go here (same as before) */}
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
                    required
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
              {/* ... keep the rest of your form fields (lastName, address, etc.) exactly the same ... */}

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? "Saving..." : "Create Account"}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="footer-text">
        By signing up, you agree to our{" "}
        <a href="" className="link">
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
