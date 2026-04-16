import os
import logging
from datetime import datetime, timezone
from database import db

logger = logging.getLogger(__name__)

async def seed_colleges():
    colleges = [
        {"name": "Duke University", "location": "Durham, NC", "state": "North Carolina", "division": "Division I", "conference": "ACC", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships available. Strong international student support.", "acceptance_rate": "6%", "notable_alumni": "Zion Williamson, Grant Hill", "ranking": 1, "website": "https://goduke.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Jon Scheyer", "title": "Head Coach", "email": "jscheyer@duke.edu", "phone": "+1-919-613-7500"}]},
        {"name": "University of Kentucky", "location": "Lexington, KY", "state": "Kentucky", "division": "Division I", "conference": "SEC", "foreign_friendly": True, "scholarship_info": "Full scholarships. International student office provides dedicated support.", "acceptance_rate": "95%", "notable_alumni": "Anthony Davis, John Wall", "ranking": 2, "website": "https://ukathletics.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "John Calipari", "title": "Head Coach", "email": "jcalipari@uky.edu", "phone": "+1-859-257-3838"}]},
        {"name": "University of Kansas", "location": "Lawrence, KS", "state": "Kansas", "division": "Division I", "conference": "Big 12", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. History of recruiting international talent.", "acceptance_rate": "88%", "notable_alumni": "Andrew Wiggins, Joel Embiid", "ranking": 3, "website": "https://kuathletics.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Bill Self", "title": "Head Coach", "email": "bself@ku.edu", "phone": "+1-785-864-3151"}]},
        {"name": "Gonzaga University", "location": "Spokane, WA", "state": "Washington", "division": "Division I", "conference": "WCC", "foreign_friendly": True, "scholarship_info": "Very international-friendly. Multiple foreign players each year.", "acceptance_rate": "71%", "notable_alumni": "Adam Morrison, Kelly Olynyk", "ranking": 4, "website": "https://gozags.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Mark Few", "title": "Head Coach", "email": "mfew@gonzaga.edu", "phone": "+1-509-313-4220"}]},
        {"name": "University of North Carolina", "location": "Chapel Hill, NC", "state": "North Carolina", "division": "Division I", "conference": "ACC", "foreign_friendly": True, "scholarship_info": "Full scholarships available. Strong academic support for international students.", "acceptance_rate": "24%", "notable_alumni": "Michael Jordan, Vince Carter", "ranking": 5, "website": "https://goheels.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Hubert Davis", "title": "Head Coach", "email": "hdavis@unc.edu", "phone": "+1-919-962-2117"}]},
        {"name": "Villanova University", "location": "Villanova, PA", "state": "Pennsylvania", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Scholarships available. Dedicated international student resources.", "acceptance_rate": "26%", "notable_alumni": "Kris Jenkins, Mikal Bridges", "ranking": 6, "website": "https://villanova.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Kyle Neptune", "title": "Head Coach", "email": "kneptune@villanova.edu", "phone": "+1-610-519-4120"}]},
        {"name": "Michigan State University", "location": "East Lansing, MI", "state": "Michigan", "division": "Division I", "conference": "Big Ten", "foreign_friendly": True, "scholarship_info": "Full scholarships. International friendly environment.", "acceptance_rate": "76%", "notable_alumni": "Magic Johnson, Draymond Green", "ranking": 7, "website": "https://msuspartans.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Tom Izzo", "title": "Head Coach", "email": "izzo@msu.edu", "phone": "+1-517-355-1623"}]},
        {"name": "Arizona University", "location": "Tucson, AZ", "state": "Arizona", "division": "Division I", "conference": "Pac-12", "foreign_friendly": True, "scholarship_info": "Strong scholarship program for international athletes.", "acceptance_rate": "85%", "notable_alumni": "Deandre Ayton, Jason Terry", "ranking": 8, "website": "https://arizonawildcats.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Tommy Lloyd", "title": "Head Coach", "email": "tlloyd@arizona.edu", "phone": "+1-520-621-4102"}]},
        {"name": "Connecticut University (UConn)", "location": "Storrs, CT", "state": "Connecticut", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Actively recruits international players. Full scholarships available.", "acceptance_rate": "56%", "notable_alumni": "Ray Allen, Kemba Walker", "ranking": 9, "website": "https://uconnhuskies.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Dan Hurley", "title": "Head Coach", "email": "dhurley@uconn.edu", "phone": "+1-860-486-2723"}]},
        {"name": "Purdue University", "location": "West Lafayette, IN", "state": "Indiana", "division": "Division I", "conference": "Big Ten", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. Strong STEM-focused international support.", "acceptance_rate": "67%", "notable_alumni": "E'Twaun Moore, Robbie Hummel", "ranking": 10, "website": "https://purduesports.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Matt Painter", "title": "Head Coach", "email": "mpainter@purdue.edu", "phone": "+1-765-494-3220"}]},
        {"name": "Creighton University", "location": "Omaha, NE", "state": "Nebraska", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Welcomes international players. Strong Jesuit educational environment.", "acceptance_rate": "76%", "notable_alumni": "Kyle Korver, Doug McDermott", "ranking": 11, "website": "https://gocreighton.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Greg McDermott", "title": "Head Coach", "email": "gmcdermott@creighton.edu", "phone": "+1-402-280-2720"}]},
        {"name": "Baylor University", "location": "Waco, TX", "state": "Texas", "division": "Division I", "conference": "Big 12", "foreign_friendly": False, "scholarship_info": "Full scholarships. Limited international scholarship history.", "acceptance_rate": "38%", "notable_alumni": "Brittney Griner, Scott Drew", "ranking": 12, "website": "https://baylorbears.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Scott Drew", "title": "Head Coach", "email": "sdrew@baylor.edu", "phone": "+1-254-710-3030"}]},
        {"name": "UCLA", "location": "Los Angeles, CA", "state": "California", "division": "Division I", "conference": "Pac-12", "foreign_friendly": True, "scholarship_info": "Strong international student support. Academic excellence.", "acceptance_rate": "12%", "notable_alumni": "Kareem Abdul-Jabbar, Bill Walton", "ranking": 13, "website": "https://uclabruins.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Mick Cronin", "title": "Head Coach", "email": "mcronin@ucla.edu", "phone": "+1-310-825-8699"}]},
        {"name": "Ohio State University", "location": "Columbus, OH", "state": "Ohio", "division": "Division I", "conference": "Big Ten", "foreign_friendly": True, "scholarship_info": "Full scholarships available. Strong big-school resources.", "acceptance_rate": "54%", "notable_alumni": "Evan Turner, Mike Conley Jr.", "ranking": 14, "website": "https://ohiostatebuckeyes.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Jake Diebler", "title": "Head Coach", "email": "jdiebler@osu.edu", "phone": "+1-614-292-1033"}]},
        {"name": "Indiana University", "location": "Bloomington, IN", "state": "Indiana", "division": "Division I", "conference": "Big Ten", "foreign_friendly": False, "scholarship_info": "Full athletic scholarships. Traditional basketball powerhouse.", "acceptance_rate": "82%", "notable_alumni": "Isiah Thomas, Victor Oladipo", "ranking": 15, "website": "https://iuhoosiers.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Mike Woodson", "title": "Head Coach", "email": "mwoodson@indiana.edu", "phone": "+1-812-855-2138"}]},
        {"name": "St. John's University", "location": "Queens, NY", "state": "New York", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Strong NYC recruiting. Very welcoming to international students.", "acceptance_rate": "63%", "notable_alumni": "Chris Mullin, Mark Jackson", "ranking": 16, "website": "https://redstormsports.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Rick Pitino", "title": "Head Coach", "email": "rpitino@stjohns.edu", "phone": "+1-718-990-6367"}]},
        {"name": "Louisville University", "location": "Louisville, KY", "state": "Kentucky", "division": "Division I", "conference": "ACC", "foreign_friendly": True, "scholarship_info": "Full scholarships. Actively recruits internationally.", "acceptance_rate": "68%", "notable_alumni": "Donovan Mitchell, Darrell Griffith", "ranking": 17, "website": "https://gocards.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Pat Kelsey", "title": "Head Coach", "email": "pkelsey@louisville.edu", "phone": "+1-502-852-5732"}]},
        {"name": "Tennessee University", "location": "Knoxville, TN", "state": "Tennessee", "division": "Division I", "conference": "SEC", "foreign_friendly": False, "scholarship_info": "Full scholarships. Some international players historically.", "acceptance_rate": "67%", "notable_alumni": "Grant Williams, Jordan Bone", "ranking": 18, "website": "https://utsports.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Rick Barnes", "title": "Head Coach", "email": "rbarnes@utk.edu", "phone": "+1-865-974-1212"}]},
        {"name": "Xavier University", "location": "Cincinnati, OH", "state": "Ohio", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Jesuit values support international students. Strong scholarship program.", "acceptance_rate": "69%", "notable_alumni": "Channing Frye, Jordan Crawford", "ranking": 19, "website": "https://goxavier.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Sean Miller", "title": "Head Coach", "email": "smiller@xavier.edu", "phone": "+1-513-745-3413"}]},
        {"name": "Marquette University", "location": "Milwaukee, WI", "state": "Wisconsin", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "History of international players. Catholic university with strong support.", "acceptance_rate": "84%", "notable_alumni": "Dwyane Wade, Doc Rivers", "ranking": 20, "website": "https://gomarquette.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Shaka Smart", "title": "Head Coach", "email": "ssmart@marquette.edu", "phone": "+1-414-288-7447"}]},
        {"name": "Butler University", "location": "Indianapolis, IN", "state": "Indiana", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Mid-major with excellent academics. International students welcome.", "acceptance_rate": "77%", "notable_alumni": "Shelvin Mack, Gordon Hayward", "ranking": 21, "website": "https://butlersports.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Thad Matta", "title": "Head Coach", "email": "tmatta@butler.edu", "phone": "+1-317-940-9375"}]},
        {"name": "San Diego State University", "location": "San Diego, CA", "state": "California", "division": "Division I", "conference": "Mountain West", "foreign_friendly": True, "scholarship_info": "Strong mid-major program. California sunshine and diverse student body.", "acceptance_rate": "37%", "notable_alumni": "Kawhi Leonard, Steve Fisher", "ranking": 22, "website": "https://goaztecs.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Brian Dutcher", "title": "Head Coach", "email": "bdutcher@sdsu.edu", "phone": "+1-619-594-5200"}]},
        {"name": "Colorado State University", "location": "Fort Collins, CO", "state": "Colorado", "division": "Division I", "conference": "Mountain West", "foreign_friendly": True, "scholarship_info": "Open to international athletes. Great mountain setting.", "acceptance_rate": "84%", "notable_alumni": "Manny Adur, Niek Maarse", "ranking": 23, "website": "https://csurams.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Niko Medved", "title": "Head Coach", "email": "nmedved@colostate.edu", "phone": "+1-970-491-5065"}]},
        {"name": "Drexel University", "location": "Philadelphia, PA", "state": "Pennsylvania", "division": "Division I", "conference": "CAA", "foreign_friendly": True, "scholarship_info": "Strong co-op program. Excellent for academic + athletic balance.", "acceptance_rate": "76%", "notable_alumni": "Michael Anderson, Daryl Strawberry", "ranking": 24, "website": "https://drexeldragons.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Zach Spiker", "title": "Head Coach", "email": "zspiker@drexel.edu", "phone": "+1-215-895-2000"}]},
        {"name": "Belmont University", "location": "Nashville, TN", "state": "Tennessee", "division": "Division I", "conference": "Missouri Valley", "foreign_friendly": True, "scholarship_info": "Smaller school, more personal attention. International students supported.", "acceptance_rate": "79%", "notable_alumni": "Taylor Morgan, Dylan Windler", "ranking": 25, "website": "https://belmontbruins.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Casey Alexander", "title": "Head Coach", "email": "calexander@belmont.edu", "phone": "+1-615-460-5500"}]},
    ]
    for c in colleges:
        c["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.colleges.insert_many(colleges)
    logger.info(f"Seeded {len(colleges)} colleges")

async def seed_extended_colleges():
    """Seed Division II, NAIA, and JUCO colleges — skips any already in DB by name."""
    img1 = "https://images.unsplash.com/photo-1562774053-701939374585?w=400"
    img2 = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400"
    img3 = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400"
    img4 = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"
    ts = datetime.now(timezone.utc).isoformat()

    extended = [
        # ── DIVISION II ──────────────────────────────────────────────────────────
        {"name": "Drury University", "location": "Springfield, MO", "state": "Missouri", "division": "Division II", "conference": "GLVC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Highly ranked D2 program; welcomes international players.", "acceptance_rate": "66%", "notable_alumni": "Scott Pioli", "ranking": 101, "website": "https://druryathletics.com", "image_url": img2, "coaches": [{"name": "Steve Hesser", "title": "Head Coach", "email": "shesser@drury.edu", "phone": "+1-417-873-7350"}]},
        {"name": "University of Findlay", "location": "Findlay, OH", "state": "Ohio", "division": "Division II", "conference": "GLIAC", "foreign_friendly": True, "scholarship_info": "Full D2 athletic scholarships. International student community.", "acceptance_rate": "68%", "notable_alumni": "Various NBA G-League players", "ranking": 102, "website": "https://findlayoilers.com", "image_url": img3, "coaches": [{"name": "Rod Blackwell", "title": "Head Coach", "email": "blackwellr@findlay.edu", "phone": "+1-419-434-4600"}]},
        {"name": "Minnesota State Mankato", "location": "Mankato, MN", "state": "Minnesota", "division": "Division II", "conference": "NSIC", "foreign_friendly": True, "scholarship_info": "Strong scholarship program. International athletes well-supported.", "acceptance_rate": "62%", "notable_alumni": "Tyler Relph", "ranking": 103, "website": "https://mankatomavericks.com", "image_url": img1, "coaches": [{"name": "Mike Hanson", "title": "Head Coach", "email": "mhanson@mnsu.edu", "phone": "+1-507-389-2636"}]},
        {"name": "West Texas A&M University", "location": "Canyon, TX", "state": "Texas", "division": "Division II", "conference": "Lone Star", "foreign_friendly": True, "scholarship_info": "Athletic scholarships available. Competitive Lone Star Conference.", "acceptance_rate": "61%", "notable_alumni": "Bob Knight (attended)", "ranking": 104, "website": "https://wtamu.edu/athletics", "image_url": img4, "coaches": [{"name": "Tom Brown", "title": "Head Coach", "email": "tbrown@wtamu.edu", "phone": "+1-806-651-2690"}]},
        {"name": "Metro State University of Denver", "location": "Denver, CO", "state": "Colorado", "division": "Division II", "conference": "RMAC", "foreign_friendly": True, "scholarship_info": "Strong urban program. Diverse student body. Full D2 scholarships.", "acceptance_rate": "100%", "notable_alumni": "Mack Tuck", "ranking": 105, "website": "https://roadrunnersports.com", "image_url": img2, "coaches": [{"name": "Derrick Clark", "title": "Head Coach", "email": "dclark@msudenver.edu", "phone": "+1-303-615-0600"}]},
        {"name": "Bentley University", "location": "Waltham, MA", "state": "Massachusetts", "division": "Division II", "conference": "NE10", "foreign_friendly": True, "scholarship_info": "Business-focused university. Athletic scholarships + strong career prospects.", "acceptance_rate": "50%", "notable_alumni": "Various business executives", "ranking": 106, "website": "https://bentleyfalcons.com", "image_url": img3, "coaches": [{"name": "Jay Lawson", "title": "Head Coach", "email": "jlawson@bentley.edu", "phone": "+1-781-891-2187"}]},
        {"name": "Adelphi University", "location": "Garden City, NY", "state": "New York", "division": "Division II", "conference": "NE10", "foreign_friendly": True, "scholarship_info": "D2 scholarships available. New York area — great exposure.", "acceptance_rate": "72%", "notable_alumni": "Randy Wittman", "ranking": 107, "website": "https://athletics.adelphi.edu", "image_url": img1, "coaches": [
            {"name": "Dave Duke", "title": "Head Coach", "email": "dduke@adelphi.edu", "phone": "+1-516-877-4239"},
            {"name": "Nick Stanton", "title": "Assistant Coach", "email": "nstanton@adelphi.edu", "phone": "+1-516-877-4239"},
            {"name": "James McCullough", "title": "Assistant Coach", "email": "jmccullough@adelphi.edu", "phone": "+1-516-877-4239"},
            {"name": "Brian Kerins", "title": "Assistant Coach", "email": "bkerins@adelphi.edu", "phone": "+1-516-877-4239"},
        ]},
        {"name": "Ferris State University", "location": "Big Rapids, MI", "state": "Michigan", "division": "Division II", "conference": "GLIAC", "foreign_friendly": False, "scholarship_info": "Full athletic scholarships. Great Lakes region school.", "acceptance_rate": "88%", "notable_alumni": "Rodney Hendricks", "ranking": 108, "website": "https://ferrisbulldogs.com", "image_url": img4, "coaches": [{"name": "Andy Bronkema", "title": "Head Coach", "email": "abronkema@ferris.edu", "phone": "+1-231-591-2311"}]},
        {"name": "Grand Valley State University", "location": "Allendale, MI", "state": "Michigan", "division": "Division II", "conference": "GLIAC", "foreign_friendly": True, "scholarship_info": "One of the top D2 programs in the country. Strong academics.", "acceptance_rate": "83%", "notable_alumni": "Kirk Cousins (football)", "ranking": 109, "website": "https://gvsulakers.com", "image_url": img2, "coaches": [{"name": "Ric Wesley", "title": "Head Coach", "email": "wesleyr@gvsu.edu", "phone": "+1-616-331-3259"}]},
        {"name": "Ashland University", "location": "Ashland, OH", "state": "Ohio", "division": "Division II", "conference": "G-MAC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Strong Christian university environment.", "acceptance_rate": "69%", "notable_alumni": "Nate Archibald (connection)", "ranking": 110, "website": "https://goashlandeagles.com", "image_url": img3, "coaches": [{"name": "John Gatens", "title": "Head Coach", "email": "jgatens@ashland.edu", "phone": "+1-419-289-5470"}]},
        {"name": "University of Indianapolis", "location": "Indianapolis, IN", "state": "Indiana", "division": "Division II", "conference": "GLVC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Located in NBA city — great basketball culture.", "acceptance_rate": "71%", "notable_alumni": "Peyton Manning (connection)", "ranking": 111, "website": "https://uindy.edu/athletics", "image_url": img1, "coaches": [{"name": "Stan Gouard", "title": "Head Coach", "email": "sgouard@uindy.edu", "phone": "+1-317-788-3318"}]},
        {"name": "Florida Southern College", "location": "Lakeland, FL", "state": "Florida", "division": "Division II", "conference": "SSC", "foreign_friendly": True, "scholarship_info": "Full scholarships. Sunshine State — great for international players.", "acceptance_rate": "52%", "notable_alumni": "Multiple NBA draftees", "ranking": 112, "website": "https://fscmocs.com", "image_url": img4, "coaches": [{"name": "Mike Donnelly", "title": "Head Coach", "email": "mdonnelly@flsouthern.edu", "phone": "+1-863-680-4252"}]},
        {"name": "Nova Southeastern University", "location": "Fort Lauderdale, FL", "state": "Florida", "division": "Division II", "conference": "SSC", "foreign_friendly": True, "scholarship_info": "Large international student body. Athletic scholarships available.", "acceptance_rate": "52%", "notable_alumni": "Various South Florida athletes", "ranking": 113, "website": "https://nsusharks.com", "image_url": img2, "coaches": [
            {"name": "Jim Crutchfield", "title": "Head Coach", "email": "jcrutchfie@nova.edu", "phone": "+1-954-262-8560"},
            {"name": "Nick Smith", "title": "Associate Head Coach", "email": "ns1262@nova.edu", "phone": "+1-954-262-8560"},
            {"name": "RJ Sunahara", "title": "Assistant Coach", "email": "rs2525@nova.edu", "phone": "+1-954-262-8560"},
        ]},
        {"name": "University of Tampa", "location": "Tampa, FL", "state": "Florida", "division": "Division II", "conference": "SSC", "foreign_friendly": True, "scholarship_info": "Strong D2 program. Located in major city with great basketball culture.", "acceptance_rate": "54%", "notable_alumni": "Various SSC champions", "ranking": 114, "website": "https://ut.edu/athletics", "image_url": img3, "coaches": [{"name": "Tom Carlin", "title": "Head Coach", "email": "tcarlin@ut.edu", "phone": "+1-813-253-6226"}]},
        {"name": "Fort Hays State University", "location": "Hays, KS", "state": "Kansas", "division": "Division II", "conference": "MIAA", "foreign_friendly": True, "scholarship_info": "Very international-friendly. Large international enrollment. Scholarships available.", "acceptance_rate": "90%", "notable_alumni": "Chadron State rival", "ranking": 115, "website": "https://fhsutgers.com", "image_url": img1, "coaches": [{"name": "Mark Johnson", "title": "Head Coach", "email": "mjohnson@fhsu.edu", "phone": "+1-785-628-4050"}]},
        {"name": "Washburn University", "location": "Topeka, KS", "state": "Kansas", "division": "Division II", "conference": "MIAA", "foreign_friendly": True, "scholarship_info": "Affordable tuition. Athletic scholarships. Welcoming to international players.", "acceptance_rate": "100%", "notable_alumni": "Bob Boozer", "ranking": 116, "website": "https://washburnathletics.com", "image_url": img4, "coaches": [{"name": "Brett Ballard", "title": "Head Coach", "email": "brett.ballard@washburn.edu", "phone": "+1-785-670-1740"}]},
        {"name": "Nebraska-Kearney", "location": "Kearney, NE", "state": "Nebraska", "division": "Division II", "conference": "MIAA", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. Safe midwest city. Strong international student office.", "acceptance_rate": "88%", "notable_alumni": "Various Heartland Conference athletes", "ranking": 117, "website": "https://unklopers.com", "image_url": img2, "coaches": [{"name": "Kevin Lofton", "title": "Head Coach", "email": "klofton@unk.edu", "phone": "+1-308-865-8519"}]},
        {"name": "Lincoln Memorial University", "location": "Harrogate, TN", "state": "Tennessee", "division": "Division II", "conference": "SAC", "foreign_friendly": False, "scholarship_info": "Full D2 scholarships. Rural campus — tight-knit community.", "acceptance_rate": "67%", "notable_alumni": "Various SAC champions", "ranking": 118, "website": "https://lmuathletics.com", "image_url": img3, "coaches": [{"name": "Phillip Cunningham", "title": "Head Coach", "email": "pcunningham@lmunet.edu", "phone": "+1-423-869-6215"}]},
        {"name": "Wingate University", "location": "Wingate, NC", "state": "North Carolina", "division": "Division II", "conference": "SAC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Close to Charlotte NBA market.", "acceptance_rate": "61%", "notable_alumni": "Various SAC standouts", "ranking": 119, "website": "https://bulldogsports.com", "image_url": img1, "coaches": [{"name": "Shay Sellers", "title": "Head Coach", "email": "ssellers@wingate.edu", "phone": "+1-704-233-8200"}]},
        {"name": "Lenoir-Rhyne University", "location": "Hickory, NC", "state": "North Carolina", "division": "Division II", "conference": "SAC", "foreign_friendly": True, "scholarship_info": "Scholarships available. SAC competitive program.", "acceptance_rate": "58%", "notable_alumni": "Various SAC stars", "ranking": 120, "website": "https://lrbears.com", "image_url": img4, "coaches": [{"name": "Chris Raber", "title": "Head Coach", "email": "craber@lr.edu", "phone": "+1-828-328-7195"}]},
        {"name": "Augustana University", "location": "Sioux Falls, SD", "state": "South Dakota", "division": "Division II", "conference": "NSIC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Strong academic reputation. Nordic heritage — very international-open.", "acceptance_rate": "61%", "notable_alumni": "Various NSIC standouts", "ranking": 121, "website": "https://augustanaviking.com", "image_url": img2, "coaches": [{"name": "Tom Billeter", "title": "Head Coach", "email": "tbilleter@augie.edu", "phone": "+1-605-274-4620"}]},
        {"name": "Cal State San Marcos", "location": "San Marcos, CA", "state": "California", "division": "Division II", "conference": "CCAA", "foreign_friendly": True, "scholarship_info": "California sunshine and diverse campus. D2 scholarship opportunities.", "acceptance_rate": "63%", "notable_alumni": "Various CCAA athletes", "ranking": 122, "website": "https://athletics.csusm.edu", "image_url": img3, "coaches": [{"name": "Brian Newhall", "title": "Head Coach", "email": "bnewhall@csusm.edu", "phone": "+1-760-750-4707"}]},
        {"name": "Northern Michigan University", "location": "Marquette, MI", "state": "Michigan", "division": "Division II", "conference": "GLIAC", "foreign_friendly": False, "scholarship_info": "Full scholarships. Beautiful Great Lakes campus.", "acceptance_rate": "72%", "notable_alumni": "Steve Mariucci (connection)", "ranking": 123, "website": "https://goNMU.com", "image_url": img1, "coaches": [{"name": "Trevor Nordmann", "title": "Head Coach", "email": "tnordmann@nmu.edu", "phone": "+1-906-227-2270"}]},
        {"name": "Valdosta State University", "location": "Valdosta, GA", "state": "Georgia", "division": "Division II", "conference": "GSC", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. Warm Southern city.", "acceptance_rate": "56%", "notable_alumni": "Various GSC standouts", "ranking": 124, "website": "https://vstateblazers.com", "image_url": img4, "coaches": [{"name": "Mike Helfer", "title": "Head Coach", "email": "mrhelfer@valdosta.edu", "phone": "+1-229-333-5893"}]},
        {"name": "Tiffin University", "location": "Tiffin, OH", "state": "Ohio", "division": "Division II", "conference": "G-MAC", "foreign_friendly": False, "scholarship_info": "Very international-friendly campus. Athletic scholarships. UK players have succeeded here.", "acceptance_rate": "65%", "notable_alumni": "Various G-MAC athletes", "ranking": 125, "website": "https://godragonathletics.com", "image_url": img2, "coaches": [{"name": "Damon Goodwin", "title": "Head Coach", "email": "dgoodwin@tiffin.edu", "phone": "+1-419-448-3375"}]},

        # ── NAIA ────────────────────────────────────────────────────────────────
        {"name": "Indiana Wesleyan University", "location": "Marion, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Flagship NAIA basketball program. Full scholarships. Multiple national championships.", "acceptance_rate": "67%", "notable_alumni": "Various NAIA All-Americans", "ranking": 201, "website": "https://indwes.edu/athletics", "image_url": img1, "coaches": [{"name": "Chad Briscoe", "title": "Head Coach", "email": "chad.briscoe@indwes.edu", "phone": "+1-765-677-2352"}]},
        {"name": "Oklahoma City University", "location": "Oklahoma City, OK", "state": "Oklahoma", "division": "NAIA", "conference": "Sooner Athletic", "foreign_friendly": True, "scholarship_info": "Top NAIA program. Full scholarships. Strong history of recruiting international talent.", "acceptance_rate": "82%", "notable_alumni": "Wayman Tisdale", "ranking": 202, "website": "https://ocusports.com", "image_url": img4, "coaches": [{"name": "Craig Coley", "title": "Head Coach", "email": "ccoley@okcu.edu", "phone": "+1-405-208-5988"}]},
        {"name": "The Master's University", "location": "Santa Clarita, CA", "state": "California", "division": "NAIA", "conference": "GSAC", "foreign_friendly": True, "scholarship_info": "Strong Christian university. Full NAIA scholarships. Multiple national titles.", "acceptance_rate": "72%", "notable_alumni": "Various GSAC champions", "ranking": 203, "website": "https://masters.edu/athletics", "image_url": img3, "coaches": [{"name": "Kelvin Starr", "title": "Head Coach", "email": "kstarr@masters.edu", "phone": "+1-661-362-2211"}]},
        {"name": "Vanguard University", "location": "Costa Mesa, CA", "state": "California", "division": "NAIA", "conference": "GSAC", "foreign_friendly": True, "scholarship_info": "Coastal California location. NAIA scholarships available.", "acceptance_rate": "58%", "notable_alumni": "Various Southern California NAIA stars", "ranking": 204, "website": "https://vanguardathletics.com", "image_url": img2, "coaches": [{"name": "Brian Gates", "title": "Head Coach", "email": "bgates@vanguard.edu", "phone": "+1-714-556-3610"}]},
        {"name": "Bethel University (Indiana)", "location": "Mishawaka, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Christian environment. Strong NAIA basketball tradition.", "acceptance_rate": "68%", "notable_alumni": "Various Crossroads League stars", "ranking": 205, "website": "https://bethelpilots.com", "image_url": img1, "coaches": [{"name": "Mike Lightfoot", "title": "Head Coach", "email": "mlightfoot@betheluniversity.edu", "phone": "+1-574-807-7315"}]},
        {"name": "Spring Arbor University", "location": "Spring Arbor, MI", "state": "Michigan", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Full NAIA scholarships. Strong academic program.", "acceptance_rate": "70%", "notable_alumni": "Various Crossroads athletes", "ranking": 206, "website": "https://gosaucougars.com", "image_url": img4, "coaches": [{"name": "Kyle Manns", "title": "Head Coach", "email": "kmanns@arbor.edu", "phone": "+1-517-750-6520"}]},
        {"name": "Morningside University", "location": "Sioux City, IA", "state": "Iowa", "division": "NAIA", "conference": "GPAC", "foreign_friendly": True, "scholarship_info": "Very strong NAIA program. Full scholarships. Heartland of America.", "acceptance_rate": "64%", "notable_alumni": "Various GPAC All-Americans", "ranking": 207, "website": "https://morningsidemustangs.com", "image_url": img2, "coaches": [{"name": "Shane Dreyer", "title": "Head Coach", "email": "sdreyer@morningside.edu", "phone": "+1-712-274-5305"}]},
        {"name": "Grand View University", "location": "Des Moines, IA", "state": "Iowa", "division": "NAIA", "conference": "HAAC", "foreign_friendly": True, "scholarship_info": "Capital city location. Full NAIA scholarships. Welcoming to international players.", "acceptance_rate": "66%", "notable_alumni": "Various HAAC standouts", "ranking": 208, "website": "https://grandviewvikings.com", "image_url": img3, "coaches": [{"name": "Duane Dolezal", "title": "Head Coach", "email": "ddolezal@grandview.edu", "phone": "+1-515-263-2856"}]},
        {"name": "Dordt University", "location": "Sioux Center, IA", "state": "Iowa", "division": "NAIA", "conference": "GPAC", "foreign_friendly": False, "scholarship_info": "Christian Reformed university. Full scholarships. International students very welcome.", "acceptance_rate": "70%", "notable_alumni": "Various GPAC champions", "ranking": 209, "website": "https://dordt.edu/athletics", "image_url": img1, "coaches": [{"name": "Ross Douma", "title": "Head Coach", "email": "rDouma@dordt.edu", "phone": "+1-712-722-6233"}]},
        {"name": "Concordia University (Nebraska)", "location": "Seward, NE", "state": "Nebraska", "division": "NAIA", "conference": "GPAC", "foreign_friendly": True, "scholarship_info": "Lutheran university. Athletic scholarships. Strong GPAC program.", "acceptance_rate": "97%", "notable_alumni": "Various GPAC standouts", "ranking": 210, "website": "https://cune.edu/athletics", "image_url": img4, "coaches": [{"name": "Grant Schmidt", "title": "Head Coach", "email": "gschmidt@cune.edu", "phone": "+1-402-643-7472"}]},
        {"name": "Hastings College", "location": "Hastings, NE", "state": "Nebraska", "division": "NAIA", "conference": "GPAC", "foreign_friendly": False, "scholarship_info": "Full NAIA scholarships. Small college feel with big basketball tradition.", "acceptance_rate": "74%", "notable_alumni": "Various Nebraska athletes", "ranking": 211, "website": "https://hastingsbroncos.com", "image_url": img2, "coaches": [{"name": "Craig Smith", "title": "Head Coach", "email": "csmith@hastings.edu", "phone": "+1-402-461-7391"}]},
        {"name": "Rocky Mountain College", "location": "Billings, MT", "state": "Montana", "division": "NAIA", "conference": "Frontier", "foreign_friendly": False, "scholarship_info": "Montana big sky country. NAIA scholarships. Excellent for outdoors-loving international players.", "acceptance_rate": "51%", "notable_alumni": "Various Frontier Conference athletes", "ranking": 212, "website": "https://rocky.edu/athletics", "image_url": img3, "coaches": [{"name": "Bill Dreikosen", "title": "Head Coach", "email": "bdreikosen@rocky.edu", "phone": "+1-406-657-1064"}]},
        {"name": "Carroll College", "location": "Helena, MT", "state": "Montana", "division": "NAIA", "conference": "Frontier", "foreign_friendly": False, "scholarship_info": "Montana capital city. Full scholarships. Beautiful mountain setting.", "acceptance_rate": "57%", "notable_alumni": "Various Frontier Conference standouts", "ranking": 213, "website": "https://carroll.edu/athletics", "image_url": img1, "coaches": [{"name": "Patrick Mullen", "title": "Head Coach", "email": "pmullen@carroll.edu", "phone": "+1-406-447-4380"}]},
        {"name": "Valley City State University", "location": "Valley City, ND", "state": "North Dakota", "division": "NAIA", "conference": "NSAA", "foreign_friendly": False, "scholarship_info": "Full NAIA scholarships. Safe small college town.", "acceptance_rate": "100%", "notable_alumni": "Various NSAA athletes", "ranking": 214, "website": "https://vcstatevikings.com", "image_url": img4, "coaches": [{"name": "Ryan Thompson", "title": "Head Coach", "email": "rthompson@vcsu.edu", "phone": "+1-701-845-7706"}]},
        {"name": "Eastern Oregon University", "location": "La Grande, OR", "state": "Oregon", "division": "NAIA", "conference": "Cascade", "foreign_friendly": False, "scholarship_info": "Pacific Northwest. NAIA scholarships. International students supported.", "acceptance_rate": "100%", "notable_alumni": "Various Cascade Conference players", "ranking": 215, "website": "https://eou.edu/athletics", "image_url": img2, "coaches": [{"name": "Paul Caudell", "title": "Head Coach", "email": "pcaudell@eou.edu", "phone": "+1-541-962-3523"}]},
        {"name": "Saint Francis University (Indiana)", "location": "Fort Wayne, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Full scholarships. Franciscan values — compassionate international support.", "acceptance_rate": "70%", "notable_alumni": "Various Crossroads League stars", "ranking": 216, "website": "https://sfcougars.com", "image_url": img3, "coaches": [
            {"name": "Nate Conley", "title": "Head Coach", "email": "nconley@sf.edu", "phone": "+1-260-399-7700"},
            {"name": "Athletics Department", "title": "General Athletics Contact", "email": "athletics@sf.edu", "phone": "+1-260-399-7700"},
        ]},
        {"name": "Marian University (Indiana)", "location": "Indianapolis, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Indianapolis location. Full NAIA scholarships. Welcoming to UK players.", "acceptance_rate": "68%", "notable_alumni": "Various Indianapolis NAIA athletes", "ranking": 217, "website": "https://marianknights.com", "image_url": img1, "coaches": [{"name": "Steve McKinley", "title": "Head Coach", "email": "smckinley@marian.edu", "phone": "+1-317-955-6000"}]},
        {"name": "Southwestern Assemblies of God University", "location": "Waxahachie, TX", "state": "Texas", "division": "NAIA", "conference": "RRAC", "foreign_friendly": False, "scholarship_info": "Faith-based university. Full NAIA scholarships. Texas location.", "acceptance_rate": "45%", "notable_alumni": "Various RRAC athletes", "ranking": 218, "website": "https://sagu.edu/athletics", "image_url": img4, "coaches": [{"name": "Aaron Burks", "title": "Head Coach", "email": "aburks@sagu.edu", "phone": "+1-972-825-4700"}]},
        {"name": "Oregon Tech", "location": "Klamath Falls, OR", "state": "Oregon", "division": "NAIA", "conference": "Cascade", "foreign_friendly": True, "scholarship_info": "STEM-focused university. Great for athlete-engineers. NAIA scholarships.", "acceptance_rate": "71%", "notable_alumni": "Various Pacific NW athletes", "ranking": 219, "website": "https://oit.edu/athletics", "image_url": img2, "coaches": [{"name": "Danny Miles", "title": "Head Coach", "email": "dmiles@oit.edu", "phone": "+1-541-885-1750"}]},
        {"name": "Jamestown University", "location": "Jamestown, ND", "state": "North Dakota", "division": "NAIA", "conference": "NSAA", "foreign_friendly": False, "scholarship_info": "Full scholarships. Safe college town. North Dakota open to international athletes.", "acceptance_rate": "78%", "notable_alumni": "Various NSAA standouts", "ranking": 220, "website": "https://jimmies.com", "image_url": img3, "coaches": [{"name": "Dennis Kallenbach", "title": "Head Coach", "email": "dkallenbach@uj.edu", "phone": "+1-701-252-3467"}]},

        # ── JUCO ──────────────────────────────────────────────────────────────
        {"name": "Coffeyville Community College", "location": "Coffeyville, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "One of the most famous JUCO basketball programs in America. Full ride scholarships. Pipeline to D1.", "acceptance_rate": "100%", "notable_alumni": "Many NBA players passed through", "ranking": 301, "website": "https://coffeyville.edu", "image_url": img1, "coaches": [{"name": "Kyle Johnson", "title": "Head Coach", "email": "kjohnson@coffeyville.edu", "phone": "+1-620-252-7021"}]},
        {"name": "Tyler Junior College", "location": "Tyler, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Div I", "foreign_friendly": True, "scholarship_info": "Elite JUCO program. Full scholarships. Strong D1 transfer pipeline. International players welcome.", "acceptance_rate": "100%", "notable_alumni": "Various NBA/D1 transfers", "ranking": 302, "website": "https://tjc.edu/athletics", "image_url": img4, "coaches": [{"name": "Brad Shorten", "title": "Head Coach", "email": "bshorten@tjc.edu", "phone": "+1-903-510-2400"}]},
        {"name": "Navarro College", "location": "Corsicana, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Div I", "foreign_friendly": True, "scholarship_info": "Famous JUCO (Last Chance U). Full scholarships. Excellent D1 transfer pipeline.", "acceptance_rate": "100%", "notable_alumni": "Multiple NBA players via transfers", "ranking": 303, "website": "https://navarrocollege.edu/athletics", "image_url": img2, "coaches": [{"name": "David Cook", "title": "Head Coach", "email": "dcook@navarrocollege.edu", "phone": "+1-903-875-7578"}]},
        {"name": "South Plains College", "location": "Levelland, TX", "state": "Texas", "division": "JUCO", "conference": "WJCAC", "foreign_friendly": True, "scholarship_info": "Top NJCAA program. Full scholarships. Very competitive basketball.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer players", "ranking": 304, "website": "https://southplainscollege.edu", "image_url": img3, "coaches": [{"name": "Steve Green", "title": "Head Coach", "email": "sgreen@southplainscollege.edu", "phone": "+1-806-894-9611"}]},
        {"name": "Hutchinson Community College", "location": "Hutchinson, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "Strong NJCAA program. Full scholarships. Kansas JUCO powerhouse.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer athletes", "ranking": 305, "website": "https://hutchinson.edu/athletics", "image_url": img1, "coaches": [{"name": "Brian Ostermann", "title": "Head Coach", "email": "bostermann@hutchinson.edu", "phone": "+1-620-665-3536"}]},
        {"name": "Barton County Community College", "location": "Great Bend, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "Strong basketball program. Full NJCAA scholarships. Kansas JUCO.", "acceptance_rate": "100%", "notable_alumni": "Various KJCCC standouts", "ranking": 306, "website": "https://bartonccc.edu/athletics", "image_url": img4, "coaches": [{"name": "James Garrison", "title": "Head Coach", "email": "jgarrison@bartonccc.edu", "phone": "+1-620-792-2701"}]},
        {"name": "Seward County Community College", "location": "Liberal, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "NJCAA basketball powerhouse. Full scholarships. Recruits internationally.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer players", "ranking": 307, "website": "https://sccc.edu/athletics", "image_url": img2, "coaches": [{"name": "Jason Sautter", "title": "Head Coach", "email": "jsautter@sccc.edu", "phone": "+1-620-629-2736"}]},
        {"name": "Garden City Community College", "location": "Garden City, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "Top NJCAA program. Full scholarships. History of producing D1 transfers.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfers", "ranking": 308, "website": "https://gcccks.edu/athletics", "image_url": img3, "coaches": [{"name": "Vance Walberg", "title": "Head Coach", "email": "vwalberg@gcccks.edu", "phone": "+1-620-276-7611"}]},
        {"name": "Kilgore College", "location": "Kilgore, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Region XIV", "foreign_friendly": True, "scholarship_info": "Strong East Texas JUCO. Full scholarships. Solid D1 pipeline.", "acceptance_rate": "100%", "notable_alumni": "Various D1/professional players", "ranking": 309, "website": "https://kilgore.edu/athletics", "image_url": img1, "coaches": [{"name": "Tony Hooper", "title": "Head Coach", "email": "thooper@kilgore.edu", "phone": "+1-903-983-8238"}]},
        {"name": "Trinity Valley Community College", "location": "Athens, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Region XIV", "foreign_friendly": True, "scholarship_info": "Texas JUCO powerhouse. Full scholarships. Great transfer record.", "acceptance_rate": "100%", "notable_alumni": "Various NBA/D1 transfers", "ranking": 310, "website": "https://tvcc.edu/athletics", "image_url": img4, "coaches": [{"name": "Jamie Dement", "title": "Head Coach", "email": "jdement@tvcc.edu", "phone": "+1-903-675-6352"}]},
        {"name": "Northeastern Oklahoma A&M College", "location": "Miami, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": True, "scholarship_info": "Strong Oklahoma JUCO. Full scholarships. Good D2/NAIA pipeline.", "acceptance_rate": "100%", "notable_alumni": "Various NAIA/D2 transfers", "ranking": 311, "website": "https://neo.edu/athletics", "image_url": img2, "coaches": [{"name": "Vince Menz", "title": "Head Coach", "email": "vmenz@neo.edu", "phone": "+1-918-540-6297"}]},
        {"name": "Northern Oklahoma College", "location": "Tonkawa, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": False, "scholarship_info": "Full NJCAA scholarships. Strong Oklahoma JUCO basketball.", "acceptance_rate": "100%", "notable_alumni": "Various D1/D2 transfer athletes", "ranking": 312, "website": "https://noc.edu/athletics", "image_url": img3, "coaches": [{"name": "Willie Sherrod", "title": "Head Coach", "email": "wsherrod@noc.edu", "phone": "+1-580-628-6226"}]},
        {"name": "Iowa Western Community College", "location": "Council Bluffs, IA", "state": "Iowa", "division": "JUCO", "conference": "ICCAC", "foreign_friendly": True, "scholarship_info": "Strong NJCAA Div I program. Full scholarships. Midwest JUCO powerhouse.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer players", "ranking": 313, "website": "https://iowawestern.edu/athletics", "image_url": img1, "coaches": [{"name": "Todd Millikan", "title": "Head Coach", "email": "tmillikan@iwcc.edu", "phone": "+1-712-325-3258"}]},
        {"name": "Wabash Valley College", "location": "Mount Carmel, IL", "state": "Illinois", "division": "JUCO", "conference": "NJCAA Region XXIV", "foreign_friendly": False, "scholarship_info": "Illinois JUCO with full scholarships. Strong transfer record to D1.", "acceptance_rate": "100%", "notable_alumni": "Various Big Ten/Big East transfers", "ranking": 314, "website": "https://wvc.edu/athletics", "image_url": img4, "coaches": [{"name": "Kyle Smithpeters", "title": "Head Coach", "email": "ksmithpeters@wvc.edu", "phone": "+1-618-262-8641"}]},
        {"name": "Vincennes University", "location": "Vincennes, IN", "state": "Indiana", "division": "JUCO", "conference": "NJCAA Region XII", "foreign_friendly": True, "scholarship_info": "One of the top JUCOs in the Midwest. Full scholarships. Strong D1 transfer pipeline.", "acceptance_rate": "100%", "notable_alumni": "Larry Bird attended briefly", "ranking": 315, "website": "https://vincennes.edu/athletics", "image_url": img2, "coaches": [{"name": "Todd Franklin", "title": "Head Coach", "email": "tfrankli@vinu.edu", "phone": "+1-812-888-5376"}]},
        {"name": "Pima Community College", "location": "Tucson, AZ", "state": "Arizona", "division": "JUCO", "conference": "ACCAC", "foreign_friendly": True, "scholarship_info": "Arizona JUCO. Full scholarships. Good pathway to Arizona/Arizona State area D1 programs.", "acceptance_rate": "100%", "notable_alumni": "Various AZ D1 transfers", "ranking": 316, "website": "https://pima.edu/athletics", "image_url": img3, "coaches": [{"name": "Todd Welch", "title": "Head Coach", "email": "twelch@pima.edu", "phone": "+1-520-206-4638"}]},
        {"name": "Carl Albert State College", "location": "Poteau, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": False, "scholarship_info": "Oklahoma JUCO. Full scholarships. Good basketball tradition.", "acceptance_rate": "100%", "notable_alumni": "Various NAIA/D2 transfers", "ranking": 317, "website": "https://carlalbert.edu/athletics", "image_url": img1, "coaches": [{"name": "Seth Williams", "title": "Head Coach", "email": "swilliams@carlalbert.edu", "phone": "+1-918-647-1365"}]},
        {"name": "Connors State College", "location": "Warner, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": False, "scholarship_info": "Full NJCAA scholarships. Oklahoma JUCO basketball program.", "acceptance_rate": "100%", "notable_alumni": "Various Oklahoma D1/NAIA transfers", "ranking": 318, "website": "https://connorsstate.edu/athletics", "image_url": img4, "coaches": [{"name": "Kerry McSpadden", "title": "Head Coach", "email": "kmcspadden@connorsstate.edu", "phone": "+1-918-463-6219"}]},
        {"name": "Iowa Central Community College", "location": "Fort Dodge, IA", "state": "Iowa", "division": "JUCO", "conference": "ICCAC", "foreign_friendly": True, "scholarship_info": "Iowa JUCO powerhouse. Full scholarships. Multiple NJCAA national tournament appearances.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer athletes", "ranking": 319, "website": "https://iowacentral.edu/athletics", "image_url": img2, "coaches": [{"name": "Ben Johnson", "title": "Head Coach", "email": "bjohnson@iowacentral.edu", "phone": "+1-515-574-1111"}]},
        {"name": "Eastern Oklahoma State College", "location": "Wilburton, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": False, "scholarship_info": "Full scholarships. Oklahoma JUCO. Good pathway to regional D2/NAIA programs.", "acceptance_rate": "100%", "notable_alumni": "Various regional transfers", "ranking": 320, "website": "https://eosc.edu/athletics", "image_url": img3, "coaches": [{"name": "Garrett Cantrell", "title": "Head Coach", "email": "gcantrell@eosc.edu", "phone": "+1-918-465-2361"}]},

        # ── DIVISION II (v1.20 expansion) ────────────────────────────────────
        {"name": "Angelo State University", "location": "San Angelo, TX", "state": "Texas", "region": "USA", "country": "USA", "division": "Division II", "conference": "Lone Star", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. Lone Star Conference — competitive Texas basketball. ASU is part of Texas Tech system.", "acceptance_rate": "80%", "notable_alumni": "Various Lone Star standouts", "ranking": None, "website": "https://gosaxons.com", "image_url": img1, "coaches": [{"name": "Banky Fulton", "title": "Head Coach", "email": "athletics@angelo.edu", "phone": "+1-325-942-2264"}]},
        {"name": "Lubbock Christian University", "location": "Lubbock, TX", "state": "Texas", "region": "USA", "country": "USA", "division": "Division II", "conference": "Lone Star", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. Lone Star Conference. Christian environment. Large international student body.", "acceptance_rate": "45%", "notable_alumni": "Various Lone Star standouts", "ranking": None, "website": "https://lcuchaparros.com", "image_url": img2, "coaches": [{"name": "Todd Duncan", "title": "Head Coach", "email": "athletics@lcu.edu", "phone": "+1-806-720-7221"}]},
        {"name": "Texas A&M International University", "location": "Laredo, TX", "state": "Texas", "region": "USA", "country": "USA", "division": "Division II", "conference": "Lone Star", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. Border city — extremely diverse and international. Spanish-English bilingual campus.", "acceptance_rate": "72%", "notable_alumni": "Various Lone Star standouts", "ranking": None, "website": "https://tamiu.edu/athletics", "image_url": img1, "coaches": [{"name": "Jorge Ramos", "title": "Head Coach", "email": "athletics@tamiu.edu", "phone": "+1-956-326-2240"}]},
        {"name": "Emporia State University", "location": "Emporia, KS", "state": "Kansas", "region": "USA", "country": "USA", "division": "Division II", "conference": "MIAA", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. MIAA — one of the toughest D2 conferences. Strong academic reputation.", "acceptance_rate": "93%", "notable_alumni": "Various MIAA standouts", "ranking": None, "website": "https://esuhornets.com", "image_url": img2, "coaches": [{"name": "Aaron Senne", "title": "Head Coach", "email": "athletics@emporia.edu", "phone": "+1-620-341-5781"}]},
        {"name": "Newman University", "location": "Wichita, KS", "state": "Kansas", "region": "USA", "country": "USA", "division": "Division II", "conference": "MIAA", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. MIAA. Wichita — good-sized city. Newman has strong tradition of international student recruitment.", "acceptance_rate": "54%", "notable_alumni": "Various MIAA standouts", "ranking": None, "website": "https://newmanjets.com", "image_url": img1, "coaches": [{"name": "Terry Henson", "title": "Head Coach", "email": "athletics@newmanu.edu", "phone": "+1-316-942-4291"}]},
        {"name": "Colorado Mesa University", "location": "Grand Junction, CO", "state": "Colorado", "region": "USA", "country": "USA", "division": "Division II", "conference": "RMAC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. Rocky Mountain Athletic Conference. Western Colorado outdoors lifestyle.", "acceptance_rate": "76%", "notable_alumni": "Various RMAC standouts", "ranking": None, "website": "https://gomavericks.com", "image_url": img2, "coaches": [{"name": "Brandon Moore", "title": "Head Coach", "email": "athletics@coloradomesa.edu", "phone": "+1-970-248-1670"}]},
        {"name": "Fort Lewis College", "location": "Durango, CO", "state": "Colorado", "region": "USA", "country": "USA", "division": "Division II", "conference": "RMAC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "DII scholarship. RMAC. Durango — unique mountain city setting. Strong Native American heritage and diverse community.", "acceptance_rate": "84%", "notable_alumni": "Various RMAC standouts", "ranking": None, "website": "https://fortlewisskyliners.com", "image_url": img1, "coaches": [{"name": "Jeff Cox", "title": "Head Coach", "email": "athletics@fortlewis.edu", "phone": "+1-970-247-7552"}]},
        {"name": "Bemidji State University", "location": "Bemidji, MN", "state": "Minnesota", "region": "USA", "country": "USA", "division": "Division II", "conference": "NSIC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. NSIC. North central Minnesota. Strong outdoor/winter sports culture.", "acceptance_rate": "72%", "notable_alumni": "Various NSIC standouts", "ranking": None, "website": "https://bsubeavers.com", "image_url": img2, "coaches": [{"name": "Brandon Rooks", "title": "Head Coach", "email": "athletics@bemidjistate.edu", "phone": "+1-218-755-3862"}]},
        {"name": "Wayne State University (Nebraska)", "location": "Wayne, NE", "state": "Nebraska", "region": "USA", "country": "USA", "division": "Division II", "conference": "NSIC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. NSIC North. Nebraska small-town values, strong academic support.", "acceptance_rate": "99%", "notable_alumni": "Various NSIC standouts", "ranking": None, "website": "https://wscwildcats.com", "image_url": img1, "coaches": [{"name": "Greg Dowd", "title": "Head Coach", "email": "athletics@wsc.edu", "phone": "+1-402-375-7520"}]},
        {"name": "Upper Iowa University", "location": "Fayette, IA", "state": "Iowa", "region": "USA", "country": "USA", "division": "Division II", "conference": "NSIC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. NSIC. Iowa liberal arts tradition. Small-town campus, big-time competition.", "acceptance_rate": "72%", "notable_alumni": "Various NSIC standouts", "ranking": None, "website": "https://uiuathletics.com", "image_url": img2, "coaches": [{"name": "Ken Baier", "title": "Head Coach", "email": "athletics@uiu.edu", "phone": "+1-563-425-5200"}]},
        {"name": "Palm Beach Atlantic University", "location": "West Palm Beach, FL", "state": "Florida", "region": "USA", "country": "USA", "division": "Division II", "conference": "Sunshine State", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. Sunshine State Conference. South Florida — highly international, warm year-round.", "acceptance_rate": "65%", "notable_alumni": "Various SSC standouts", "ranking": None, "website": "https://pbabuccaneers.com", "image_url": img1, "coaches": [{"name": "Mark Slessinger", "title": "Head Coach", "email": "athletics@pba.edu", "phone": "+1-561-803-2175"}]},
        {"name": "St. Thomas University (FL)", "location": "Miami Gardens, FL", "state": "Florida", "region": "USA", "country": "USA", "division": "Division II", "conference": "Sunshine State", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. Miami area — most international city in the US. Strong Latin American and Caribbean connections.", "acceptance_rate": "42%", "notable_alumni": "Various SSC standouts", "ranking": None, "website": "https://stustbobcats.com", "image_url": img2, "coaches": [{"name": "Marcelino Serna", "title": "Head Coach", "email": "athletics@stu.edu", "phone": "+1-305-628-6752"}]},
        {"name": "Florida Memorial University", "location": "Miami Gardens, FL", "state": "Florida", "region": "USA", "country": "USA", "division": "Division II", "conference": "Sunshine State", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Miami's HBCU. Extremely diverse, international city. Caribbean and African connections.", "acceptance_rate": "72%", "notable_alumni": "Various SSC standouts", "ranking": None, "website": "https://fmulions.com", "image_url": img1, "coaches": [{"name": "Brandon Ponder", "title": "Head Coach", "email": "athletics@fmuniv.edu", "phone": "+1-305-626-3600"}]},
        {"name": "Flagler College", "location": "St. Augustine, FL", "state": "Florida", "region": "USA", "country": "USA", "division": "Division II", "conference": "Peach Belt", "foreign_friendly": True, "scholarship_type": "Partial Athletic", "scholarship_info": "DII scholarship in beautiful historic St. Augustine FL. Peach Belt Conference. Warm Florida climate.", "acceptance_rate": "48%", "notable_alumni": "Various PBC standouts", "ranking": None, "website": "https://athletics.flagler.edu", "image_url": img2, "coaches": [{"name": "Gregg Gibson", "title": "Head Coach", "email": "athletics@flagler.edu", "phone": "+1-904-829-6481"}]},
        {"name": "Coker University", "location": "Hartsville, SC", "state": "South Carolina", "region": "USA", "country": "USA", "division": "Division II", "conference": "South Atlantic", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. South Atlantic Conference. Growing programme in South Carolina.", "acceptance_rate": "64%", "notable_alumni": "Various SAC standouts", "ranking": None, "website": "https://coker.edu/athletics", "image_url": img1, "coaches": [{"name": "Travis Whitley", "title": "Head Coach", "email": "athletics@coker.edu", "phone": "+1-843-383-8015"}]},
        {"name": "Tusculum University", "location": "Greeneville, TN", "state": "Tennessee", "region": "USA", "country": "USA", "division": "Division II", "conference": "South Atlantic", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. SAC. Historic institution in east Tennessee. Strong basketball tradition.", "acceptance_rate": "60%", "notable_alumni": "Various SAC standouts", "ranking": None, "website": "https://goPioneers.com", "image_url": img2, "coaches": [{"name": "Travis Dillard", "title": "Head Coach", "email": "athletics@tusculum.edu", "phone": "+1-423-636-7300"}]},
        {"name": "Fairmont State University", "location": "Fairmont, WV", "state": "West Virginia", "region": "USA", "country": "USA", "division": "Division II", "conference": "Mountain East", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full DII scholarship. Mountain East Conference. West Virginia regional talent pipeline.", "acceptance_rate": "100%", "notable_alumni": "Various MEC standouts", "ranking": None, "website": "https://fairmontstatefighting.com", "image_url": img1, "coaches": [{"name": "DeAndre Aikens", "title": "Head Coach", "email": "athletics@fairmontstate.edu", "phone": "+1-304-367-4290"}]},
        {"name": "West Virginia Wesleyan College", "location": "Buckhannon, WV", "state": "West Virginia", "region": "USA", "country": "USA", "division": "Division II", "conference": "Mountain East", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "DII scholarship. Mountain East. Liberal arts tradition. Small-town WV community.", "acceptance_rate": "68%", "notable_alumni": "Various MEC standouts", "ranking": None, "website": "https://wvwcbobcats.com", "image_url": img2, "coaches": [{"name": "Josh Runner", "title": "Head Coach", "email": "athletics@wvwc.edu", "phone": "+1-304-473-8000"}]},

        # ── NAIA (v1.20 expansion) ────────────────────────────────────────────
        {"name": "Oklahoma Wesleyan University", "location": "Bartlesville, OK", "state": "Oklahoma", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Kansas Collegiate Athletic Conference (KCAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. KCAC powerhouse. Faith-based. Known for multiple NAIA tournament appearances.", "acceptance_rate": "32%", "notable_alumni": "Various KCAC standouts", "ranking": None, "website": "https://okwu.edu/athletics", "image_url": img1, "coaches": [{"name": "Donnie Bostwick", "title": "Head Coach", "email": "athletics@okwu.edu", "phone": "+1-918-335-6219"}]},
        {"name": "MidAmerica Nazarene University", "location": "Olathe, KS", "state": "Kansas", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Kansas Collegiate Athletic Conference (KCAC)", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. KCAC. Olathe KS — suburb of Kansas City, metro access. International student support programme.", "acceptance_rate": "54%", "notable_alumni": "Various KCAC standouts", "ranking": None, "website": "https://munats.com", "image_url": img2, "coaches": [{"name": "Jeff Sparks", "title": "Head Coach", "email": "athletics@mnu.edu", "phone": "+1-913-971-3710"}]},
        {"name": "Tabor College", "location": "Hillsboro, KS", "state": "Kansas", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Kansas Collegiate Athletic Conference (KCAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. KCAC conference. Mennonite heritage. Small Kansas community.", "acceptance_rate": "41%", "notable_alumni": "Various KCAC standouts", "ranking": None, "website": "https://tabor.edu/athletics", "image_url": img1, "coaches": [{"name": "Ryan Showles", "title": "Head Coach", "email": "athletics@tabor.edu", "phone": "+1-620-947-3121"}]},
        {"name": "Bethel University (Tennessee)", "location": "McKenzie, TN", "state": "Tennessee", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Tennessee Athletic Conference (TAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. TAC. West Tennessee campus. Known for strong basketball tradition in NAIA.", "acceptance_rate": "64%", "notable_alumni": "Various TAC standouts", "ranking": None, "website": "https://bethelwildcats.com", "image_url": img2, "coaches": [{"name": "Chris Severs", "title": "Head Coach", "email": "athletics@bethelu.edu", "phone": "+1-731-352-4000"}]},
        {"name": "Cumberland University", "location": "Lebanon, TN", "state": "Tennessee", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Mid-South Conference", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. Midsouth Conference. Near Nashville — music and culture hub.", "acceptance_rate": "57%", "notable_alumni": "Various Midsouth standouts", "ranking": None, "website": "https://cuphoenix.com", "image_url": img1, "coaches": [{"name": "Paul Burgess", "title": "Head Coach", "email": "athletics@cumberland.edu", "phone": "+1-615-547-1386"}]},
        {"name": "Campbellsville University", "location": "Campbellsville, KY", "state": "Kentucky", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Mid-South Conference", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Midsouth Conference. Kentucky basketball country. International student support programme.", "acceptance_rate": "72%", "notable_alumni": "Various Midsouth standouts", "ranking": None, "website": "https://campbellsville.edu/athletics", "image_url": img2, "coaches": [{"name": "Braden Sizemore", "title": "Head Coach", "email": "athletics@campbellsville.edu", "phone": "+1-270-789-5000"}]},
        {"name": "Freed-Hardeman University", "location": "Henderson, TN", "state": "Tennessee", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Mid-South Conference", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Midsouth. Church of Christ affiliated. West Tennessee campus.", "acceptance_rate": "60%", "notable_alumni": "Various Midsouth standouts", "ranking": None, "website": "https://fhulions.com", "image_url": img1, "coaches": [{"name": "Kyle Thompson", "title": "Head Coach", "email": "athletics@fhu.edu", "phone": "+1-731-989-6000"}]},
        {"name": "William Carey University", "location": "Hattiesburg, MS", "state": "Mississippi", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Southern States Athletic Conference (SSAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. SSAC. Southern Mississippi. Baptist affiliated with welcoming international programme.", "acceptance_rate": "48%", "notable_alumni": "Various SSAC standouts", "ranking": None, "website": "https://wcucrusaders.com", "image_url": img2, "coaches": [{"name": "Terry Beard", "title": "Head Coach", "email": "athletics@wmcarey.edu", "phone": "+1-601-318-6000"}]},
        {"name": "Indiana Tech", "location": "Fort Wayne, IN", "state": "Indiana", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Wolverine-Hoosier Athletic Conference (WHAC)", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. WHAC. Fort Wayne Indiana — international-friendly college town. Strong engineering/tech programmes alongside athletics.", "acceptance_rate": "62%", "notable_alumni": "Various WHAC standouts", "ranking": None, "website": "https://indianatech.edu/athletics", "image_url": img1, "coaches": [{"name": "Luke Fischer", "title": "Head Coach", "email": "athletics@indianatech.edu", "phone": "+1-260-422-5561"}]},
        {"name": "Cornerstone University", "location": "Grand Rapids, MI", "state": "Michigan", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Wolverine-Hoosier Athletic Conference (WHAC)", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. WHAC. Grand Rapids MI — Michigan's second city. Diverse community, international students well-supported.", "acceptance_rate": "65%", "notable_alumni": "Various WHAC standouts", "ranking": None, "website": "https://cornerstonegolden.com", "image_url": img2, "coaches": [{"name": "Kyle Rohm", "title": "Head Coach", "email": "athletics@cornerstone.edu", "phone": "+1-616-222-1500"}]},
        {"name": "Grace College", "location": "Winona Lake, IN", "state": "Indiana", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. Crossroads League — strong conference. Indiana basketball heartland.", "acceptance_rate": "67%", "notable_alumni": "Various Crossroads standouts", "ranking": None, "website": "https://gracelancers.com", "image_url": img1, "coaches": [{"name": "Chad Briscoe", "title": "Head Coach", "email": "athletics@grace.edu", "phone": "+1-574-372-5100"}]},
        {"name": "Huntington University", "location": "Huntington, IN", "state": "Indiana", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Crossroads League. Small Indiana college with strong athletics tradition.", "acceptance_rate": "73%", "notable_alumni": "Various Crossroads standouts", "ranking": None, "website": "https://hu.edu/athletics", "image_url": img2, "coaches": [{"name": "Bryan Burns", "title": "Head Coach", "email": "athletics@huntington.edu", "phone": "+1-260-356-6000"}]},
        {"name": "Georgetown College", "location": "Georgetown, KY", "state": "Kentucky", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Mid-South Conference", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Midsouth. Near Lexington KY — basketball-mad state. International student scholarship available.", "acceptance_rate": "68%", "notable_alumni": "Various Midsouth standouts", "ranking": None, "website": "https://georgetowntigers.com", "image_url": img1, "coaches": [{"name": "Todd Morgan", "title": "Head Coach", "email": "athletics@georgetowncollege.edu", "phone": "+1-502-863-8000"}]},
        {"name": "Union University", "location": "Jackson, TN", "state": "Tennessee", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Mid-South Conference", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. Midsouth. Christian liberal arts. West Tennessee location.", "acceptance_rate": "57%", "notable_alumni": "Various Midsouth standouts", "ranking": None, "website": "https://uubulldogs.com", "image_url": img2, "coaches": [{"name": "Ryun Williams", "title": "Head Coach", "email": "athletics@uu.edu", "phone": "+1-731-661-5100"}]},
        {"name": "Rio Grande University", "location": "Rio Grande, OH", "state": "Ohio", "region": "USA", "country": "USA", "division": "NAIA", "conference": "River States Conference (RSC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. River States Conference. Ohio rural campus. Affordable, small community.", "acceptance_rate": "100%", "notable_alumni": "Various RSC standouts", "ranking": None, "website": "https://rguredstorm.com", "image_url": img1, "coaches": [{"name": "Evan Lawson", "title": "Head Coach", "email": "athletics@rio.edu", "phone": "+1-740-245-7229"}]},
        {"name": "Shorter University", "location": "Rome, GA", "state": "Georgia", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Southern States Athletic Conference (SSAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. SSAC. Northwest Georgia near Atlanta. Growing programme with D1 aspirations.", "acceptance_rate": "54%", "notable_alumni": "Various SSAC standouts", "ranking": None, "website": "https://shorter.edu/athletics", "image_url": img2, "coaches": [{"name": "Brody Mitchell", "title": "Head Coach", "email": "athletics@shorter.edu", "phone": "+1-706-233-7200"}]},
        {"name": "Bryan College", "location": "Dayton, TN", "state": "Tennessee", "region": "USA", "country": "USA", "division": "NAIA", "conference": "Appalachian Athletic Conference (AAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full NAIA scholarship. Appalachian Athletic Conference. Small Christian college in Tennessee.", "acceptance_rate": "57%", "notable_alumni": "Various AAC standouts", "ranking": None, "website": "https://bryanlions.com", "image_url": img1, "coaches": [{"name": "Lance Witt", "title": "Head Coach", "email": "athletics@bryan.edu", "phone": "+1-423-775-2041"}]},

        # ── JUCO (v1.20 expansion) ────────────────────────────────────────────
        {"name": "Pratt Community College", "location": "Pratt, KS", "state": "Kansas", "region": "USA", "country": "USA", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full JUCO scholarship. Kansas JUCO conference. Strong pathway to D1/D2 in Kansas region.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfers", "ranking": None, "website": "https://prattcc.edu", "image_url": img2, "coaches": [{"name": "Austin Bauer", "title": "Head Coach", "email": "athletics@prattcc.edu", "phone": "+1-620-672-5641"}]},
        {"name": "Cloud County Community College", "location": "Concordia, KS", "state": "Kansas", "region": "USA", "country": "USA", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. KJCCC. Kansas JUCO powerhouse known for international player recruitment.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfers", "ranking": None, "website": "https://cloudcounty.edu", "image_url": img1, "coaches": [{"name": "Braden Reeser", "title": "Head Coach", "email": "athletics@cloudcounty.edu", "phone": "+1-785-243-1435"}]},
        {"name": "Cowley County Community College", "location": "Arkansas City, KS", "state": "Kansas", "region": "USA", "country": "USA", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. KJCCC. Cowley College has strong history of international player recruitment — European guards have featured prominently.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfers", "ranking": None, "website": "https://cowley.edu", "image_url": img2, "coaches": [{"name": "Chris Martin", "title": "Head Coach", "email": "athletics@cowley.edu", "phone": "+1-620-442-0430"}]},
        {"name": "Frank Phillips College", "location": "Borger, TX", "state": "Texas", "region": "USA", "country": "USA", "division": "JUCO", "conference": "WJCAC", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full JUCO scholarship. WJCAC. West Texas JUCO. Good pipeline to Texas D1/D2 schools.", "acceptance_rate": "100%", "notable_alumni": "Various WJCAC standouts", "ranking": None, "website": "https://fpctexans.com", "image_url": img1, "coaches": [{"name": "Kyle Bridges", "title": "Head Coach", "email": "athletics@fpctx.edu", "phone": "+1-806-274-5311"}]},
        {"name": "San Jacinto College", "location": "Pasadena, TX", "state": "Texas", "region": "USA", "country": "USA", "division": "JUCO", "conference": "NJCAA Region XIV", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Houston metro area — fourth-largest US city, highly international. Large campus with international student infrastructure.", "acceptance_rate": "100%", "notable_alumni": "Various Region XIV standouts", "ranking": None, "website": "https://sanjac.edu/athletics", "image_url": img2, "coaches": [{"name": "Michael Turner", "title": "Head Coach", "email": "athletics@sanjac.edu", "phone": "+1-281-998-6150"}]},
        {"name": "Lee College", "location": "Baytown, TX", "state": "Texas", "region": "USA", "country": "USA", "division": "JUCO", "conference": "NJCAA Region XIV", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full JUCO scholarship. Houston metro. Lee has a strong track record of placing players in D1/D2. International-friendly.", "acceptance_rate": "100%", "notable_alumni": "Various Region XIV standouts", "ranking": None, "website": "https://leecollege.edu/athletics", "image_url": img1, "coaches": [{"name": "Kendrick Jefferson", "title": "Head Coach", "email": "athletics@lee.edu", "phone": "+1-281-425-6390"}]},
        {"name": "Laney College", "location": "Oakland, CA", "state": "California", "region": "USA", "country": "USA", "division": "JUCO", "conference": "CCCAA Bay Valley", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Oakland CA — Bay Area, one of the most international regions in the US. Very diverse campus. Strong transfer to Cal schools.", "acceptance_rate": "100%", "notable_alumni": "Various CCCAA standouts", "ranking": None, "website": "https://laney.edu/athletics", "image_url": img2, "coaches": [{"name": "Byron Clay", "title": "Head Coach", "email": "athletics@laney.edu", "phone": "+1-510-834-5740"}]},
        {"name": "Fresno City College", "location": "Fresno, CA", "state": "California", "region": "USA", "country": "USA", "division": "JUCO", "conference": "CCCAA Big 8", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Central Valley CA — diverse agricultural heartland. Great pathway to Fresno State and other CSU/UC schools.", "acceptance_rate": "100%", "notable_alumni": "Various CCCAA standouts", "ranking": None, "website": "https://fresnocitycollege.edu/athletics", "image_url": img1, "coaches": [{"name": "Corky Higgins", "title": "Head Coach", "email": "athletics@fresnocitycollege.edu", "phone": "+1-559-442-8222"}]},
        {"name": "Southwestern Oregon Community College", "location": "Coos Bay, OR", "state": "Oregon", "region": "USA", "country": "USA", "division": "JUCO", "conference": "NWAC South", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Northwest Athletic Conference. Oregon coast setting. Pathway to Oregon DI/DII schools.", "acceptance_rate": "100%", "notable_alumni": "Various NWAC standouts", "ranking": None, "website": "https://socc.edu", "image_url": img2, "coaches": [{"name": "Caleb Connelly", "title": "Head Coach", "email": "athletics@socc.edu", "phone": "+1-541-888-2525"}]},
        {"name": "Mount Hood Community College", "location": "Gresham, OR", "state": "Oregon", "region": "USA", "country": "USA", "division": "JUCO", "conference": "NWAC East", "foreign_friendly": True, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Portland metro area — Oregon's largest city, highly international community. Strong transfer to Oregon D1/D2.", "acceptance_rate": "100%", "notable_alumni": "Various NWAC standouts", "ranking": None, "website": "https://mhcc.edu/athletics", "image_url": img1, "coaches": [{"name": "Jarrod Traeger", "title": "Head Coach", "email": "athletics@mhcc.edu", "phone": "+1-503-491-7000"}]},
        {"name": "Treasure Valley Community College", "location": "Ontario, OR", "state": "Oregon", "region": "USA", "country": "USA", "division": "JUCO", "conference": "NWAC East", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full JUCO scholarship. NWAC. Oregon-Idaho border region. Small tight-knit campus community.", "acceptance_rate": "100%", "notable_alumni": "Various NWAC standouts", "ranking": None, "website": "https://tvcc.cc", "image_url": img2, "coaches": [{"name": "Travis Myers", "title": "Head Coach", "email": "athletics@tvcc.cc", "phone": "+1-541-881-8822"}]},
        {"name": "Kankakee Community College", "location": "Kankakee, IL", "state": "Illinois", "region": "USA", "country": "USA", "division": "JUCO", "conference": "Illinois Collegiate Athletic Conference (ICCAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. ICCAC. South of Chicago — Illinois JUCO pipeline to D1/D2. Urban-area access.", "acceptance_rate": "100%", "notable_alumni": "Various ICCAC standouts", "ranking": None, "website": "https://kcc.edu", "image_url": img1, "coaches": [{"name": "Phil Geuther", "title": "Head Coach", "email": "athletics@kcc.edu", "phone": "+1-815-802-8100"}]},
        {"name": "Lincoln Trail College", "location": "Robinson, IL", "state": "Illinois", "region": "USA", "country": "USA", "division": "JUCO", "conference": "Illinois Collegiate Athletic Conference (ICCAC)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. ICCAC. Rural Illinois. Strong basketball culture, active transfer portal programme.", "acceptance_rate": "100%", "notable_alumni": "Various ICCAC standouts", "ranking": None, "website": "https://lincolntrail.edu", "image_url": img2, "coaches": [{"name": "Casey Gover", "title": "Head Coach", "email": "athletics@lincolntrail.edu", "phone": "+1-618-544-8657"}]},
        {"name": "Lake Michigan College", "location": "Benton Harbor, MI", "state": "Michigan", "region": "USA", "country": "USA", "division": "JUCO", "conference": "Michigan Community College Athletic Association (MCCAA)", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. MCCAA. Southwest Michigan. Pathway to Michigan D1/D2 schools.", "acceptance_rate": "100%", "notable_alumni": "Various MCCAA standouts", "ranking": None, "website": "https://lakemichigancollege.edu/athletics", "image_url": img1, "coaches": [{"name": "Josh Smaage", "title": "Head Coach", "email": "athletics@lakemichigancollege.edu", "phone": "+1-269-927-8100"}]},
        {"name": "Motlow State Community College", "location": "Lynchburg, TN", "state": "Tennessee", "region": "USA", "country": "USA", "division": "JUCO", "conference": "TCCAA / NJCAA", "foreign_friendly": False, "scholarship_type": "Full Athletic", "scholarship_info": "Full scholarship. Tennessee JUCO. Jack Daniel's hometown campus. Consistent NJCAA tournament contender.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfers", "ranking": None, "website": "https://mscc.edu", "image_url": img2, "coaches": [{"name": "Zach Woodington", "title": "Head Coach", "email": "athletics@mscc.edu", "phone": "+1-931-393-1500"}]},
    ]

    inserted = 0
    for c in extended:
        exists = await db.colleges.find_one({"name": c["name"]})
        if not exists:
            c["created_at"] = ts
            await db.colleges.insert_one(c)
            inserted += 1
    if inserted:
        logger.info(f"Seeded {inserted} extended colleges (D2/NAIA/JUCO)")


async def _seed_european_colleges_startup():
    """Seed European colleges on startup — skips any already in DB by name."""
    inserted = 0
    for college in EUROPEAN_COLLEGES:
        exists = await db.colleges.find_one({"name": college["name"]})
        if not exists:
            college_doc = {**college, "created_at": datetime.now(timezone.utc).isoformat()}
            await db.colleges.insert_one(college_doc)
            inserted += 1
    if inserted:
        logger.info(f"Seeded {inserted} European colleges")

# ─── European Colleges Seed ────────────────────────────────────────────────────
EUROPEAN_COLLEGES = [
    # ── SPAIN ──────────────────────────────────────────────────────────────
    {"name": "Universidad Europea de Madrid", "location": "Madrid", "country": "Spain", "region": "Europe",
     "division": "Liga EBA / LEB Gold", "conference": "FEB Nacional", "state": "ES",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "25% tuition reduction via Plan Compite for elite athletes. Fully bilingual campus.",
     "scholarship_type": "Partial Athletic", "language_of_study": "English / Spanish",
     "ranking": None, "website": "https://universidadeuropea.com",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Carlos Jiménez", "title": "Head Basketball Coach", "email": "cdu@universidadeuropea.es"},
         {"name": "Scholarship & Admissions Office", "title": "Plan Compite Scholarships", "email": "becasadmisiones@universidadeuropea.es"},
     ]},

    {"name": "CEU Cardenal Herrera University", "location": "Valencia", "country": "Spain", "region": "Europe",
     "division": "LEB Gold", "conference": "FEB Nacional", "state": "ES",
     "foreign_friendly": True, "acceptance_rate": "Grade average 7+",
     "scholarship_info": "CEU Merit 100 Scholarships for elite athletes. Requires strong academic and athletic record.",
     "scholarship_type": "Merit-Based", "language_of_study": "Spanish",
     "ranking": None, "website": "https://www.uchceu.es",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Sergio Pascual", "title": "Basketball Coordinator", "email": "sportsarea@uchceu.es"},
     ]},

    {"name": "UCAM Murcia (Universidad Católica de Murcia)", "location": "Murcia", "country": "Spain", "region": "Europe",
     "division": "ACB (Liga Endesa)", "conference": "ACB", "state": "ES",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Full athletic scholarship through UCAM Basketball Club (ACB). One of Europe's most international-friendly clubs.",
     "scholarship_type": "Full Academic + Athletic", "language_of_study": "Spanish / English",
     "ranking": None, "website": "https://www.ucam.edu",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Sito Alonso", "title": "Head Coach UCAM Basketball", "email": "baloncesto@ucam.edu"},
         {"name": "University Secretariat", "title": "Student Admissions", "email": "secretaria@ucam.edu"},
     ]},

    {"name": "Universidad de Zaragoza + Casademont", "location": "Zaragoza", "country": "Spain", "region": "Europe",
     "division": "ACB (Liga Endesa)", "conference": "ACB", "state": "ES",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Partnership with Casademont Zaragoza ACB club. Partial scholarship covering tuition for student-athletes.",
     "scholarship_type": "Partial Athletic", "language_of_study": "Spanish",
     "ranking": None, "website": "https://www.unizar.es",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Casademont Zaragoza Club", "title": "Club Administration (ACB)", "email": "info@basketzaragoza.net"},
         {"name": "University Sports Dept", "title": "Sport & Athlete Support", "email": "deporte@unizar.es"},
     ]},

    {"name": "Universidad de Sevilla (IUEFA)", "location": "Seville", "country": "Spain", "region": "Europe",
     "division": "División de Honor", "conference": "FEB Andalucía", "state": "ES",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Athletic grants through IUEFA sports institute. Merit + performance based for international students.",
     "scholarship_type": "Merit-Based", "language_of_study": "Spanish",
     "ranking": None, "website": "https://www.us.es",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Rafael Reyes", "title": "Basketball Director IUEFA", "email": "deportes@us.es"},
     ]},

    # ── FRANCE ─────────────────────────────────────────────────────────────
    {"name": "INSEP Paris", "location": "Paris", "country": "France", "region": "Europe",
     "division": "Betclic Élite / National Elite", "conference": "FFBB National", "state": "FR",
     "foreign_friendly": True, "acceptance_rate": "Highly competitive",
     "scholarship_info": "France's premier sports institution. Full athletic scholarships for elite international athletes. Government-funded.",
     "scholarship_type": "Full Academic + Athletic", "language_of_study": "French",
     "ranking": None, "website": "https://www.insep.fr",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Frédéric Fauthoux", "title": "National Programme Director", "email": "international@insep.fr"},
     ]},

    {"name": "Université Paris Nanterre + Nanterre 92", "location": "Nanterre", "country": "France", "region": "Europe",
     "division": "Betclic Élite", "conference": "Pro A", "state": "FR",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Partnership with Pro A club Nanterre 92. Up to €15,000 scholarships for athletes on high-level lists.",
     "scholarship_type": "Merit-Based", "language_of_study": "French / English",
     "ranking": None, "website": "https://www.parisnanterre.fr",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Laurent Legname", "title": "Elite Basketball Coordinator", "email": "sport-haut-niveau@parisnanterre.fr"},
     ]},

    {"name": "Université Claude Bernard Lyon 1 + ASVEL", "location": "Lyon", "country": "France", "region": "Europe",
     "division": "Betclic Élite / EuroLeague", "conference": "Pro A", "state": "FR",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Partnership with Tony Parker's ASVEL (EuroLeague). Scholarship opportunities for enrolled student-athletes.",
     "scholarship_type": "Partial Athletic", "language_of_study": "French",
     "ranking": None, "website": "https://www.univ-lyon1.fr",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "TJ Parker", "title": "Academy Director (ASVEL)", "email": "sport.etudes@univ-lyon1.fr"},
     ]},

    {"name": "Université de Strasbourg + SIG Strasbourg", "location": "Strasbourg", "country": "France", "region": "Europe",
     "division": "Pro B", "conference": "FFBB Pro B", "state": "FR",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Merit-based grants. SIG Strasbourg is one of France's most international-friendly clubs.",
     "scholarship_type": "Merit-Based", "language_of_study": "French / English",
     "ranking": None, "website": "https://www.unistra.fr",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "SIG Strasbourg Club", "title": "Club Contact", "email": "contact@sigstrasbourg.fr"},
         {"name": "University Sports Dept", "title": "Sport-Études Programme", "email": "basket@unistra.fr"},
     ]},

    {"name": "Université de Limoges + Limoges CSP", "location": "Limoges", "country": "France", "region": "Europe",
     "division": "Pro B", "conference": "FFBB Pro B", "state": "FR",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Limoges CSP has strong history of developing international talent. University + club dual registration.",
     "scholarship_type": "Partial Athletic", "language_of_study": "French",
     "ranking": None, "website": "https://www.unilim.fr",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Limoges CSP Club", "title": "Club Administration", "email": "info@limogescsp.com"},
         {"name": "University Sports Dept", "title": "Sport-Études University", "email": "sport@unilim.fr"},
     ]},

    # ── GERMANY ────────────────────────────────────────────────────────────
    {"name": "Universität Tübingen + Tigers Tübingen", "location": "Tübingen", "country": "Germany", "region": "Europe",
     "division": "ProA (2. Basketball Bundesliga)", "conference": "BBL ProA", "state": "DE",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Germany's model student-athlete programme. Full university integration with ProA basketball. English modules available.",
     "scholarship_type": "Partial Athletic", "language_of_study": "German / English",
     "ranking": None, "website": "https://uni-tuebingen.de",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Tigers Tübingen Club", "title": "Club Office (ProA)", "email": "basket@tigers-tuebingen.de"},
         {"name": "Eric Detlev", "title": "Sport Director & Youth Lead", "email": "eric.detlev@tigers-tuebingen.de"},
     ]},

    {"name": "Humboldt-Universität Berlin + ALBA Berlin", "location": "Berlin", "country": "Germany", "region": "Europe",
     "division": "BBL (Basketball Bundesliga)", "conference": "EuroLeague / BBL", "state": "DE",
     "foreign_friendly": True, "acceptance_rate": "NC (numerus clausus)",
     "scholarship_info": "ALBA Berlin elite development programme offers partial scholarships. Berlin is Europe's most international student city.",
     "scholarship_type": "Partial Athletic", "language_of_study": "German / English",
     "ranking": None, "website": "https://www.hu-berlin.de",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "ALBA Berlin Club", "title": "Club & Academy Contact", "email": "info@albaberlin.de"},
     ]},

    {"name": "Universität Ulm + Ratiopharm Ulm", "location": "Ulm", "country": "Germany", "region": "Europe",
     "division": "BBL (Basketball Bundesliga)", "conference": "BBL", "state": "DE",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Official student-athlete programme. Ratiopharm Ulm (BBL). Flexible study planning around basketball schedule.",
     "scholarship_type": "Merit-Based", "language_of_study": "German / English",
     "ranking": None, "website": "https://www.uni-ulm.de",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Ratiopharm Ulm Club", "title": "Club Administration (BBL)", "email": "info@bbu01.com"},
     ]},

    {"name": "Goethe-Universität Frankfurt + Skyliners", "location": "Frankfurt", "country": "Germany", "region": "Europe",
     "division": "ProA (2. Basketball Bundesliga)", "conference": "BBL ProA", "state": "DE",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Frankfurt Skyliners student-athlete integration. Highly international city with excellent English-speaking support.",
     "scholarship_type": "Merit-Based", "language_of_study": "German / English",
     "ranking": None, "website": "https://www.goethe-university-frankfurt.de",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Frankfurt Skyliners Club", "title": "Club Contact (ProA)", "email": "info@skyliners.de"},
         {"name": "Skyliners Youth Academy", "title": "Youth & Development", "email": "verein@skyliners.de"},
     ]},

    {"name": "Hamburg Towers + Universität Hamburg", "location": "Hamburg", "country": "Germany", "region": "Europe",
     "division": "BBL (Basketball Bundesliga)", "conference": "BBL", "state": "DE",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Official student-athlete programme. Hamburg is a major international city with large English-speaking community.",
     "scholarship_type": "Merit-Based", "language_of_study": "German / English",
     "ranking": None, "website": "https://www.uni-hamburg.de",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Hamburg Towers Club", "title": "Club Administration (BBL)", "email": "info@hamburgtowers.de"},
     ]},

    # ── NETHERLANDS ────────────────────────────────────────────────────────
    {"name": "Universiteit van Amsterdam + Heroes Den Bosch", "location": "Amsterdam", "country": "Netherlands", "region": "Europe",
     "division": "DBL (Dutch Basketball League)", "conference": "NBB", "state": "NL",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Netherlands is highly English-friendly. UvA student-athlete scheme with DBL champions Heroes Den Bosch.",
     "scholarship_type": "Partial Academic", "language_of_study": "English",
     "ranking": None, "website": "https://www.uva.nl",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Heroes Den Bosch Club", "title": "Club Contact (BNXT League)", "email": "info@heroesdenbosch.com"},
         {"name": "Basketball Academy Den Bosch", "title": "Development Academy", "email": "info@badb.nl"},
     ]},

    {"name": "Rijksuniversiteit Groningen + Donar Groningen", "location": "Groningen", "country": "Netherlands", "region": "Europe",
     "division": "DBL (Dutch Basketball League)", "conference": "NBB", "state": "NL",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Donar Groningen is one of the Netherlands' top clubs. University offers full English-medium bachelor/master degrees.",
     "scholarship_type": "Merit-Based", "language_of_study": "English",
     "ranking": None, "website": "https://www.rug.nl",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Donar Groningen Club", "title": "Club Contact (BNXT League)", "email": "info@donar.nl"},
     ]},

    {"name": "Universiteit Utrecht + ZZ Leiden", "location": "Utrecht", "country": "Netherlands", "region": "Europe",
     "division": "DBL (Dutch Basketball League)", "conference": "NBB", "state": "NL",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Partial academic scholarship combined with professional contract at ZZ Leiden (DBL). English taught programmes.",
     "scholarship_type": "Partial Athletic", "language_of_study": "English",
     "ranking": None, "website": "https://www.uu.nl",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "ZZ Leiden Club", "title": "Club Contact (BNXT League)", "email": "info@eredivisiebasketballleiden.nl"},
     ]},

    {"name": "Windesheim University + Landstede Hammers", "location": "Zwolle", "country": "Netherlands", "region": "Europe",
     "division": "DBL (Dutch Basketball League)", "conference": "NBB", "state": "NL",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Applied sciences university with dedicated student-athlete track. Landstede Hammers (DBL). Strong English support.",
     "scholarship_type": "Partial Athletic", "language_of_study": "English / Dutch",
     "ranking": None, "website": "https://www.windesheim.nl",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Landstede Hammers Club", "title": "Club Contact (DBL)", "email": "info@landstedehammers.nl"},
     ]},

    # ── ITALY ──────────────────────────────────────────────────────────────
    {"name": "Università di Bologna + Fortitudo", "location": "Bologna", "country": "Italy", "region": "Europe",
     "division": "Serie A2", "conference": "FIP Serie A2", "state": "IT",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Italy's oldest university. AlmaCampus athletic scholarships. Bologna has many English-taught programmes.",
     "scholarship_type": "Merit-Based", "language_of_study": "Italian / English",
     "ranking": None, "website": "https://www.unibo.it",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Fortitudo Bologna Club", "title": "Club Contact (Serie A2)", "email": "info@fortitudopallabologna.it"},
     ]},

    {"name": "Università degli Studi di Milano + Olimpia", "location": "Milan", "country": "Italy", "region": "Europe",
     "division": "Serie A / EuroLeague", "conference": "EuroLeague / LBA", "state": "IT",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Olimpia Milano (EuroLeague). University partnership scheme. Milan is Italy's most international city.",
     "scholarship_type": "Partial Athletic", "language_of_study": "Italian / English",
     "ranking": None, "website": "https://www.unimi.it",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Ettore Messina", "title": "Head Coach Olimpia", "email": "olimpia@olimpiamilano.com"},
     ]},

    {"name": "Università La Sapienza Roma + Virtus Roma", "location": "Rome", "country": "Italy", "region": "Europe",
     "division": "Serie A2", "conference": "FIP Serie A2", "state": "IT",
     "foreign_friendly": False, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Europe's largest university. Virtus Roma dual-registration for student-athletes. Italian language required.",
     "scholarship_type": "Merit-Based", "language_of_study": "Italian",
     "ranking": None, "website": "https://www.uniroma1.it",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Virtus Roma Club", "title": "Club Contact (Serie A2)", "email": "info@virtusroma1960.it"},
     ]},

    {"name": "Università di Trieste + Pallacanestro Trieste", "location": "Trieste", "country": "Italy", "region": "Europe",
     "division": "Serie A (LBA)", "conference": "LBA Serie A", "state": "IT",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Pallacanestro Trieste is one of Italy's most international programmes. Merit scholarships for student-athletes.",
     "scholarship_type": "Merit-Based", "language_of_study": "Italian / English",
     "ranking": None, "website": "https://www.units.it",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Pallacanestro Trieste Club", "title": "Club Contact (Serie A)", "email": "info@pallacanestrotrieste.it"},
     ]},

    # ── CZECH REPUBLIC ─────────────────────────────────────────────────────
    {"name": "Charles University Prague + ERA Nymburk", "location": "Prague", "country": "Czech Republic", "region": "Europe",
     "division": "Czech Basketball League (NBL)", "conference": "NBL Czech", "state": "CZ",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Czech basketball's most successful club ERA Nymburk in partnership with Prague universities. English-taught programmes available.",
     "scholarship_type": "Merit-Based", "language_of_study": "English / Czech",
     "ranking": None, "website": "https://www.cuni.cz",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "ERA Nymburk Team Office", "title": "Team Manager (NBL)", "email": "team@nymburk.basketball"},
         {"name": "ERA Nymburk Club Office", "title": "Club Administration", "email": "office@nymburk.basketball"},
     ]},

    {"name": "Brno University of Technology + Basketball Brno", "location": "Brno", "country": "Czech Republic", "region": "Europe",
     "division": "Czech Basketball League (NBL)", "conference": "NBL Czech", "state": "CZ",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "International student-athlete integration with Basketball Brno. Technical university with strong English support.",
     "scholarship_type": "Partial Athletic", "language_of_study": "English / Czech",
     "ranking": None, "website": "https://www.vutbr.cz",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "Basketball Brno Club", "title": "Club Contact (NBL Czech)", "email": "info@basketbrno.cz"},
     ]},

    # ── SCANDINAVIA ────────────────────────────────────────────────────────
    {"name": "Aalborg University + Bakken Bears", "location": "Aalborg", "country": "Denmark", "region": "Europe",
     "division": "Basketligaen (Danish)", "conference": "Basketligaen", "state": "DK",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Bakken Bears is Denmark's most successful club. AAU offers full English-medium degrees. No tuition fees for EU students.",
     "scholarship_type": "Merit-Based", "language_of_study": "English",
     "ranking": None, "website": "https://www.en.aau.dk",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Bakken Bears Club", "title": "Club Contact (Basketligaen)", "email": "info@bakkenbears.com"},
         {"name": "Nordjysk Elitesport (AAU)", "title": "University Elite Sport Support", "email": "rh@adm.aau.dk"},
     ]},

    {"name": "Copenhagen Business School + Phoenix", "location": "Copenhagen", "country": "Denmark", "region": "Europe",
     "division": "Basketligaen (Danish)", "conference": "Basketligaen", "state": "DK",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "CBS is highly international. Copenhagen Phoenix basketball club. Denmark has no tuition fees for EU citizens.",
     "scholarship_type": "Merit-Based", "language_of_study": "English",
     "ranking": None, "website": "https://www.cbs.dk",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "CBS Sport Basketball", "title": "Basketball Coach / Try-outs", "email": "basketball@cbssport.dk"},
         {"name": "CBS Sport Administration", "title": "Club Administration", "email": "administration@cbssport.dk"},
     ]},

    {"name": "Uppsala University + Uppsala Basket", "location": "Uppsala", "country": "Sweden", "region": "Europe",
     "division": "Basketligan (Swedish)", "conference": "SBBF Basketligan", "state": "SE",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Sweden's oldest university. Student-athlete programme with Uppsala Basket (Basketligan). All courses in English.",
     "scholarship_type": "Merit-Based", "language_of_study": "English",
     "ranking": None, "website": "https://www.uu.se",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Uppsala Basket Club", "title": "Club Office (Basketligan)", "email": "kansli@uppsalabasket.se"},
         {"name": "Uppsala University Sport", "title": "University Sports Dept", "email": "sport@uu.se"},
     ]},

    {"name": "University of Gothenburg + Chalmers Basket", "location": "Gothenburg", "country": "Sweden", "region": "Europe",
     "division": "Basketligan (Swedish)", "conference": "SBBF Basketligan", "state": "SE",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Dual-university system (GU + Chalmers). International student-athlete track. Full English programmes. Sweden's second city.",
     "scholarship_type": "Partial Academic", "language_of_study": "English",
     "ranking": None, "website": "https://www.gu.se",
     "image_url": "https://images.unsplash.com/photo-1560553814-060afcd8904a?w=400",
     "coaches": [
         {"name": "KFUM Göteborg Basket", "title": "Gothenburg Basketball Club", "email": "info@kfumgoteborg.se"},
         {"name": "University of Gothenburg Sport", "title": "University Sports Dept", "email": "sport@gu.se"},
     ]},

    {"name": "University of Oslo + Oslo BBK", "location": "Oslo", "country": "Norway", "region": "Europe",
     "division": "BLNO (Norwegian Basketball League)", "conference": "BLNO", "state": "NO",
     "foreign_friendly": True, "acceptance_rate": "Open enrolment",
     "scholarship_info": "Norway has NO tuition fees for international students. UiO student-athlete dual track with Oslo BBK.",
     "scholarship_type": "Full Academic + Athletic", "language_of_study": "English",
     "ranking": None, "website": "https://www.uio.no",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "University of Oslo Sport", "title": "Student-Athlete Support", "email": "sport@uio.no"},
         {"name": "Norges Basketballforbund", "title": "Norwegian Basketball Federation", "email": "basket@basket.no"},
     ]},

    {"name": "Aalto University + Torpan Pojat", "location": "Helsinki", "country": "Finland", "region": "Europe",
     "division": "Korisliiga (Finnish)", "conference": "Finnish Basketball", "state": "FI",
     "foreign_friendly": True, "acceptance_rate": "Competitive entry",
     "scholarship_info": "Aalto is Finland's top technical university with strong English instruction. Torpan Pojat is Helsinki's top club.",
     "scholarship_type": "Merit-Based", "language_of_study": "English",
     "ranking": None, "website": "https://www.aalto.fi",
     "image_url": "https://images.unsplash.com/photo-1583079806406-91731880e785?w=400",
     "coaches": [
         {"name": "Torpan Pojat Club", "title": "Club Contact (Korisliiga)", "email": "info@topo.fi"},
         {"name": "Aalto University Services", "title": "Student & Athlete Services", "email": "studentservices@aalto.fi"},
     ]},
]
