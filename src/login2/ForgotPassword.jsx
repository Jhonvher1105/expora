import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "../components/cssFile/temp.css";
import logo from "../components/pic/logo.png";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!email) {
            setErrorMessage("Please enter your email address.");
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrorMessage("Please enter a valid email address.");
            return;
        }

        try {
            setIsLoading(true);
            await sendPasswordResetEmail(auth, email);
            setSuccessMessage(
                "Password reset email sent! Please check your inbox (and spam folder) for instructions."
            );
            setEmail("");
        } catch (error) {
            console.error("Password reset error:", error);
            if (error.code === "auth/user-not-found") {
                setErrorMessage("No account found with this email address.");
            } else if (error.code === "auth/invalid-email") {
                setErrorMessage("Invalid email address. Please check and try again.");
            } else if (error.code === "auth/too-many-requests") {
                setErrorMessage(
                    "Too many requests. Please wait a few minutes before trying again."
                );
            } else {
                setErrorMessage(error?.message || "Failed to send reset email. Please try again.");
            }
        } finally {
            setIsLoading(false);
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
                    <h1>Reset your password</h1>
                    <p>Enter your email address and we'll send you a link to reset your password</p>
                </div>

                <form onSubmit={handleSubmit} className="landing-form">
                    <div className="form-group">
                        <label htmlFor="reset-email">
                            <Mail size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} />
                            Email address
                        </label>
                        <input
                            id="reset-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            autoComplete="email"
                            disabled={isLoading}
                        />
                    </div>

                    {errorMessage && (
                        <div className="error-message" style={{ color: "crimson", marginTop: 8, display: "flex", alignItems: "center", gap: "8px" }}>
                            <AlertCircle size={18} />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="error-message" style={{ color: "green", marginTop: 8, display: "flex", alignItems: "center", gap: "8px" }}>
                            <CheckCircle size={18} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="signin-btn landing-signin"
                        disabled={!email || isLoading}
                    >
                        {isLoading ? "Sending..." : "Send reset link"}
                    </button>

                    <div className="signup-text" style={{ textAlign: "center", marginTop: "16px" }}>
                        <Link to="/LogIn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "inherit", textDecoration: "none" }}>
                            <ArrowLeft size={16} />
                            Back to Sign in
                        </Link>
                    </div>
                </form>
            </div>

            <div className="footer-text">
                Remember your password? <Link to="/LogIn">Sign in</Link>
            </div>
        </div>
    );
}

export default ForgotPassword;

