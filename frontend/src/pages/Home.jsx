import '../styles/home.css';
import Carousel from '../components/Carousel';

function Home() {
    return (
        <>
            <div className='upcoming-events-section'>
                <Carousel title="Upcoming events" />
            </div>

            <div className='about-us-section'>
                <div className='club-mission'>
                    <h1>About Us</h1>
                    <p>
                        Founded with the vision of creating unforgettable nightlife experiences, our club blends high
                        energy entertainment with a premium atmosphere. We specialize in hosting themed events, live
                        DJ performances, and exclusive reservation based experiences that cater to a diverse and
                        vibrant community.
                    </p>
                    <p>
                        Our team is dedicated to delivering seamless service, from ticketing and reservations to in
                        venue experiences. Whether you&apos;re attending for the music, the ambiance, or a special
                        celebration, we aim to provide a night that is both exciting and memorable.
                    </p>
                    <p>
                        With a focus on innovation and customer experience, we continue to evolve our events and
                        services to meet the expectations of modern nightlife. Every event is designed to bring people
                        together, create lasting memories, and showcase top tier talent!
                    </p>
                </div>

                <div className='club-awards'>
                    <h1>Awards</h1>
                    <div className="awards-grid">
                        <div className="award-card">Best Nightlife Experience - City Events Magazine</div>
                        <div className="award-card">Top Event Venue for Live DJs - Entertainment Weekly Local Awards</div>
                        <div className="award-card">Excellence in Customer Experience - Hospitality &amp; Leisure Awards</div>
                        <div className="award-card">Most Innovative Event Programming - Urban Nightlife Association</div>
                    </div>
                </div>
            </div>

            <div className="contact-section">
                <h1>Meet the Team</h1>
                
                <div className="row">
                    <div className="column">
                        <div className="card">
                            {/* <img src={andresImage} alt="Andres Serna" style={{ width: "100%" }} /> */}
                            <div className="container">
                                <h2>Andres Serna</h2>
                                <p>Club Owner</p>
                                <p>aserna11@stedwards.edu</p>
                                <p>
                                <button
                                    type="button"
                                    className="button"
                                    onClick={() => (window.location.href = "mailto:aserna11@stedwards.edu")}
                                >
                                    Contact
                                </button>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="column">
                        <div className="card">
                            {/* <img src={ZainabImage} alt="Zainab Amir" style={{ width: "100%" }} /> */}
                            <div className="container">
                                <h2>Zainab Amir</h2>
                                <p>Entertainment Coordinator</p>
                                <p>zamir@stedwards.edu</p>
                                <p>
                                <button
                                    type="button"
                                    className="button"
                                    onClick={() => (window.location.href = "mailto:zamir@stedwards.edu")}
                                >
                                    Contact
                                </button>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="column">
                        <div className="card">
                            {/* <img src={WillImage} alt="Will Mercer" style={{ width: "100%" }} /> */}
                            <div className="container">
                                <h2>Will Mercer</h2>
                                <p>Head of Security</p>
                                <p>wmercer1@stedwards.edu</p>
                                <p>
                                <button
                                    type="button"
                                    className="button"
                                    onClick={() => (window.location.href = "mailto:wmercer1@stedwards.edu")}
                                >
                                    Contact
                                </button>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="column">
                        <div className="card">
                            {/* <img src={JaviImage} alt="Javier Zavala" style={{ width: "100%" }} /> */}
                            <div className="container">
                                <h2>Javier Zavala</h2>
                                <p>Talent Booking</p>
                                <p>jzaval10@stedwards.edu</p>
                                <p>
                                <button
                                    type="button"
                                    className="button"
                                    onClick={() => (window.location.href = "mailto:jzaval10@stedwards.edu")}
                                >
                                    Contact
                                </button>
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

export default Home;
