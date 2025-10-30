import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import logo from "../components/pic/logo.png";
import "./index.css";
// import "../components/cssFile/temp.css";
import { Link, useNavigate } from "react-router-dom";

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
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [gender, setGender] = useState('');
  const [otherInput, setOtherInput] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phoneNumber: "",
    houseNumber: "",
    accType: "guest",
    city: "",
    state: "",
    zipCode: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (event) => {
    setGender(event.target.value);
    setFormData((prev) => ({ ...prev, gender: event.target.value }));
  };

  const handleOtherInputChange = (e) => {
    setOtherInput(e.target.value);
    if (gender === "other") {
      setFormData((prev) => ({ ...prev, gender: e.target.value }));
    }
  };

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

  const handleCheckVerification = async () => {
    if (!auth.currentUser) {
      alert("Please create an account first.");
      return;
    }

    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      alert("✅ Email verified successfully!");
      setStep(2);
    } else {
      alert("❌ Email not verified yet. Please check your inbox again.");
    }
  };

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
        gender: gender === "other" ? otherInput : gender,
        phoneNumber: formData.phoneNumber,
        houseNumber: formData.houseNumber,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
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
        city: "",
        state: "",
        zipCode: "",
        password: "",
        confirmPassword: "",
      });
      navigate("/login");
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

        {step === 2 ? (
          <>
            <div className="welcome-section">
              <h1 className="main-heading">Complete your profile</h1>
              <p className="sub-heading">
                Fill in your personal details to finish registration
              </p>
            </div>

            <form className="form-scroll" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">First Name *</label>
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
                  <label className="form-label" htmlFor="middleName">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    placeholder="Middle name"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dateOfBirth">Birthday</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <fieldset className="radioGender">
                    <legend>Gender identity:</legend>
                    <div>
                      <input
                        type="radio"
                        id="gender-female"
                        name="gender"
                        value="Female"
                        checked={gender === 'Female'}
                        onChange={handleGenderChange}
                      />
                      <label htmlFor="gender-female">Female</label>
                    </div>
                    <div>
                      <input
                        type="radio"
                        id="gender-male"
                        name="gender"
                        value="Male"
                        checked={gender === 'Male'}
                        onChange={handleGenderChange}
                      />
                      <label htmlFor="gender-male">Male</label>
                    </div>
                    <div>
                      <input
                        type="radio"
                        id="gender-nonbinary"
                        name="gender"
                        value="Non-binary"
                        checked={gender === 'Non-binary'}
                        onChange={handleGenderChange}
                      />
                      <label htmlFor="gender-nonbinary">Non-binary</label>
                    </div>
                    <div>
                      <input
                        type="radio"
                        id="gender-other"
                        name="gender"
                        value="other"
                        checked={gender === 'other'}
                        onChange={handleGenderChange}
                      />
                      <label htmlFor="gender-other">Other:</label>
                      <input
                        type="text"
                        value={otherInput}
                        onChange={handleOtherInputChange}
                        disabled={gender !== 'other'}
                      />
                    </div>
                  </fieldset>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="houseNumber">House Number</label>
                  <input
                    type="number"
                    name="houseNumber"
                    value={formData.houseNumber}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="city">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="state">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="zipcode">Zipcode</label>
                  <input
                    type="number"
                    name="sipcode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

              </div>
              {/* ... keep the rest of your form fields ... */}
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? "Saving..." : "Create Account"}
              </button>
            </form>
          </>
        ) : (
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
              <Link to="/LogIn">Sign In</Link>
            </div>
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
// ...existing code...