import React from 'react';
import {AnimationOnScroll} from "react-animation-on-scroll"

export default function References() {
    return (
        <section className="section" id="references">
            <div>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                    <h1>👩🏽‍💻 References</h1>
                    <p>
                        Over the past years, I've gained experience in web development, including working as a
                        freelancer and working for Moravio, a web development company, for more than four years.
                    </p>

                    <p>
                        I have worked on various projects through my career. Some of them are:
                    </p>

                    <div className={'list-wrapper'}>
                        <ul>
                            <li><a href={'www.kaustaondrus.cz'}>kaustaondrus.cz</a></li>
                            <li><a href={'www.svx.cz'}>svx.cz</a></li>
                            <li><a href={'www.spanamo.com'}>spanamo.com</a></li>
                        </ul>
                        <ul>
                            <li><a href={'www.investor.kofola.cz'}>investor.kofola.cz</a></li>
                            <li><a href={'www.mujchlupac.cz'}>mujchlupac.cz</a></li>
                        </ul>
                    </div>
                </AnimationOnScroll>
            </div>
        </section>
    )
}
