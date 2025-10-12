import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import "./index.css";
import logo from "../pic/logo.png";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";


function LogIn2() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Sign in:", { email, password, rememberMe });

        if (!email || !password) {
            alert("Please fill in both email and password!");
            return;
        }

        // Firebase login
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Logged in successfully
                alert("Login successful!");
                console.log("User:", userCredential.user);
                navigate("/home")
            })
            .catch((error) => {
                console.error(error);
                alert("Login failed: " + error.message);
            });
    };

    return (
        <div className="container">
            <div className="card">

                <div className="div-logIn-logo">
                    <img src={logo} alt="expora logo" className="img-login-logo" />
                    <h2>Expora</h2>
                </div>


                <div className="welcome-text">
                    <h1>Welcome back</h1>
                    <p>Sign in to your Expora account</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-container">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
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

                    <button type="submit" className="signin-btn">
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
