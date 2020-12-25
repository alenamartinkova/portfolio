import React, {useState} from 'react';
import './AboutMe.css';


function AboutMe() {
    return (
        <section className="section" id="about-me">
            <div className="row-wrapper">
                <div className="row">
                    <div className="col-8">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum eget nulla malesuada, ornare risus in, porta elit. Phasellus in placerat risus. Pellentesque aliquet arcu nunc, quis bibendum ligula placerat ac. Praesent sit amet ligula varius, bibendum orci vel, ultrices diam. In tristique aliquet sapien. Phasellus facilisis libero felis, vel imperdiet sem vestibulum sed. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Suspendisse auctor vestibulum fringilla. Mauris id nulla vestibulum, tincidunt ante efficitur, tempor ante. Duis eget felis turpis. Integer accumsan ullamcorper semper. Suspendisse neque velit, imperdiet vel dictum eu, consectetur sed nisi. Ut ornare tempor lorem, et molestie eros faucibus vitae. Nam eu iaculis turpis. Suspendisse et dolor sapien. Morbi porta sem vel erat lacinia, vitae pretium justo consequat.

    Aliquam mollis vel arcu vel sagittis. Nam euismod sapien at mi lobortis gravida. Vestibulum at metus quam. Donec id justo leo. Fusce in convallis dolor. Nulla ultrices lectus et nibh imperdiet tempus. Fusce vulputate tristique dolor ac interdum. Nulla faucibus ultrices metus. Quisque convallis euismod condimentum. Mauris ac erat eu leo elementum scelerisque sed nec elit. Aliquam eu iaculis lacus. Fusce condimentum odio sem, vel egestas nunc tincidunt at. Duis non ex ante. Integer viverra tortor vel tortor vestibulum, non luctus ligula vestibulum. Quisque ac posuere leo. Donec eget mattis erat, vitae lobortis enim.
                    </div>
                    <div className="col-4">
                        <div className="image">
                            <img src="images/me.jpg" alt="me"></img>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
export default AboutMe