import React, {useEffect} from 'react';
import {AnimationOnScroll} from "react-animation-on-scroll";
import {Splide, SplideSlide} from "@splidejs/react-splide";
import '@splidejs/react-splide/css'

export default function Skills() {
    useEffect(() => {
        function setDynamicHeight(stickySectionSelector, contentSelector) {
            const stickySections = document.querySelectorAll(stickySectionSelector);

            stickySections.forEach((stickySection) => {
                const content = stickySection.querySelector(contentSelector);
                const contentHeight = content.offsetHeight;

                stickySection.style.height = `${contentHeight}px`;

                window.addEventListener('resize', () => {
                    const newContentHeight = content.offsetHeight;
                    stickySection.style.height = `${newContentHeight}px`;
                });
            });
        }

        setDynamicHeight('#skills', '.content-skills');

    }, []);

    return (
        <section className="section" id="skills">
            <div className={'content-skills'}>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                   <h1>👩🏽‍💻 Skills</h1>
                   <p>
                       I'm well-versed in various programming languages and technologies, including HTML, CSS, JavaScript, React, and PHP.
                       I'm always eager to learn new skills and stay up-to-date with the latest trends.
                   </p>

                    <div className={'carousel-wrapper'}>
                        <Splide
                            options={{
                                rewind: true,
                                gap   : '1rem',
                                width : 300,
                                height: 200,
                                autoplay: true
                            }}>
                            <SplideSlide>
                                <img src={'images/php.png'} alt={'php'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/react.png'} alt={'react'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/html.png'} alt={'html'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/css.png'} alt={'css'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/js.png'} alt={'js'}/>
                            </SplideSlide>
                        </Splide>
                    </div>

                    <p>
                        Other than programming skills, I have a strong grasp of soft skills, Scrum, Agile development, and Jira.
                        Effective communication, teamwork, and time management allow me to collaborate efficiently, while Scrum
                        and Agile methodologies provide a framework for organizing projects.
                    </p>
                </AnimationOnScroll>
           </div>
        </section>
    )
}
