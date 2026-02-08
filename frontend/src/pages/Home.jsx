import '../styles/about.css';

function Home() {
    return (
        <>
            <div className="about-section">
                <h1>About Us Page</h1>
                <p>Some text about who we are and what we do.</p>
                <p>Resize the browser window to see that this page is responsive by the way.</p>

                <h2 style={{ textAlign: "center" }}>Our Team</h2>
                
                <div className="row">
                    <div className="column">
                        <div className="card">
                            <img src="frontend/src/assets/andres.jpg" alt="Andres Serna" style={{ width: "100%" }} />
                            <div className="container">
                                <h2>Andres Serna</h2>
                                <p className="title">Title</p>
                                <p>Some text that describes me lorem ipsum ipsum lorem.</p>
                                <p>jane@example.com</p>
                                <p><button className="button">Contact</button></p>
                            </div>
                        </div>
                    </div>

                    <div className="column">
                        <div className="card">
                            <img src="frontend/src/assets/andres.jpg" alt="Andres Serna" style={{ width: "100%" }} />
                            <div className="container">
                                <h2>Andres Serna</h2>
                                <p className="title">Title</p>
                                <p>Some text that describes me lorem ipsum ipsum lorem.</p>
                                <p>jane@example.com</p>
                                <p><button className="button">Contact</button></p>
                            </div>
                        </div>
                    </div>

                    <div className="column">
                        <div className="card">
                            <img src="frontend/src/assets/andres.jpg" alt="Andres Serna" style={{ width: "100%" }} />
                            <div className="container">
                                <h2>Andres Serna</h2>
                                <p className="title">Title</p>
                                <p>Some text that describes me lorem ipsum ipsum lorem.</p>
                                <p>jane@example.com</p>
                                <p><button className="button">Contact</button></p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

export default Home;