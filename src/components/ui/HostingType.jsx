import { useState } from "react"

import homeIcon from "../pic/icon/house.svg"
import car from "../pic/icon/car.svg"
import bell from "../pic/icon/bell.svg"
import X from "../pic/icon/x.svg"

import "../../components/cssFile/temp.css"

import AddProperty from "../ui/AddProperty";
import AddService from "../ui/AddService"
import AddExpirience from "../ui/AddExpirience"

export default function HostingType({onClose}) {

    const [showAddProperty, setShowAddProperty] = useState(false);
    const [showAddService, setShowAddService] = useState(false);
    const [showAddExpirience, setShowAddExpirience] = useState(false);

    return <>
        <div className="modal-overlay">
            <main className="hosting-type-main">
                <article className="hosting-header">
                    <h2>Select Hosting Type</h2>
                    <button className="close-btn"
                    onClick={onClose}>
                        <img src={X} alt="close icon" />
                    </button>
                </article>
                <div className="hosting-type-buttons">
                    <button className="hosting-btn"
                        onClick={() => {
                            setShowAddProperty(true);
                            setShowAddService(false);
                            setShowAddExpirience(false);
                        }}>
                        <img src={homeIcon} alt="home icon" />
                        <h2>Home</h2>
                    </button>
                    <button className="hosting-btn"
                        onClick={() => {
                            setShowAddExpirience(true);
                            setShowAddProperty(false);
                            setShowAddService(false);
                        }}>
                        <img src={car} alt="car icon" />
                        <h2>Expirience</h2>
                    </button>
                    <button className="hosting-btn" onClick={() => {
                        setShowAddService(true);
                        setShowAddProperty(false);
                        setShowAddExpirience(false);
                    }}>
                        <img src={bell} alt="bell icon" />
                        <h2>Service</h2>
                    </button>
                </div>
            </main>

        </div>
        {showAddProperty && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add property form">
                <div className="modal host-modal" onClick={e => e.stopPropagation()}>
                    <AddProperty
                        onClose={() => setShowAddProperty(false)}
                        onPropertyCreated={(data) => {
                            console.log('Property created:', data);
                            setShowAddProperty(false);
                            // You can add a success notification here
                        }}
                    />

                </div>
            </div>
        )}

        {showAddService && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add service form">
                <div className="modal host-modal" onClick={e => e.stopPropagation()}>
                    <AddService
                        onClose={() => setShowAddService(false)}
                        onServiceCreated={(data) => {
                            console.log('Service created:', data);
                            setShowAddService(false);
                            // You can add a success notification here
                        }}/>
                </div>
            </div>
        )}

        {showAddExpirience && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add expirience form">
                <div className="modal host-modal" onClick={e => e.stopPropagation()}>
                    <AddExpirience
                        onExperienceCreated={(data) => console.log('Created:', data)}
                        onClose={() => setShowAddExpirience(false)}/>
                </div>
            </div>
        )}
    </>
}