import './Header.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faLinkedin } from "@fortawesome/free-brands-svg-icons";

export default function Header() {
    return (
        <header id={'header'}>
            <div className={'header--content header--content__intro'}>
                <h1>👋 Hello, I am Alena Martinková</h1>
                <div>
                    <p> 👀 I am full stack web developer, more inclined to front-end development</p>
                    <p> 💻 I am currently improving my skills in JavaScript frameworks</p>
                </div>
            </div>

            <div className={'header--content header--content__buttons'}>
                <a href={'mailto:martinkova.a@gmail.com'} className={'button-primary'}>
                    Contact me!
                </a>
                <a href={'https://www.facebook.com/martinkova.a'}>
                    <FontAwesomeIcon className="fa" icon={faFacebook}/>
                </a>
                <a href={'https://www.linkedin.com/in/alena-martinkova/'}>
                    <FontAwesomeIcon className="fa" icon={faLinkedin} />
                </a>
            </div>
        </header>
    );
}
  