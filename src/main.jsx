import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Login2 from './login2/LogIn2'
import Registration from './login2/Registration'
import "./firebaseTest";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <Login2/> */}
    <Registration/>
  </StrictMode>,
)
