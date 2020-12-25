import React, {useState} from 'react';
import './Footer.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook } from "@fortawesome/free-brands-svg-icons"
import { faLinkedin } from "@fortawesome/free-brands-svg-icons"


function Footer() {
    return (
        <footer id="footer">
            <div className="row-wrapper row-wrapper-footer">
                <div className="row">
                    <div className="col-12 flex">
                        <div className="footer-left">
                            <p>AM &copy; | 2020 </p>
                        </div>
                        <div className="footer-icons">
                            <ul className="footer-list">
                                <li>
                                    <a href="https://www.facebook.com/martinkova.a">
                                        <FontAwesomeIcon className="fa" icon={faFacebook}/>
                                    </a>
                                </li>
                                <li>
                                    <a href="https://www.linkedin.com/in/alena-martinkova/">      
                                        <FontAwesomeIcon className="fa" icon={faLinkedin} />
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
export default Footer