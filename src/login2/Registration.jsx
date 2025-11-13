import { useState } from "react";
import { Eye, EyeOff, CheckCircle, AlertCircle, Mail, Lock } from "lucide-react";
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
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
    // Trim text inputs (except password fields to preserve spaces if needed)
    const trimmedValue = (name === 'password' || name === 'confirmPassword') 
      ? value 
      : value.trim();
    setFormData((prev) => ({ ...prev, [name]: trimmedValue }));
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

  // =======================
  // Handle Send Verification (Step 1)
  // =======================
  const handleSendVerification = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Trim inputs before validation
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    // Basic input validations
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    // Email format validation (more robust)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Password length validation (check first)
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password.length > 128) {
      setError("Password must be less than 128 characters.");
      return;
    }

    // Password match validation
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase || !hasNumber || !hasSpecialChar) {
      setError("Password must include at least one uppercase letter, one number, and one special character (!@#$%^&*).");
      return;
    }

    try {
      setIsLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);

      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);
      setSuccessMessage("📩 Verification email sent! Please check your inbox or spam folder.");
    } catch (error) {
      console.error("Error creating user:", error);
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please use a different email or sign in.");
      } else if (error.code === 'auth/invalid-email') {
        setError("Invalid email address. Please check and try again.");
      } else if (error.code === 'auth/weak-password') {
        setError("Password is too weak. Please use a stronger password.");
      } else {
        setError(error.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleCheckVerification = async () => {
    if (!auth.currentUser) {
      setError("Please create an account first.");
      return;
    }

    try {
      setIsLoading(true);
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        setSuccessMessage("✅ Email verified successfully!");
        setTimeout(() => setStep(2), 500);
      } else {
        setError("❌ Email not verified yet. Please check your inbox again.");
      }
    } catch (err) {
      setError("Error checking verification status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      setError("Please create an account first.");
      return;
    }

    try {
      setIsLoading(true);
      await sendEmailVerification(auth.currentUser);
      setSuccessMessage("📨 Verification email resent! Check your inbox.");
    } catch (error) {
      console.error(error);
      setError("Failed to resend email. Try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!auth.currentUser || !auth.currentUser.emailVerified) {
      setError("Please verify your email before submitting your profile.");
      return;
    }

    // Validate required fields
    const firstName = formData.firstName.trim();
    if (!firstName) {
      setError("First name is required.");
      return;
    }

    // Validate name fields (letters, spaces, hyphens, apostrophes only)
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(firstName)) {
      setError("First name can only contain letters, spaces, hyphens, and apostrophes.");
      return;
    }

    if (firstName.length < 2) {
      setError("First name must be at least 2 characters long.");
      return;
    }

    if (formData.middleName && !nameRegex.test(formData.middleName.trim())) {
      setError("Middle name can only contain letters, spaces, hyphens, and apostrophes.");
      return;
    }

    if (formData.lastName && !nameRegex.test(formData.lastName.trim())) {
      setError("Last name can only contain letters, spaces, hyphens, and apostrophes.");
      return;
    }

    // Validate date of birth
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (birthDate > today) {
        setError("Date of birth cannot be in the future.");
        return;
      }

      if (age < 13) {
        setError("You must be at least 13 years old to register.");
        return;
      }

      if (age > 120) {
        setError("Please enter a valid date of birth.");
        return;
      }
    }

    // Validate gender
    if (!gender) {
      setError("Please select a gender identity.");
      return;
    }

    if (gender === "other" && !otherInput.trim()) {
      setError("Please specify your gender identity.");
      return;
    }

    // Validate phone number if provided
    if (formData.phoneNumber) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      const digitsOnly = formData.phoneNumber.replace(/\D/g, '');
      
      if (!phoneRegex.test(formData.phoneNumber)) {
        setError("Please enter a valid phone number.");
        return;
      }

      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        setError("Phone number must be between 10 and 15 digits.");
        return;
      }
    }

    // Validate zip code if provided
    if (formData.zipCode) {
      const zipCodeStr = formData.zipCode.toString().trim();
      if (zipCodeStr.length < 5 || zipCodeStr.length > 10) {
        setError("Zip code must be between 5 and 10 characters.");
        return;
      }
    }

    // Validate city if provided
    if (formData.city && formData.city.trim().length < 2) {
      setError("City name must be at least 2 characters long.");
      return;
    }

    // Validate state if provided
    if (formData.state && formData.state.trim().length < 2) {
      setError("State name must be at least 2 characters long.");
      return;
    }

    try {
      setIsLoading(true);
      const uid = auth.currentUser.uid;

      await setDoc(doc(db, "users", uid), {
        email: auth.currentUser.email,
        firstName: firstName,
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth || null,
        gender: gender === "other" ? otherInput.trim() : gender,
        phoneNumber: formData.phoneNumber.trim() || null,
        houseNumber: formData.houseNumber || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zipCode: formData.zipCode || null,
        accType: formData.accType,
        createdAt: new Date(),
      });

      setSuccessMessage("🎉 Registration complete! Welcome to Expora.");
      setTimeout(() => {
        setStep(1);
        setVerificationSent(false);
        setGender('');
        setOtherInput('');
        setFormData({
          email: "",
          firstName: "",
          middleName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "",
          phoneNumber: "",
          houseNumber: "",
          city: "",
          state: "",
          zipCode: "",
          password: "",
          confirmPassword: "",
          accType: "guest",
        });
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Error saving data:", error);
      setError("Error saving user data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        {/* Header */}
        <div className="reg-header">
          <div className="div-logIn-logo">
            <img src={logo} alt="expora logo" className="img-login-logo" />
            <h2>Expora</h2>
          </div>
          
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={`step ${step === 1 ? 'active' : 'completed'}`}>
              <div className="step-circle">1</div>
              <div className="step-label">Verify Email</div>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step === 2 ? 'active' : ''}`}>
              <div className="step-circle">2</div>
              <div className="step-label">Complete Profile</div>
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

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

                <div className="form-group full-width">
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
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="12345"
                    className="form-input"
                    maxLength={10}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phoneNumber">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
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

            <form className="form-group reg-form" onSubmit={handleSendVerification}>
              
              <div className="form-group">
                <label className="form-label">
                  <Mail size={16} className="label-icon" />
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} className="label-icon" />
                  Password
                </label>
                <div className="password-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Min. 6 chars, 1 uppercase, 1 number, 1 special char"
                    className="form-input password-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="eye-btn"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} className="label-icon" />
                  Confirm Password
                </label>
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
                    aria-label="Toggle password visibility"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="btn-loading">
                    <span className="spinner"></span>
                    Processing...
                  </span>
                ) : (
                  "Send Verification Email"
                )}
              </button>
            </form>

            {verificationSent && (
              <div className="verification-section">
                <div className="verification-box">
                  <div className="verification-icon">✅</div>
                  <p className="verification-text">Verification email sent. Once verified, click below:</p>
                </div>
                <div className="verification-actions">
                  <button 
                    onClick={handleCheckVerification} 
                    className="check-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "Checking..." : "Check Verification"}
                  </button>
                  <button
                    onClick={handleResendVerification}
                    className="resend-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "Resending..." : "Resend Email"}
                  </button>
                </div>
              </div>
            )}

            <div className="divider">
              <span>or</span>
            </div>

            <div className="signup-text">
              Already have an account?{" "}
              <Link to="/LogIn" className="auth-link">Sign In</Link>
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