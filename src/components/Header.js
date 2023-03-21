import './Header.css';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFacebook, faLinkedin} from "@fortawesome/free-brands-svg-icons";

export default function Header() {
    return (
        <header id={'header'}>
            <div className={'header--content'}>
                <h1>👋 Hello, I am Alena Martinková</h1>
                <div>
                    <p> 👀 I am interested in web development, more and more in front-end</p>
                    <p> 🌱 I am currently learning TypeScript/React</p>
                    <p> 📫 You can reach me via <a href={'https://www.linkedin.com/in/alena-martinkova/'}>LinkedIn</a></p>
                </div>
            </div>

            <div className={'header--content'}>
                <a href="https://www.facebook.com/martinkova.a">
                    <FontAwesomeIcon className="fa" icon={faFacebook}/>
                </a>
                <a href="https://www.linkedin.com/in/alena-martinkova/">
                    <FontAwesomeIcon className="fa" icon={faLinkedin} />
                </a>
            </div>
        </header>
    );
}
  