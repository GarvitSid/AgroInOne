import React from 'react';
import Crop from "../components/buy/Crop/Crop";
import { Container } from 'react-bootstrap';
import Header from '../components/buy/Header/Header';
const Homepage = () => {
    return (
        <div>
            <Header />
            <br />
            <Container>
             <Crop />
            </Container>
        </div>
    );
};
export default Homepage;
