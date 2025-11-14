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

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return <>
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <main className="hosting-type-main" onClick={(e) => e.stopPropagation()}>
                <article className="hosting-header">
                    <div className="hosting-header-content">
                        <h2 className="hosting-title">Select Hosting Type</h2>
                        <p className="hosting-subtitle">Choose the type of listing you want to create</p>
                    </div>
                    <button 
                        className="hosting-close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <img src={X} alt="close icon" />
                    </button>
                </article>
                <div className="hosting-type-buttons">
                    <button 
                        className="hosting-btn hosting-btn-home"
                        onClick={() => {
                            setShowAddProperty(true);
                            setShowAddService(false);
                            setShowAddExpirience(false);
                        }}
                        aria-label="Create a home listing"
                    >
                        <div className="hosting-btn-icon-wrapper">
                            <img src={homeIcon} alt="home icon" />
                        </div>
                        <h3 className="hosting-btn-title">Home</h3>
                        <p className="hosting-btn-description">Rent out your property</p>
                    </button>
                    <button 
                        className="hosting-btn hosting-btn-experience"
                        onClick={() => {
                            setShowAddExpirience(true);
                            setShowAddProperty(false);
                            setShowAddService(false);
                        }}
                        aria-label="Create an experience listing"
                    >
                        <div className="hosting-btn-icon-wrapper">
                            <img src={car} alt="car icon" />
                        </div>
                        <h3 className="hosting-btn-title">Experience</h3>
                        <p className="hosting-btn-description">Share unique activities</p>
                    </button>
                    <button 
                        className="hosting-btn hosting-btn-service"
                        onClick={() => {
                            setShowAddService(true);
                            setShowAddProperty(false);
                            setShowAddExpirience(false);
                        }}
                        aria-label="Create a service listing"
                    >
                        <div className="hosting-btn-icon-wrapper">
                            <img src={bell} alt="bell icon" />
                        </div>
                        <h3 className="hosting-btn-title">Service</h3>
                        <p className="hosting-btn-description">Offer your services</p>
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