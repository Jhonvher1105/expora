import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { auth } from "../firebase";
import { applyActionCode, verifyBeforeUpdateEmail, reload } from "firebase/auth";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import logo from "../components/pic/logo.png";
import "./index.css";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const uid = searchParams.get("uid");
  const email = searchParams.get("email");
  const oobCode = searchParams.get("oobCode"); // Firebase action code

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // If we have a Firebase action code, use it
        if (oobCode) {
          await applyActionCode(auth, oobCode);
          setStatus("success");
          setMessage("Email verified successfully! You can now sign in.");
          
          // Reload user to update emailVerified status
          if (auth.currentUser) {
            await reload(auth.currentUser);
          }
          
          setTimeout(() => {
            navigate("/LogIn");
          }, 3000);
          return;
        }

        // If we have UID and email, verify manually
        if (uid && email) {
          // Check if user is logged in
          if (auth.currentUser && auth.currentUser.uid === uid) {
            // Reload user to check verification status
            await reload(auth.currentUser);
            
            if (auth.currentUser.emailVerified) {
              setStatus("success");
              setMessage("Email verified successfully! You can now continue with your registration.");
              setTimeout(() => {
                navigate("/Registration");
              }, 2000);
            } else {
              setStatus("error");
              setMessage("Email verification failed. Please try again or request a new verification email.");
            }
          } else {
            // User not logged in, redirect to login
            setStatus("error");
            setMessage("Please sign in first, then verify your email.");
            setTimeout(() => {
              navigate("/LogIn");
            }, 3000);
          }
        } else {
          setStatus("error");
          setMessage("Invalid verification link. Please request a new verification email.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        
        if (error.code === "auth/invalid-action-code") {
          setMessage("This verification link has expired or is invalid. Please request a new one.");
        } else if (error.code === "auth/expired-action-code") {
          setMessage("This verification link has expired. Please request a new verification email.");
        } else {
          setMessage(error.message || "An error occurred during verification. Please try again.");
        }
      }
    };

    verifyEmail();
  }, [uid, email, oobCode, navigate]);

  return (
    <div className="landing-page">
      <div className="landing-card" style={{ maxWidth: "500px" }}>
        <div className="div-logIn-logo landing-logo">
          <img src={logo} alt="expora logo" className="img-login-logo" />
          <h2 className="logo-text">ExporaBnB</h2>
        </div>

        <div className="welcome-text" style={{ textAlign: "center", padding: "40px 0" }}>
          {status === "verifying" && (
            <>
              <Loader size={48} className="spinner" style={{ margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
              <h1 style={{ marginBottom: "16px" }}>Verifying Your Email</h1>
              <p style={{ color: "#666" }}>Please wait while we verify your email address...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle size={48} style={{ margin: "0 auto 20px", color: "#10b981" }} />
              <h1 style={{ marginBottom: "16px", color: "#10b981" }}>Email Verified!</h1>
              <p style={{ color: "#666", marginBottom: "24px" }}>{message}</p>
              <Link to="/LogIn" className="signin-btn landing-signin" style={{ display: "inline-block", textDecoration: "none" }}>
                Go to Sign In
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle size={48} style={{ margin: "0 auto 20px", color: "#ef4444" }} />
              <h1 style={{ marginBottom: "16px", color: "#ef4444" }}>Verification Failed</h1>
              <p style={{ color: "#666", marginBottom: "24px" }}>{message}</p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link to="/Registration" className="signin-btn landing-signin" style={{ display: "inline-block", textDecoration: "none" }}>
                  Back to Registration
                </Link>
                <Link to="/LogIn" className="signin-btn landing-signin" style={{ display: "inline-block", textDecoration: "none", background: "#6b7280" }}>
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default VerifyEmail;

