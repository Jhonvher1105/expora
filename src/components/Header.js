
import logo from "./../pic/logo.png";

function header() {
    return <div>
        <header>
            <div>
                <img src={logo} alt="menu" id="logo"></img>
            </div>
                <h2>Expora</h2>
            <p>UserName</p>
            <a href="/WebSystemProject/projectV1/htmlfile/userHtml/userProfilePage.html"><img src="/pic/iconimage/user.png" alt="pic"></img>
            </a>
        </header>
    </div>;
}
export default header;