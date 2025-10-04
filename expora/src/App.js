import './App.css';
import header from './components/header.js';
import logIn from "./components/logIn.js";
import logIn2 from "./login2/logIn2.jsx";

function App() {
  return (
    <div className="App">
      {/* {header()} */}
      {/* {logIn()} */}
      {logIn2()}
    </div>
  );
}

export default App;
