import './App.css';
import React, {useEffect} from 'react';
import Header from "./components/Header";
import Content from "./components/Content";
import AOS from "aos";
import 'aos/dist/aos.css'

export default function App() {
    useEffect(() => {
        AOS.init();
    }, [])

    return (
        <>
            <Header />
            <Content />
        </>
    );
}
