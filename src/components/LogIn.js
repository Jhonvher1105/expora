import logo from "../pic/logo.png";

function logIn() {
    return (
        <div class="logIn-body">
            <main class="login-main">
                <div class="div-logIn-logo">
                    <img src={logo} alt="expora logo" class="img-login-logo" />
                    <h2>Expora</h2>
                </div>
                <div class="div-form-container">
                    <h2>Welcome back</h2>
                    <p>Sign in to your Expora account</p>
                </div>
                <div class="div-form">
                    <form>
                        <div class="div-email">
                            <label htmlFor="email">Email address</label>
                            <input
                                type="text"
                                class="email"
                                id="email"
                                name="email"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <div class="div-pass">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                class="password"
                                id="password"
                                name="password"
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        <input type="button" value="submit"></input>
                    </form>
                    
                    <div class="div-forget-Pass">
                        <p>
                            <a href="/">Forgot your password?</a>
                        </p>
                        <p>
                            Don't have an account? <a href="/">Sign up</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default logIn;