import React, {useState} from 'react';
import './Navbar.css';

function Navbar() {
    const [click, setClick] = useState(false);

    const menuClick = () => setClick(!click);
    return(
        <div className="navbar-wrapper">
            <a href="#about-us" className="navbar-logo">
                    <img className="logo" src="images/logo-tmp.png" alt="logo"></img>
            </a>
            <nav className="navbar">
                <ul className="navbar-list">
                    <li className="navbar-item"><a href="#about-me" className="navbar-link">About me</a></li>
                    <li className="navbar-item"><a href="#education" className="navbar-link">Education</a></li>
                    <li className="navbar-item"><a href="#skills" className="navbar-link">Skills</a></li>
                    <a href="/"className="navbar-cta">Contact me</a>
                </ul>
            </nav>
        </div>
    )
}

export default Navbar