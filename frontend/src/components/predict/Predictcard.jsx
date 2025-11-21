import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';
import '../Schemecard.css';
import Container from 'react-bootstrap/Container';
import cropImg from '../../images/veggies.jpg';
import loanImg from '../../images/farmer.jpg';

export default function Predictcard() {
  return (
    <Container>
      <article className="postcard dark blue">
        <Link className="postcard__img_link" to="/predict/crop">
          <img className="postcard__img" src={cropImg} alt="Crop Yield Prediction" />
        </Link>
        <div className="postcard__text">
          <h1 className="postcard__title blue">
            <Link to="/predict/crop">Crop Yield Prediction</Link>
          </h1>
          <div className="postcard__subtitle small"></div>
          <div className="postcard__bar"></div>
          <div className="postcard__preview-txt">
            Crop yield prediction is a crucial aspect of agriculture and plays a significant role in food security and supply chain management. By utilizing various technologies and data analysis techniques, it is possible to predict the expected crop yield for a particular region or farm, based on factors such as weather patterns, soil health, and historical production data. Accurate crop yield prediction can help farmers and agribusinesses make informed decisions.
          </div>
          <ul className="postcard__tagbox">
            <li className="tag__item play blue">
              <Link to="/predict/crop">Check Here</Link>
            </li>
          </ul>
        </div>
      </article>
      <article className="postcard dark red">
        <Link className="postcard__img_link" to="/predict/loan">
          <img className="postcard__img" src={loanImg} alt="Loan Approval Prediction" />	
        </Link>
        <div className="postcard__text">
          <h1 className="postcard__title red">
            <Link to="/predict/loan">Loan Approval Prediction</Link>
          </h1>
          <div className="postcard__subtitle small"></div>
          <div className="postcard__bar"></div>
          <div className="postcard__preview-txt">
            Loan approval prediction is a critical task for financial institutions to determine the creditworthiness of loan applicants. By leveraging machine learning and data analysis techniques, it is possible to predict the likelihood of loan approval based on a variety of factors such as credit history, income, debt-to-income ratio, and employment status. Accurate loan approval prediction can help lenders make informed decisions and reduce the risk of default and financial loss.
          </div>
          <ul className="postcard__tagbox">
            <li className="tag__item play red">
              <Link to="/predict/loan">Check Here</Link>
            </li>
          </ul>
        </div>
      </article>
    </Container>
  );
}

