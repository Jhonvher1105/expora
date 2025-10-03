import logo from './logo.svg';
import './App.css';
import header from './components/header.js';
import logIn from "./components/logIn.js";

function App() {
  return (
    <div className="App">
      {/* {header()} */}
      {logIn()}
    </div>
  );
}

export default App;
