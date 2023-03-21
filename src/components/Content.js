import './Content.css';
import Me from "./Me";
import AboutMe from "./AboutMe";
import Education from "./Education";
import Skills from "./Skills";
export default function Content () {
    return (
        <main className={'main'}>
            <Me />
            <AboutMe />
            <Education />
            <Skills />
        </main>
    )
}