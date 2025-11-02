import { useState } from "react"

import homeIcon from "../pic/icon/house.svg"
import car from "../pic/icon/car.svg"
import bell from "../pic/icon/bell.svg"
import X from "../pic/icon/x.svg"

import "../../components/cssFile/temp.css"

import AddProperty from "../ui/AddProperty";
import AddService from "../ui/AddService"

export default function HostingType() {

    const [showAddProperty, setShowAddProperty] = useState(false);
    const [showAddService, setShowAddService] = useState(false);

    return <>
        <div className="modal-overlay">
            <main className="hosting-type-main">
                <article className="hosting-header">
                    <h2>Select Hosting Type</h2>
                    <button className="close-btn">
                        <img src={X} alt="close icon" />
                    </button>
                </article>
                <div className="hosting-type-buttons">
                    <button className="hosting-btn"
                        onClick={() => {
                            setShowAddProperty(true);
                            setShowAddService(false);
                        }}>
                        <img src={homeIcon} alt="home icon" />
                        <h2>Home</h2>
                    </button>
                    <button className="hosting-btn">
                        <img src={car} alt="car icon" />
                        <h2>Expirience</h2>
                    </button>
                    <button className="hosting-btn" onClick={() => {
                        setShowAddService(true);
                        setShowAddProperty(false);
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
                        onClose={() => setShowAddService(false)}/>
                </div>
            </div>
        )}
    </>
}