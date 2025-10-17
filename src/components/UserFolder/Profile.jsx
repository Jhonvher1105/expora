import { db } from '../../firebase';

import '../cssFile/temp.css'
import Header from './Header';
import profile from '../pic/profile.jpg';
import edit from '../pic/edit.png';

function Profile() {
    return (
        <>
            <Header />
            <div className='profile_Body'>
                <div className='profile_containter'>
                    <img src={profile} className="logo" alt="Profile"/>
                    <button className='editBtn'><img src={edit} alt="" className='editBtn_img'/> Edit Profile</button>
                </div>
                <div className="user_info_container">

                </div>
            </div>
        </>
    );
}
export default Profile;