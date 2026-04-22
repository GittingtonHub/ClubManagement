import '../styles/home.css';
import andresImage from '../assets/andres.jpg';
import ZainabImage from '../assets/zainab.jpg';
import WillImage from '../assets/will.jpg';
import JaviImage from '../assets/javi.jpg';
import Carousel from '../components/Carousel';

function Home() {
    const teamSlides = [
        { src: andresImage, alt: 'Andres Serna', caption: 'Andres Serna' },
        { src: ZainabImage, alt: 'Zainab Amir', caption: 'Zainab Amir' },
        { src: WillImage, alt: 'Will Mercer', caption: 'Will Mercer' },
        { src: JaviImage, alt: 'Javier Zavala', caption: 'Javier Zavala' }
    ];

    return (
        <>
            <div className='upcoming-events-section'>
                <Carousel items={teamSlides} title="Team highlights" />
            </div>

            <div className='about-us-section'>
                <div className='club-mission'>

                </div>

                <div className='club-awards'>

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
                                <p>Frontend Developer, Project Logistics</p>
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
                                <p>Database Architect</p>
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
                                <p>Documentation, Backend Junior Developer</p>
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
                                <p>Backend Developer, Web Hosting Specialist</p>
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
