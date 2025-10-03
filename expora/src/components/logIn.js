import logo from "../pic/logo.png";

function logIn() {
    return <div id="logIn-body">
        <div>
            <main id="login-main">
                <div id="div-logIn-logo">
                    <img src={logo} alt="expora logo" id="img-login-logo"></img>
                    <h2>Expora</h2>
                </div>
                <div id="div-form-container">
                    <h2>Welcome back</h2>
                    <p>Sign in to your Expora account</p>
                    <div id="#div-form">
                        <form>
                            <labe>Email address</labe>
                            <input type="text" id="email" name="email" placeholder="Enter your email" required></input>

                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" placeholder="Enter your password" required></input>
                        </form>
                        <div id="div-forget-Pass">
                            <p><a href="/">Forgot your password?</a></p>
                            <p>Don't have an account? <a href="/">Sign up</a></p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    </div>
}
export default logIn;