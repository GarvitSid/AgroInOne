import React from 'react';
import Navbar from '../components/Navbar';
import List from '../components/marketplace/List';
import Header from '../components/marketplace/Header';

export default function Shop() {
  return (
    <>
      <Navbar />
      <br />
      <Header />
      <br />
      <List/>
    </>
  );
}

