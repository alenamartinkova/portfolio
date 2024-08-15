import React from 'react';
import {AnimationOnScroll} from "react-animation-on-scroll"

export default function References() {
    return (
        <section className="section" id="references">
            <div className={'content'}>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                    <h1>👩🏽‍💻 References</h1>
                    <p>
                        Over the past years, I've gained experience in web development, including working as a
                        freelancer and working for Moravio, a web development company, for more than four years.
                        Currently I am working on E-Sport software for CS2 - <strong>rankacy.com</strong>.
                    </p>

                    <p>
                        I have worked on various projects through my career. Some of them are:
                    </p>

                    <div className={'list-wrapper'}>
                        <ul>
                            <li><a target='_blank' href={'https://www.kaustaondrus.cz'}>kaustaondrus.cz</a></li>
                            <li><a target='_blank' href={'https://www.svx.cz'}>svx.cz</a></li>
                            <li><a target='_blank' href={'https://www.stamaco.cz'}>stamaco.cz</a></li>
                            <li><a target='_blank' href={'https://www.tiketo.eu'}>tiketo.eu</a></li>
                            {/*<li><a href={'https://www.spanamo.com'}>spanamo.com</a></li>*/}
                        </ul>
                        <ul>
                            <li><a target='_blank' href={'https://investor.kofola.cz'}>investor.kofola.cz</a></li>
                            <li><a target='_blank' href={'https://www.mujchlupac.cz'}>mujchlupac.cz</a></li>
                            <li><a target='_blank' href={'https://www.rekap.online'}>rekap.online</a></li>
                            <li><a target='_blank' href={'https://www.rankacy.com'}>rankacy.com</a></li>
                        </ul>
                    </div>
                </AnimationOnScroll>
            </div>
        </section>
    )
}
