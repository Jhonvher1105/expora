import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
// import "./index.css";
import "../components/cssFile/temp.css"

import logo from "../components/pic/logo.png";

import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
} from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";


function LogIn2() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        console.log("Sign in:", { email, password, rememberMe });

        if (!email || !password) {
            setErrorMessage("Please fill in both email and password.");
            return;
        }

        try {
            // Set persistence based on rememberMe
            await setPersistence(
                auth,
                rememberMe ? browserLocalPersistence : browserSessionPersistence
            );

            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            console.log("User:", userCredential.user);
            // navigate after successful login
            navigate("/Home");
        } catch (error) {
            console.error("Login failed:", error);
            setErrorMessage(error?.message || "Login failed. Please try again.");
        }
    };

    return (
        <div className="landing-page">
            <div className="landing-card">

                <div className="div-logIn-logo landing-logo">
                    <img src={logo} alt="expora logo" className="img-login-logo" />
                    <h2 className="logo-text">Expora</h2>
                </div>


                <div className="welcome-text">
                    <h1>Welcome back</h1>
                    <p>Sign in to your Expora account</p>
                </div>

                <form onSubmit={handleSubmit} className="landing-form">
                    <div className="form-group">
                        <label htmlFor="login-email">Email address</label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">Password</label>
                        <div className="password-container">
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="eye-btn"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-row remember-forgot-row">
                        <label className="remember-me-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            Remember me
                        </label>
                        <div className="forgot-password-link">
                            <Link to="/forgot-password">Forgot password?</Link>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="error-message" style={{color:'crimson',marginTop:8}}>{errorMessage}</div>
                    )}

                    <button type="submit" className="signin-btn landing-signin" disabled={!email || !password || false}>
                        Sign in
                    </button>

                    <div className="signup-text">
                        Don’t have an account? <Link to="/Registration">Sign Up</Link>
                    </div>
                </form>
            </div>

            <div className="footer-text">
                By signing in, you agree to our <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>.
            </div>
        </div>
    );
}

export default LogIn2;
