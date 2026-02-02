import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';
import '../Schemecard.css';
import Container from 'react-bootstrap/Container';
import cropImg from '../../images/veggies.jpg';

export default function Predictcard() {
  return (
    <Container>
      <article className="postcard dark blue">
        <Link className="postcard__img_link" to="/predict/crop">
          <img className="postcard__img" src={cropImg} alt="Crop Yield Prediction & Advisory" />
        </Link>
        <div className="postcard__text">
          <h1 className="postcard__title blue">
            <Link to="/predict/crop">Crop Yield Prediction & Proactive Advisory</Link>
          </h1>
          <div className="postcard__subtitle small"></div>
          <div className="postcard__bar"></div>
          <div className="postcard__preview-txt">
            Crop yield prediction and agro-climatic advisory is a crucial aspect of agriculture and plays a significant role in food security and farm economics. By utilizing machine learning across soil nutrients, environmental parameters, and historical production data, it recommends the top suitable crops and forecasts yield (in Tonnes/Hectare) to help farmers make informed, high-yield decisions.
          </div>
          <ul className="postcard__tagbox">
            <li className="tag__item play blue">
              <Link to="/predict/crop">Check Here</Link>
            </li>
          </ul>
        </div>
      </article>
    </Container>
  );
}

